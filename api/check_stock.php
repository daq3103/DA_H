<?php
/**
 * check_stock.php
 * Kiểm tra tồn kho thực tế trong DB trước khi đặt hàng (đồng bộ giỏ hàng).
 *
 * POST body: { "items": [ {"id": 1, "quantity": 2}, ... ] }
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$items = $input['items'] ?? [];

if (empty($items)) {
    echo json_encode(['ok' => true, 'items' => [], 'problems' => []]);
    exit;
}

try {
    $problems = [];
    $stockList = [];

    foreach ($items as $item) {
        $id = (int)($item['id'] ?? 0);
        $qty = (int)($item['quantity'] ?? 0);
        if ($id <= 0) {
            continue;
        }

        $stmt = $pdo->prepare("SELECT id, name, stock_quantity, status FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        if (!$product) {
            $problems[] = [
                'id' => $id,
                'reason' => 'not_found',
                'message' => 'Có sản phẩm không còn tồn tại trong cửa hàng.'
            ];
            continue;
        }

        $stock = (int)$product['stock_quantity'];
        $stockList[] = [
            'id' => $id,
            'name' => $product['name'],
            'stock_quantity' => $stock
        ];

        if ($product['status'] !== 'active') {
            $problems[] = [
                'id' => $id,
                'name' => $product['name'],
                'reason' => 'inactive',
                'stock' => $stock,
                'requested' => $qty,
                'message' => '"' . $product['name'] . '" đã ngừng kinh doanh.'
            ];
            continue;
        }

        if ($stock <= 0) {
            $problems[] = [
                'id' => $id,
                'name' => $product['name'],
                'reason' => 'out_of_stock',
                'stock' => 0,
                'requested' => $qty,
                'message' => '"' . $product['name'] . '" đã hết hàng.'
            ];
            continue;
        }

        if ($qty > $stock) {
            $problems[] = [
                'id' => $id,
                'name' => $product['name'],
                'reason' => 'insufficient',
                'stock' => $stock,
                'requested' => $qty,
                'message' => '"' . $product['name'] . '" chỉ còn ' . $stock . ' chiếc (bạn chọn ' . $qty . ').'
            ];
        }
    }

    echo json_encode([
        'ok' => count($problems) === 0,
        'message' => count($problems) > 0 ? $problems[0]['message'] : '',
        'items' => $stockList,
        'problems' => $problems
    ]);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'message' => 'Lỗi kiểm tra tồn kho: ' . $e->getMessage()]);
}
