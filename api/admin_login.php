<?php
/**
 * admin_login.php
 * Xử lý đăng nhập admin — kiểm tra từ bảng users (role = 'admin' hoặc 'staff').
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$email = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Vui lòng nhập đủ thông tin']);
    exit;
}

try {
    // Tìm user theo email HOẶC phone, phải có role admin/staff và status active
    $stmt = $pdo->prepare("SELECT * FROM users WHERE (email = ? OR phone = ?) AND role IN ('admin', 'staff') AND status = 'active'");
    $stmt->execute([$email, $email]);
    $admin = $stmt->fetch();

    if ($admin && password_verify($password, $admin['password_hash'])) {
        echo json_encode([
            'success' => true,
            'admin' => [
                'id' => (int)$admin['id'],
                'username' => $admin['email'],
                'full_name' => $admin['full_name'],
                'role' => $admin['role']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Sai thông tin đăng nhập hoặc không có quyền admin']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
}
?>
