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
    $pdo->beginTransaction();

    // 1. Tìm hoặc tạo user (khách hàng)
    $phone = $input['customer']['phone'];
    $name = $input['customer']['name'];
    $address = $input['customer']['address'];

    $stmtFind = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
    $stmtFind->execute([$phone]);
    $existingUser = $stmtFind->fetch();

    if ($existingUser) {
        $userId = $existingUser['id'];
    } else {
        $stmtUser = $pdo->prepare("INSERT INTO users (full_name, phone, address, role) VALUES (?, ?, ?, 'customer')");
        $stmtUser->execute([$name, $phone, $address]);
        $userId = $pdo->lastInsertId();
    }

    // 2. Tính tổng tiền
    $totalAmount = 0;
    foreach ($input['cart'] as $item) {
        $p = $item['product'];
        $price = $p['sale_price'] ? $p['sale_price'] : $p['price'];
        $totalAmount += $price * $item['quantity'];
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
        $input['customer']['note'] ?? ''
    ]);
    $orderId = $pdo->lastInsertId();

    // 5. Lưu chi tiết từng sản phẩm
    $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)");
    foreach ($input['cart'] as $item) {
        $p = $item['product'];
        $price = $p['sale_price'] ? $p['sale_price'] : $p['price'];
        $stmtItem->execute([$orderId, $p['id'], $item['quantity'], $price]);
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
