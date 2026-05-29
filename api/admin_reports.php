<?php
/**
 * admin_reports.php
 * Báo cáo thống kê theo khoảng thời gian: today | week | month | year | all
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db.php';

$period = $_GET['period'] ?? 'today';
$allowed = ['today', 'week', 'month', 'year', 'all'];
if (!in_array($period, $allowed, true)) {
    $period = 'today';
}

/** Điều kiện SQL theo khoảng thời gian (cột created_at) */
function reportDateWhere($period) {
    switch ($period) {
        case 'today':
            return "DATE(created_at) = CURDATE()";
        case 'week':
            return "created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                    AND created_at < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)";
        case 'month':
            return "YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())";
        case 'year':
            return "YEAR(created_at) = YEAR(CURDATE())";
        default:
            return "1=1";
    }
}

$labels = [
    'today' => 'Hôm nay',
    'week' => 'Tuần này',
    'month' => 'Tháng này',
    'year' => 'Năm nay',
    'all' => 'Tất cả'
];

try {
    $where = reportDateWhere($period);

    $ordersTotal = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE $where")->fetchColumn();

    $ordersCompleted = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'completed' AND $where")->fetchColumn();
    $ordersPending = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'pending' AND $where")->fetchColumn();
    $ordersCancelled = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND $where")->fetchColumn();
    $ordersContacted = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'contacted' AND $where")->fetchColumn();

    $revenue = (float)$pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed' AND $where")->fetchColumn();

    $userWhere = str_replace('created_at', 'created_at', reportDateWhere($period));
    $newCustomers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer' AND $userWhere")->fetchColumn();

    $orderWhere = str_replace('created_at', 'o.created_at', reportDateWhere($period));

    // Thống kê đơn theo số điện thoại (trong kỳ)
    $phoneRows = $pdo->query("
        SELECT shipping_phone, shipping_name,
               COUNT(*) AS order_count,
               SUM(total_amount) AS total_amount,
               SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) AS completed_amount,
               SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
        FROM orders o
        WHERE $orderWhere
        GROUP BY shipping_phone, shipping_name
        ORDER BY order_count DESC, total_amount DESC
    ")->fetchAll(PDO::FETCH_ASSOC);

    $salesByPhone = [];
    foreach ($phoneRows as $row) {
        $salesByPhone[] = [
            'phone' => $row['shipping_phone'],
            'name' => $row['shipping_name'],
            'order_count' => (int)$row['order_count'],
            'total_amount' => (float)$row['total_amount'],
            'completed_amount' => (float)$row['completed_amount'],
            'cancelled_count' => (int)$row['cancelled_count']
        ];
    }

    // Mã SP bán được trong kỳ (không tính đơn đã hủy)
    $productRows = $pdo->query("
        SELECT COALESCE(oi.product_id, 0) AS product_id,
               COALESCE(p.name, CONCAT('SP #', oi.product_id)) AS product_name,
               p.slug AS product_slug,
               b.name AS brand,
               SUM(oi.quantity) AS qty_sold,
               SUM(oi.quantity * oi.unit_price) AS revenue,
               COUNT(DISTINCT oi.order_id) AS order_count
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE $orderWhere AND o.status != 'cancelled'
        GROUP BY oi.product_id, p.name, p.slug, b.name
        ORDER BY qty_sold DESC, revenue DESC
    ")->fetchAll(PDO::FETCH_ASSOC);

    $salesByProduct = [];
    $totalUnitsSold = 0;
    foreach ($productRows as $row) {
        $qty = (int)$row['qty_sold'];
        $totalUnitsSold += $qty;
        $salesByProduct[] = [
            'product_id' => (int)$row['product_id'],
            'name' => $row['product_name'],
            'slug' => $row['product_slug'],
            'brand' => $row['brand'],
            'qty_sold' => $qty,
            'revenue' => (float)$row['revenue'],
            'order_count' => (int)$row['order_count']
        ];
    }

    // Thống kê tồn kho theo từng sản phẩm (mã SP)
    $stockRows = $pdo->query("
        SELECT p.id, p.slug, p.name, p.stock_quantity, p.status,
               b.name AS brand, c.name AS category
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.stock_quantity ASC, p.id ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    $stockInventory = [];
    $totalUnits = 0;
    $outOfStock = 0;
    $lowStock = 0;

    foreach ($stockRows as $row) {
        $qty = (int)$row['stock_quantity'];
        $totalUnits += $qty;
        if ($qty <= 0) {
            $outOfStock++;
            $stockLevel = 'out';
        } elseif ($qty <= 5) {
            $lowStock++;
            $stockLevel = 'low';
        } else {
            $stockLevel = 'ok';
        }

        $stockInventory[] = [
            'id' => (int)$row['id'],
            'slug' => $row['slug'],
            'name' => $row['name'],
            'brand' => $row['brand'],
            'category' => $row['category'],
            'stock_quantity' => $qty,
            'status' => $row['status'],
            'stock_level' => $stockLevel
        ];
    }

    echo json_encode([
        'success' => true,
        'period' => $period,
        'period_label' => $labels[$period],
        'orders_total' => $ordersTotal,
        'orders_completed' => $ordersCompleted,
        'orders_pending' => $ordersPending,
        'orders_contacted' => $ordersContacted,
        'orders_cancelled' => $ordersCancelled,
        'revenue' => $revenue,
        'new_customers' => $newCustomers,
        'total_units_sold' => $totalUnitsSold,
        'sales_by_phone' => $salesByPhone,
        'sales_by_product' => $salesByProduct,
        'stock_summary' => [
            'total_products' => count($stockInventory),
            'total_units' => $totalUnits,
            'out_of_stock' => $outOfStock,
            'low_stock' => $lowStock
        ],
        'stock_inventory' => $stockInventory
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
