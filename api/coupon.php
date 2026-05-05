<?php
/**
 * coupon.php
 * API validate mã giảm giá cho frontend (khách hàng).
 * POST: { code, order_total }
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$code = strtoupper(trim($input['code'] ?? ''));
$orderTotal = (float)($input['order_total'] ?? 0);

if (empty($code)) {
    echo json_encode(['success' => false, 'message' => 'Vui lòng nhập mã giảm giá']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM coupons WHERE code = ? AND status = 'active'");
    $stmt->execute([$code]);
    $coupon = $stmt->fetch();

    if (!$coupon) {
        echo json_encode(['success' => false, 'message' => 'Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa']);
        exit;
    }

    // Kiểm tra thời hạn
    if ($coupon['starts_at'] && strtotime($coupon['starts_at']) > time()) {
        echo json_encode(['success' => false, 'message' => 'Mã giảm giá chưa bắt đầu hiệu lực']);
        exit;
    }
    if ($coupon['expires_at'] && strtotime($coupon['expires_at']) < time()) {
        echo json_encode(['success' => false, 'message' => 'Mã giảm giá đã hết hạn']);
        exit;
    }

    // Kiểm tra số lần sử dụng
    if ($coupon['max_uses'] !== null && $coupon['used_count'] >= $coupon['max_uses']) {
        echo json_encode(['success' => false, 'message' => 'Mã giảm giá đã hết lượt sử dụng']);
        exit;
    }

    // Kiểm tra đơn tối thiểu
    if ($orderTotal < $coupon['min_order_amount']) {
        $minStr = number_format($coupon['min_order_amount'], 0, ',', '.');
        echo json_encode(['success' => false, 'message' => "Đơn hàng tối thiểu {$minStr}₫ để áp dụng mã này"]);
        exit;
    }

    // Tính số tiền giảm
    $discountAmount = 0;
    if ($coupon['discount_type'] === 'percent') {
        $discountAmount = $orderTotal * ($coupon['discount_value'] / 100);
        if ($coupon['max_discount'] && $discountAmount > $coupon['max_discount']) {
            $discountAmount = $coupon['max_discount'];
        }
    } else {
        $discountAmount = $coupon['discount_value'];
    }

    // Không giảm quá tổng đơn
    if ($discountAmount > $orderTotal) {
        $discountAmount = $orderTotal;
    }

    echo json_encode([
        'success' => true,
        'coupon' => [
            'id' => (int)$coupon['id'],
            'code' => $coupon['code'],
            'description' => $coupon['description'],
            'discount_type' => $coupon['discount_type'],
            'discount_value' => (int)$coupon['discount_value'],
            'discount_amount' => (int)$discountAmount
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
}
?>
