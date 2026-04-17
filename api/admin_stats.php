<?php
/**
 * admin_stats.php
 * Trả về thống kê tổng quan cho Dashboard.
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

try {
    $totalProducts = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    $totalOrders = $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
    $totalCustomers = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();
    $totalRevenue = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed'")->fetchColumn();
    $pendingOrders = $pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn();
    $completedOrders = $pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'completed'")->fetchColumn();
    $unreadContacts = $pdo->query("SELECT COUNT(*) FROM contacts WHERE status = 'unread'")->fetchColumn();
    $totalNews = $pdo->query("SELECT COUNT(*) FROM news")->fetchColumn();

    // Recent orders (5 newest)
    $recentOrders = $pdo->query("
        SELECT o.id, o.order_code, o.shipping_name as customer_name, o.total_amount, o.status, o.created_at as order_date
        FROM orders o
        ORDER BY o.created_at DESC
        LIMIT 5
    ")->fetchAll();

    // Recent unread contacts
    $recentContacts = $pdo->query("
        SELECT * FROM contacts WHERE status = 'unread' ORDER BY created_at DESC LIMIT 3
    ")->fetchAll();

    echo json_encode([
        'total_products' => (int)$totalProducts,
        'total_orders' => (int)$totalOrders,
        'total_customers' => (int)$totalCustomers,
        'total_revenue' => (float)$totalRevenue,
        'pending_orders' => (int)$pendingOrders,
        'completed_orders' => (int)$completedOrders,
        'unread_contacts' => (int)$unreadContacts,
        'total_news' => (int)$totalNews,
        'recent_orders' => $recentOrders,
        'recent_contacts' => $recentContacts
    ]);

} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
