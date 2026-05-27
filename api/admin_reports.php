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

    // Biểu đồ 7 ngày gần nhất (luôn hiển thị)
    $chartRows = $pdo->query("
        SELECT DATE(created_at) AS day,
               COUNT(*) AS orders_count,
               COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) AS revenue
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(created_at)
        ORDER BY day ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    $chartMap = [];
    foreach ($chartRows as $row) {
        $chartMap[$row['day']] = $row;
    }

    $chart = [];
    for ($i = 6; $i >= 0; $i--) {
        $day = date('Y-m-d', strtotime("-$i days"));
        $chart[] = [
            'date' => $day,
            'label' => date('d/m', strtotime($day)),
            'orders_count' => isset($chartMap[$day]) ? (int)$chartMap[$day]['orders_count'] : 0,
            'revenue' => isset($chartMap[$day]) ? (float)$chartMap[$day]['revenue'] : 0
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
        'chart_7days' => $chart,
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
