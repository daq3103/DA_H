<?php
/**
 * admin_contacts.php
 * API quản lý liên hệ.
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $rows = $pdo->query("SELECT * FROM contacts ORDER BY created_at DESC")->fetchAll();
            echo json_encode($rows);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['full_name']) || empty($data['phone']) || empty($data['message'])) {
                echo json_encode(['error' => true, 'message' => 'Vui lòng điền đầy đủ thông tin bắt buộc.']);
                exit;
            }
            $stmt = $pdo->prepare("INSERT INTO contacts (full_name, phone, email, message) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $data['full_name'],
                $data['phone'],
                $data['email'] ?? null,
                $data['message']
            ]);
            echo json_encode(['success' => true, 'message' => 'Gửi liên hệ thành công!']);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("UPDATE contacts SET status = ? WHERE id = ?");
            $stmt->execute([$data['status'], $data['id']]);
            echo json_encode(['success' => true]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
