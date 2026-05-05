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

    // 2.5. Xử lý mã giảm giá (nếu có)
    $couponCode = $input['coupon_code'] ?? null;
    $discountAmount = (int)($input['discount_amount'] ?? 0);

    if ($couponCode && $discountAmount > 0) {
        // Verify coupon vẫn hợp lệ
        $stmtCoupon = $pdo->prepare("SELECT * FROM coupons WHERE code = ? AND status = 'active'");
        $stmtCoupon->execute([$couponCode]);
        $coupon = $stmtCoupon->fetch();

        if ($coupon) {
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
