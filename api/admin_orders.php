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

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $orders = $pdo->query("
                SELECT o.*, o.shipping_name as customer_name, o.shipping_phone as phone, o.shipping_address as address
                FROM orders o
                ORDER BY o.created_at DESC
            ")->fetchAll();

            // Attach items for each order
            foreach ($orders as &$order) {
                $stmt = $pdo->prepare("
                    SELECT oi.*, p.name as product_name
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                ");
                $stmt->execute([$order['id']]);
                $order['items'] = $stmt->fetchAll();
                $order['total_amount'] = (float)$order['total_amount'];
                $order['order_date'] = $order['created_at'];
            }

            echo json_encode($orders);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $newStatus = $data['status'];
            $orderId = $data['id'];

            // Lấy trạng thái hiện tại của đơn hàng
            $stmtOldStatus = $pdo->prepare("SELECT status FROM orders WHERE id = ?");
            $stmtOldStatus->execute([$orderId]);
            $oldOrder = $stmtOldStatus->fetch();

            if ($oldOrder) {
                $oldStatus = $oldOrder['status'];

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
            }

            $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
            $stmt->execute([$newStatus, $orderId]);
            echo json_encode(['success' => true]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
