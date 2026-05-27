<?php
/**
 * cancel_order.php
 * Khách hàng tự hủy đơn khi chưa thanh toán và admin chưa xử lý (pending + chưa paid).
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['user_id'] ?? 0);
$orderId = (int)($input['order_id'] ?? 0);

if ($userId <= 0 || $orderId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Thiếu thông tin đơn hàng']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT id, status, payment_status, notes FROM orders WHERE id = ? AND user_id = ? FOR UPDATE");
    $stmt->execute([$orderId, $userId]);
    $order = $stmt->fetch();

    if (!$order) {
        throw new Exception('Không tìm thấy đơn hàng của bạn');
    }

    if ($order['status'] !== 'pending') {
        throw new Exception('Chỉ hủy được đơn đang chờ xử lý. Đơn đã được cửa hàng xác nhận hoặc xử lý.');
    }

    if (($order['payment_status'] ?? '') === 'paid') {
        throw new Exception('Đơn đã xác nhận thanh toán, không thể tự hủy. Vui lòng liên hệ cửa hàng.');
    }

    // Hoàn tồn kho
    $stmtItems = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
    $stmtItems->execute([$orderId]);
    $items = $stmtItems->fetchAll();

    $stmtStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
    foreach ($items as $item) {
        if ($item['product_id']) {
            $stmtStock->execute([$item['quantity'], $item['product_id']]);
        }
    }

    $noteSuffix = '[Khách hủy đơn ' . date('d/m/Y H:i') . ']';
    $newNotes = trim(($order['notes'] ?? '') . ' ' . $noteSuffix);

    $stmtUpdate = $pdo->prepare("UPDATE orders SET status = 'cancelled', notes = ? WHERE id = ?");
    $stmtUpdate->execute([$newNotes, $orderId]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Đã hủy đơn hàng thành công.'
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
