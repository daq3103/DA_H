<?php
/**
 * admin_coupons.php
 * CRUD API cho quản lý mã giảm giá (admin).
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->query("SELECT * FROM coupons ORDER BY created_at DESC");
            $coupons = $stmt->fetchAll();
            foreach ($coupons as &$c) {
                $c['discount_value'] = (int)$c['discount_value'];
                $c['min_order_amount'] = (int)$c['min_order_amount'];
                $c['max_discount'] = $c['max_discount'] ? (int)$c['max_discount'] : null;
                $c['max_uses'] = $c['max_uses'] ? (int)$c['max_uses'] : null;
                $c['used_count'] = (int)$c['used_count'];
            }
            echo json_encode($coupons);
        } catch (Exception $e) {
            echo json_encode(['error' => true, 'message' => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $stmt = $pdo->prepare("INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, max_uses, starts_at, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                strtoupper(trim($input['code'])),
                $input['description'] ?? '',
                $input['discount_type'] ?? 'percent',
                $input['discount_value'],
                $input['min_order_amount'] ?? 0,
                !empty($input['max_discount']) ? $input['max_discount'] : null,
                !empty($input['max_uses']) ? $input['max_uses'] : null,
                !empty($input['starts_at']) ? $input['starts_at'] : null,
                !empty($input['expires_at']) ? $input['expires_at'] : null,
                $input['status'] ?? 'active'
            ]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } catch (Exception $e) {
            echo json_encode(['error' => true, 'message' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $stmt = $pdo->prepare("UPDATE coupons SET code=?, description=?, discount_type=?, discount_value=?, min_order_amount=?, max_discount=?, max_uses=?, starts_at=?, expires_at=?, status=? WHERE id=?");
            $stmt->execute([
                strtoupper(trim($input['code'])),
                $input['description'] ?? '',
                $input['discount_type'] ?? 'percent',
                $input['discount_value'],
                $input['min_order_amount'] ?? 0,
                !empty($input['max_discount']) ? $input['max_discount'] : null,
                !empty($input['max_uses']) ? $input['max_uses'] : null,
                !empty($input['starts_at']) ? $input['starts_at'] : null,
                !empty($input['expires_at']) ? $input['expires_at'] : null,
                $input['status'] ?? 'active',
                $input['id']
            ]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['error' => true, 'message' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $stmt = $pdo->prepare("DELETE FROM coupons WHERE id = ?");
            $stmt->execute([$input['id']]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['error' => true, 'message' => $e->getMessage()]);
        }
        break;
}
?>
