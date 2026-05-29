<?php
/**
 * get_brands.php
 * Danh sách hãng xe (public).
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

try {
    $rows = $pdo->query("SELECT id, name, slug, description FROM brands ORDER BY name ASC")->fetchAll();
    $brands = [];
    foreach ($rows as $row) {
        $brands[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'slug' => $row['slug'],
            'description' => $row['description'] ?? ''
        ];
    }
    echo json_encode($brands);
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
