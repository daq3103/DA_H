<?php
/**
 * db_status.php — Kiểm tra nhanh kết nối DB và số lượng dữ liệu.
 * Mở: http://localhost/shop/api/db_status.php
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require 'db.php';

try {
    $productsTotal = (int)$pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
    $productsActive = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'active'")->fetchColumn();
    $categories = (int)$pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn();
    $brands = (int)$pdo->query('SELECT COUNT(*) FROM brands')->fetchColumn();

    echo json_encode([
        'ok' => true,
        'database' => 'shop_motorcycle',
        'products_total' => $productsTotal,
        'products_active' => $productsActive,
        'categories' => $categories,
        'brands' => $brands,
        'hint' => $productsActive === 0
            ? 'Không có sản phẩm active. Chạy http://localhost/shop/api/demo_seed.php để nạp dữ liệu mẫu.'
            : 'Database ổn. Nếu web vẫn trống, mở site qua http://localhost/shop/ (không dùng file://).'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage(),
        'hint' => 'Bật MySQL trong XAMPP Control Panel và tạo database shop_motorcycle (import database_schema.sql).'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
