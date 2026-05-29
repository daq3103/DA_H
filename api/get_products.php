<?php
/**
 * get_products.php
 * Trả về danh sách xe máy thành định dạng JSON.
 */

header('Content-Type: application/json');

// Cho phép CORS khi chạy local với live-server (nếu không bỏ vào XAMPP)
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, OPTIONS");

require 'db.php';

try {
    // Kết nối bảng Products với Brands và Categories + Lấy Spec
    $sql = "
        SELECT 
            p.id, 
            p.name, 
            p.slug, 
            p.price, 
            p.sale_price,
            p.stock_quantity,
            p.description,
            p.main_image as image, 
            p.is_hot, 
            p.is_new,
            p.created_at,
            p.updated_at,
            b.name as brand,
            b.slug as brand_slug,
            b.id as brand_id,
            c.name as category,
            c.slug as category_slug,
            c.id as category_id,
            s.engine_type,
            s.displacement,
            s.max_power,
            s.weight
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_specs s ON p.id = s.product_id
        WHERE p.status = 'active'
        ORDER BY p.updated_at DESC, p.id DESC
    ";
    
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();

    $products = [];
    foreach ($rows as $row) {
        // Cấu trúc lại giống hệt file mock JSON
        $products[] = [
            "id" => (int)$row['id'],
            "name" => $row['name'],
            "slug" => $row['slug'],
            "brand_id" => (int)$row['brand_id'],
            "brand" => $row['brand'],
            "brand_slug" => $row['brand_slug'],
            "category_id" => (int)$row['category_id'],
            "category" => $row['category'],
            "category_slug" => $row['category_slug'],
            "price" => (float)$row['price'],
            "sale_price" => $row['sale_price'] ? (float)$row['sale_price'] : null,
            "stock_quantity" => (int)$row['stock_quantity'],
            "description" => $row['description'] ?? '',
            "image" => $row['image'],
            "is_hot" => (bool)$row['is_hot'],
            "is_new" => (bool)$row['is_new'],
            "created_at" => $row['created_at'],
            "updated_at" => $row['updated_at'],
            "specs" => [
                "engine_type" => $row['engine_type'],
                "displacement" => $row['displacement'],
                "max_power" => $row['max_power'],
                "weight" => $row['weight']
            ]
        ];
    }

    echo json_encode($products);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'API lỗi: ' . $e->getMessage()
    ]);
}
?>
