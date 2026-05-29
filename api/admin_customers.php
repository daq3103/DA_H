<?php
/**
 * admin_customers.php
 * Danh sách khách hàng + chi tiết đơn theo tài khoản (?user_id=).
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';
require 'order_helpers.php';

try {
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

    if ($userId > 0) {
        $stmt = $pdo->prepare("
            SELECT id, full_name, phone, email, address, created_at
            FROM users
            WHERE id = ? AND role = 'customer'
        ");
        $stmt->execute([$userId]);
        $customer = $stmt->fetch();
        if (!$customer) {
            echo json_encode(['error' => true, 'message' => 'Không tìm thấy khách hàng']);
            exit;
        }

        $stmtOrders = $pdo->prepare("
            SELECT o.*,
                   o.shipping_name AS customer_name,
                   o.shipping_phone AS phone,
                   o.shipping_address AS address,
                   u.email AS user_email,
                   u.full_name AS account_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        ");
        $stmtOrders->execute([$userId]);
        $orders = $stmtOrders->fetchAll();
        foreach ($orders as &$order) {
            attachOrderItems($pdo, $order);
        }

        echo json_encode([
            'customer' => [
                'id' => (int)$customer['id'],
                'full_name' => $customer['full_name'],
                'phone' => $customer['phone'],
                'email' => $customer['email'] ?? '',
                'address' => $customer['address'] ?? '',
                'created_at' => $customer['created_at']
            ],
            'orders' => $orders
        ]);
        exit;
    }

    $rows = $pdo->query("
        SELECT u.id, u.full_name, u.phone, u.email, u.address, u.created_at,
               COUNT(o.id) AS order_count
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.role = 'customer'
        GROUP BY u.id
        ORDER BY u.created_at DESC
    ")->fetchAll();

    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int)$row['id'],
            'full_name' => $row['full_name'],
            'phone' => $row['phone'],
            'email' => $row['email'] ?? '',
            'address' => $row['address'] ?? '',
            'created_at' => $row['created_at'],
            'order_count' => (int)$row['order_count']
        ];
    }
    echo json_encode($out);
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
