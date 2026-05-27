<?php
/**
 * get_categories.php
 * Danh sách danh mục (public).
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

try {
    $rows = $pdo->query("SELECT id, name, slug, description FROM categories ORDER BY name ASC")->fetchAll();
    $categories = [];
    foreach ($rows as $row) {
        $categories[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'slug' => $row['slug'],
            'description' => $row['description'] ?? ''
        ];
    }
    echo json_encode($categories);
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
