<?php
/**
 * admin_brands.php
 * API lấy danh sách hãng xe cho trang admin.
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

try {
    $rows = $pdo->query("
        SELECT b.id, b.name, b.slug, COUNT(p.id) AS product_count
        FROM brands b
        LEFT JOIN products p ON p.brand_id = b.id
        GROUP BY b.id
        ORDER BY b.name ASC
    ")->fetchAll();

    $brands = [];
    foreach ($rows as $row) {
        $brands[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'slug' => $row['slug'],
            'product_count' => (int)$row['product_count']
        ];
    }

    echo json_encode($brands);
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
