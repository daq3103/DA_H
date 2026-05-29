<?php
/**
 * admin_orders.php
 * API quản lý đơn hàng — phù hợp schema mới (users, order_code, shipping_*).
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';
require 'order_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $userIdFilter = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
            $sql = "
                SELECT o.*,
                       o.shipping_name AS customer_name,
                       o.shipping_phone AS phone,
                       o.shipping_address AS address,
                       u.email AS user_email,
                       u.full_name AS account_name
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
            ";
            if ($userIdFilter > 0) {
                $sql .= " WHERE o.user_id = ? ORDER BY o.created_at DESC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$userIdFilter]);
                $orders = $stmt->fetchAll();
            } else {
                $sql .= " ORDER BY o.created_at DESC";
                $orders = $pdo->query($sql)->fetchAll();
            }

            foreach ($orders as &$order) {
                attachOrderItems($pdo, $order);
            }

            echo json_encode($orders);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $orderId = (int)($data['id'] ?? 0);
            if ($orderId <= 0) {
                throw new Exception('Thiếu id đơn hàng');
            }

            $stmtOrder = $pdo->prepare("SELECT status, payment_method, payment_status FROM orders WHERE id = ?");
            $stmtOrder->execute([$orderId]);
            $order = $stmtOrder->fetch();
            if (!$order) {
                throw new Exception('Không tìm thấy đơn hàng');
            }

            $oldStatus = $order['status'];
            $newStatus = $data['status'] ?? $oldStatus;

            if (isset($data['status'])) {
                // Nếu chuyển từ trạng thái KHÁC sang CANCELLED -> Hoàn kho
                if ($oldStatus !== 'cancelled' && $newStatus === 'cancelled') {
                    $stmtItems = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
                    $stmtItems->execute([$orderId]);
                    $items = $stmtItems->fetchAll();

                    $stmtUpdateStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
                    foreach ($items as $item) {
                        if ($item['product_id']) {
                            $stmtUpdateStock->execute([$item['quantity'], $item['product_id']]);
                        }
                    }
                }
                
                // Nếu chuyển từ CANCELLED sang trạng thái KHÁC (khôi phục đơn) -> Trừ lại kho
                if ($oldStatus === 'cancelled' && $newStatus !== 'cancelled') {
                    $stmtItems = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
                    $stmtItems->execute([$orderId]);
                    $items = $stmtItems->fetchAll();

                    $stmtUpdateStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
                    foreach ($items as $item) {
                        if ($item['product_id']) {
                            $stmtUpdateStock->execute([$item['quantity'], $item['product_id']]);
                        }
                    }
                }

                $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
                $stmt->execute([$newStatus, $orderId]);

                // COD hoàn thành -> tự đánh dấu đã thu tiền
                if ($newStatus === 'completed' && $order['payment_method'] === 'cod' && $order['payment_status'] !== 'paid') {
                    $pdo->prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?")->execute([$orderId]);
                    $order['payment_status'] = 'paid';
                }
            }

            if (isset($data['payment_status']) && in_array($data['payment_status'], ['paid', 'unpaid'], true)) {
                $method = $order['payment_method'] ?? 'cod';
                if ($data['payment_status'] === 'paid') {
                    $pdo->prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?")->execute([$orderId]);
                } elseif ($method === 'cod' && $data['payment_status'] === 'unpaid') {
                    $pdo->prepare("UPDATE orders SET payment_status = 'unpaid' WHERE id = ?")->execute([$orderId]);
                }
            }

            echo json_encode(['success' => true]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
