<?php
/**
 * admin_products.php
 * CRUD API cho quản lý sản phẩm.
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

function validateForeignId($pdo, $table, $id, $label) {
    if ($id === null) return null;
    $stmt = $pdo->prepare("SELECT id FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        throw new Exception($label . ' không tồn tại. Vui lòng chọn lại.');
    }
    return $id;
}

try {
    switch ($method) {
        case 'GET':
            $sql = "
                SELECT p.*, b.name as brand, c.name as category,
                       s.engine_type, s.displacement, s.max_power, s.weight, s.fuel_consumption
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_specs s ON p.id = s.product_id
                ORDER BY p.id DESC
            ";
            $rows = $pdo->query($sql)->fetchAll();
            $products = [];
            foreach ($rows as $r) {
                $products[] = [
                    'id' => (int)$r['id'],
                    'name' => $r['name'],
                    'slug' => $r['slug'],
                    'brand_id' => (int)$r['brand_id'],
                    'brand' => $r['brand'],
                    'category_id' => (int)$r['category_id'],
                    'category' => $r['category'],
                    'price' => (float)$r['price'],
                    'sale_price' => $r['sale_price'] ? (float)$r['sale_price'] : null,
                    'stock_quantity' => (int)$r['stock_quantity'],
                    'image' => $r['main_image'],
                    'description' => $r['description'],
                    'is_hot' => (bool)$r['is_hot'],
                    'is_new' => (bool)$r['is_new'],
                    'status' => $r['status'],
                    'specs' => [
                        'engine_type' => $r['engine_type'],
                        'displacement' => $r['displacement'],
                        'max_power' => $r['max_power'],
                        'weight' => $r['weight'],
                        'fuel_consumption' => $r['fuel_consumption']
                    ]
                ];
            }
            echo json_encode($products);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            // Chuyển brand_id/category_id = 0 hoặc rỗng thành null (tránh lỗi FK)
            $brandId = !empty($data['brand_id']) ? (int)$data['brand_id'] : null;
            $categoryId = !empty($data['category_id']) ? (int)$data['category_id'] : null;
            $brandId = validateForeignId($pdo, 'brands', $brandId, 'Hãng xe');
            $categoryId = validateForeignId($pdo, 'categories', $categoryId, 'Danh mục');
            $stmt = $pdo->prepare("
                INSERT INTO products (name, slug, brand_id, category_id, price, sale_price, stock_quantity, main_image, description, is_hot, is_new, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['name'], $data['slug'], $brandId, $categoryId,
                $data['price'], $data['sale_price'], $data['stock_quantity'] ?? 0,
                $data['image'], $data['description'] ?? '',
                $data['is_hot'] ? 1 : 0, $data['is_new'] ? 1 : 0, $data['status'] ?? 'active'
            ]);
            $productId = $pdo->lastInsertId();

            // Insert specs
            if (!empty($data['specs'])) {
                $specStmt = $pdo->prepare("
                    INSERT INTO product_specs (product_id, engine_type, displacement, max_power, weight, fuel_consumption)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $specs = $data['specs'];
                $specStmt->execute([$productId, $specs['engine_type'] ?? '', $specs['displacement'] ?? '', $specs['max_power'] ?? '', $specs['weight'] ?? '', $specs['fuel_consumption'] ?? '']);
            }

            echo json_encode(['success' => true, 'id' => (int)$productId]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $brandId = !empty($data['brand_id']) ? (int)$data['brand_id'] : null;
            $categoryId = !empty($data['category_id']) ? (int)$data['category_id'] : null;
            $brandId = validateForeignId($pdo, 'brands', $brandId, 'Hãng xe');
            $categoryId = validateForeignId($pdo, 'categories', $categoryId, 'Danh mục');
            $stmt = $pdo->prepare("
                UPDATE products SET name=?, slug=?, brand_id=?, category_id=?, price=?, sale_price=?, stock_quantity=?, main_image=?, description=?, is_hot=?, is_new=?, status=?
                WHERE id=?
            ");
            $stmt->execute([
                $data['name'], $data['slug'], $brandId, $categoryId,
                $data['price'], $data['sale_price'], $data['stock_quantity'] ?? 0,
                $data['image'], $data['description'] ?? '',
                $data['is_hot'] ? 1 : 0, $data['is_new'] ? 1 : 0, $data['status'] ?? 'active',
                $data['id']
            ]);

            // Update specs
            if (!empty($data['specs'])) {
                $specs = $data['specs'];
                $check = $pdo->prepare("SELECT id FROM product_specs WHERE product_id = ?");
                $check->execute([$data['id']]);
                if ($check->fetch()) {
                    $specStmt = $pdo->prepare("UPDATE product_specs SET engine_type=?, displacement=?, max_power=?, weight=?, fuel_consumption=? WHERE product_id=?");
                    $specStmt->execute([$specs['engine_type'] ?? '', $specs['displacement'] ?? '', $specs['max_power'] ?? '', $specs['weight'] ?? '', $specs['fuel_consumption'] ?? '', $data['id']]);
                } else {
                    $specStmt = $pdo->prepare("INSERT INTO product_specs (product_id, engine_type, displacement, max_power, weight, fuel_consumption) VALUES (?, ?, ?, ?, ?, ?)");
                    $specStmt->execute([$data['id'], $specs['engine_type'] ?? '', $specs['displacement'] ?? '', $specs['max_power'] ?? '', $specs['weight'] ?? '', $specs['fuel_consumption'] ?? '']);
                }
            }

            echo json_encode(['success' => true]);
            break;

        case 'DELETE':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
