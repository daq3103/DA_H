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

    // Validate số điện thoại (chỉ chứa chữ số và độ dài 10-11)
    if (!preg_match('/^[0-9]{10,11}$/', $phone)) {
        echo json_encode(['success' => false, 'message' => 'Số điện thoại không hợp lệ']);
        exit;
    }

    $pdo->beginTransaction();

    // 1. Nhận diện User đặt hàng (Nếu đang đăng nhập thì có user_id, nếu không thì là Guest)
    $userId = (int)($input['customer']['user_id'] ?? 0);
    if ($userId <= 0) {
        $userId = null; // Guest checkout
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

    // 2.5. Xử lý mã giảm giá (nếu có)
    $couponCode = $input['coupon_code'] ?? null;
    $discountAmount = (int)($input['discount_amount'] ?? 0);

    if ($couponCode) {
        // Verify coupon vẫn hợp lệ
        $stmtCoupon = $pdo->prepare("SELECT * FROM coupons WHERE code = ? AND status = 'active'");
        $stmtCoupon->execute([$couponCode]);
        $coupon = $stmtCoupon->fetch();

        if ($coupon) {
            // Kiểm tra thời hạn
            if ($coupon['starts_at'] && strtotime($coupon['starts_at']) > time()) {
                throw new Exception('Mã giảm giá chưa bắt đầu hiệu lực');
            }
            if ($coupon['expires_at'] && strtotime($coupon['expires_at']) < time()) {
                throw new Exception('Mã giảm giá đã hết hạn');
            }

            // Kiểm tra số lần sử dụng
            if ($coupon['max_uses'] !== null && $coupon['used_count'] >= $coupon['max_uses']) {
                throw new Exception('Mã giảm giá đã hết lượt sử dụng');
            }

            // Kiểm tra đơn tối thiểu
            if ($totalAmount < $coupon['min_order_amount']) {
                throw new Exception('Đơn hàng không đủ điều kiện tối thiểu để áp dụng mã giảm giá này');
            }

            // Tính lại discount server-side để đảm bảo chính xác
            $serverDiscount = 0;
            if ($coupon['discount_type'] === 'percent') {
                $serverDiscount = $totalAmount * ($coupon['discount_value'] / 100);
                if ($coupon['max_discount'] && $serverDiscount > $coupon['max_discount']) {
                    $serverDiscount = $coupon['max_discount'];
                }
            } else {
                $serverDiscount = $coupon['discount_value'];
            }
            if ($serverDiscount > $totalAmount) $serverDiscount = $totalAmount;
            $discountAmount = $serverDiscount;
            $totalAmount -= $discountAmount;

            // Tăng used_count
            $pdo->prepare("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?")->execute([$coupon['id']]);
        } else {
            $discountAmount = 0;
        }
    }

    // 3. Tạo mã đơn hàng (VD: HD2603-A1B2)
    $orderCode = 'HD' . date('dm') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

    // 4. Lưu đơn hàng với snapshot thông tin giao hàng
    $stmtOrder = $pdo->prepare("
        INSERT INTO orders (order_code, user_id, shipping_name, shipping_phone, shipping_address, total_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmtOrder->execute([
        $orderCode,
        $userId,
        $name,
        $phone,
        $address,
        $totalAmount,
        ($couponCode ? "[Mã giảm giá: $couponCode - Giảm " . number_format($discountAmount,0,',','.') . "₫] " : '') . ($input['customer']['note'] ?? '')
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
