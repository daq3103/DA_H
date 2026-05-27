<?php
/**
 * place_order.php
 * Endpoint nhận dữ liệu giỏ hàng và tạo đơn hàng — schema mới (users, order_code, shipping_*).
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ']);
    exit;
}

try {
    $phone = trim($input['customer']['phone'] ?? '');
    $name = trim($input['customer']['name'] ?? '');
    $address = trim($input['customer']['address'] ?? '');

    $userId = (int)($input['customer']['user_id'] ?? 0);
    if ($userId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập để đặt hàng']);
        exit;
    }

    // Validate số điện thoại (chỉ chứa chữ số và độ dài 10-11)
    if (!preg_match('/^[0-9]{10,11}$/', $phone)) {
        echo json_encode(['success' => false, 'message' => 'Số điện thoại không hợp lệ']);
        exit;
    }

    $pdo->beginTransaction();

    $stmtUser = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
    $stmtUser->execute([$userId]);
    if (!$stmtUser->fetch()) {
        throw new Exception('Tài khoản không hợp lệ hoặc đã bị khóa. Vui lòng đăng nhập lại.');
    }

    // 2. Kiểm tra tồn kho và tính tổng tiền từ Database
    $totalAmount = 0;
    $dbProducts = [];

    foreach ($input['cart'] as $item) {
        $pId = (int)$item['product']['id'];
        $qty = (int)$item['quantity'];

        // Dùng FOR UPDATE để khóa dòng khi đang giao dịch, tránh mua trùng
        $stmtProd = $pdo->prepare("SELECT id, name, price, sale_price, stock_quantity FROM products WHERE id = ? FOR UPDATE");
        $stmtProd->execute([$pId]);
        $realProduct = $stmtProd->fetch();

        if (!$realProduct) {
            throw new Exception('Sản phẩm không tồn tại (ID: ' . $pId . ')');
        }

        if ($realProduct['stock_quantity'] < $qty) {
            throw new Exception('Sản phẩm "' . $realProduct['name'] . '" chỉ còn ' . $realProduct['stock_quantity'] . ' chiếc trong kho.');
        }

        $realPrice = $realProduct['sale_price'] ? $realProduct['sale_price'] : $realProduct['price'];
        $totalAmount += $realPrice * $qty;

        // Lưu lại để thêm vào order_items và trừ kho
        $dbProducts[] = [
            'id' => $pId,
            'qty' => $qty,
            'price' => $realPrice
        ];
    }

    // 3. Tạo mã đơn hàng (VD: HD2603-A1B2)
    $orderCode = 'HD' . date('dm') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

    $paymentMethod = $input['payment_method'] ?? '';
    if (!in_array($paymentMethod, ['cod', 'qr_transfer'], true)) {
        // Tương thích request cũ
        $paymentMethod = !empty($input['payment_confirmed']) ? 'qr_transfer' : 'cod';
    }

    $orderNotes = trim($input['customer']['note'] ?? '');

    if ($paymentMethod === 'qr_transfer') {
        if (empty($input['payment_confirmed'])) {
            throw new Exception('Vui lòng xác nhận đã chuyển khoản trước khi hoàn tất đơn.');
        }
        $paymentStatus = 'paid';
        $orderNotes = trim('[Thanh toán QR] ' . $orderNotes);
    } else {
        $paymentStatus = 'unpaid';
        $orderNotes = trim('[Thanh toán khi nhận hàng] ' . $orderNotes);
    }

    // 4. Lưu đơn hàng với snapshot thông tin giao hàng
    $stmtOrder = $pdo->prepare("
        INSERT INTO orders (order_code, user_id, shipping_name, shipping_phone, shipping_address, total_amount, payment_method, payment_status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmtOrder->execute([
        $orderCode,
        $userId,
        $name,
        $phone,
        $address,
        $totalAmount,
        $paymentMethod,
        $paymentStatus,
        $orderNotes
    ]);
    $orderId = $pdo->lastInsertId();

    // 5. Lưu chi tiết từng sản phẩm và Trừ tồn kho
    $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)");
    $stmtUpdateStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");

    foreach ($dbProducts as $item) {
        // Lưu order_items
        $stmtItem->execute([$orderId, $item['id'], $item['qty'], $item['price']]);

        // Trừ số lượng tồn kho
        $stmtUpdateStock->execute([$item['qty'], $item['id']]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Đặt hàng thành công!',
        'order_id' => $orderId,
        'order_code' => $orderCode
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Lỗi xử lý đơn hàng: ' . $e->getMessage()]);
}
?>
