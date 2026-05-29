<?php
/**
 * Hàm dùng chung cho API đơn hàng admin.
 */

function attachOrderItems(PDO $pdo, array &$order): void
{
    $stmt = $pdo->prepare("
        SELECT oi.product_id, oi.quantity, oi.unit_price,
               COALESCE(p.id, oi.product_id) AS product_id,
               p.name AS product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    ");
    $stmt->execute([$order['id']]);
    $items = [];
    foreach ($stmt->fetchAll() as $row) {
        $items[] = [
            'product_id' => (int)$row['product_id'],
            'product_name' => $row['product_name'] ?: ('Sản phẩm #' . $row['product_id']),
            'quantity' => (int)$row['quantity'],
            'unit_price' => (float)$row['unit_price']
        ];
    }
    $order['items'] = $items;
    $order['total_amount'] = (float)$order['total_amount'];
    $order['order_date'] = $order['created_at'];
    $order['user_id'] = isset($order['user_id']) ? (int)$order['user_id'] : null;
}
