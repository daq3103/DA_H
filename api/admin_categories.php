<?php
/**
 * admin_categories.php
 * CRUD danh mục sản phẩm.
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

function slugifyName($name) {
    $s = mb_strtolower(trim($name), 'UTF-8');
    $s = preg_replace('/\s+/', '-', $s);
    $s = preg_replace('/[^a-z0-9\-àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/u', '', $s);
    return $s ?: 'danh-muc';
}

try {
    switch ($method) {
        case 'GET':
            $rows = $pdo->query("
                SELECT c.*, COUNT(p.id) AS product_count
                FROM categories c
                LEFT JOIN products p ON p.category_id = c.id
                GROUP BY c.id
                ORDER BY c.name ASC
            ")->fetchAll();
            $out = [];
            foreach ($rows as $row) {
                $out[] = [
                    'id' => (int)$row['id'],
                    'name' => $row['name'],
                    'slug' => $row['slug'],
                    'description' => $row['description'] ?? '',
                    'product_count' => (int)$row['product_count']
                ];
            }
            echo json_encode($out);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $name = trim($data['name'] ?? '');
            if ($name === '') {
                echo json_encode(['error' => true, 'message' => 'Tên danh mục không được để trống']);
                break;
            }
            $slug = !empty($data['slug']) ? trim($data['slug']) : slugifyName($name);
            $stmt = $pdo->prepare("INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)");
            $stmt->execute([$name, $slug, $data['description'] ?? '']);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $id = (int)($data['id'] ?? 0);
            $name = trim($data['name'] ?? '');
            if (!$id || $name === '') {
                echo json_encode(['error' => true, 'message' => 'Thiếu id hoặc tên danh mục']);
                break;
            }
            $slug = !empty($data['slug']) ? trim($data['slug']) : slugifyName($name);
            $stmt = $pdo->prepare("UPDATE categories SET name=?, slug=?, description=? WHERE id=?");
            $stmt->execute([$name, $slug, $data['description'] ?? '', $id]);
            echo json_encode(['success' => true]);
            break;

        case 'DELETE':
            $data = json_decode(file_get_contents('php://input'), true);
            $id = (int)($data['id'] ?? 0);
            if (!$id) {
                echo json_encode(['error' => true, 'message' => 'Thiếu id']);
                break;
            }
            $check = $pdo->prepare("SELECT COUNT(*) FROM products WHERE category_id = ?");
            $check->execute([$id]);
            if ((int)$check->fetchColumn() > 0) {
                echo json_encode(['error' => true, 'message' => 'Không thể xóa: còn sản phẩm thuộc danh mục này']);
                break;
            }
            $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
    }
} catch (PDOException $e) {
    $msg = $e->getCode() == 23000 ? 'Slug hoặc tên danh mục đã tồn tại' : $e->getMessage();
    echo json_encode(['error' => true, 'message' => $msg]);
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
