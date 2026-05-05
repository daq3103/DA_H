<?php
/**
 * my_orders.php
 * API lấy danh sách đơn hàng của user (khách hàng).
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['user_id'] ?? 0);

if ($userId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Thiếu user_id']);
    exit;
}

try {
    // Lấy danh sách đơn hàng
    $stmtOrders = $pdo->prepare("
        SELECT id, order_code, shipping_name, shipping_phone, shipping_address, 
               total_amount, status, payment_method, payment_status, notes, created_at
        FROM orders 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ");
    $stmtOrders->execute([$userId]);
    $orders = $stmtOrders->fetchAll();

    // Lấy chi tiết sản phẩm cho mỗi đơn
    $stmtItems = $pdo->prepare("
        SELECT oi.quantity, oi.unit_price, p.id as product_id, p.name, p.main_image
        FROM order_items oi 
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    ");

    foreach ($orders as &$order) {
        $stmtItems->execute([$order['id']]);
        $order['items'] = $stmtItems->fetchAll();
        $order['total_amount'] = (int)$order['total_amount'];
    }

    echo json_encode(['success' => true, 'orders' => $orders]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
}
?>
