<?php
/**
 * user_auth.php
 * API xử lý đăng ký, đăng nhập và lấy profile cho user (customer).
 * Sử dụng query param: ?action=register | login | profile
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {

    // ==================== ĐĂNG KÝ ====================
    case 'register':
        $fullName = trim($input['full_name'] ?? '');
        $phone    = trim($input['phone'] ?? '');
        $email    = trim($input['email'] ?? '');
        $address  = trim($input['address'] ?? '');
        $password = $input['password'] ?? '';

        // Validate
        if (empty($fullName) || empty($phone) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Vui lòng nhập đầy đủ Họ tên, SĐT và Mật khẩu']);
            exit;
        }

        if (strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'Mật khẩu phải có ít nhất 6 ký tự']);
            exit;
        }

        // Validate số điện thoại (chỉ chứa chữ số và độ dài 10-11)
        if (!preg_match('/^[0-9]{10,11}$/', $phone)) {
            echo json_encode(['success' => false, 'message' => 'Số điện thoại không hợp lệ']);
            exit;
        }

        // Validate định dạng Email nếu có nhập
        if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Định dạng Email không hợp lệ']);
            exit;
        }

        // Kiểm tra SĐT đã tồn tại
        try {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
            $stmt->execute([$phone]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Số điện thoại này đã được đăng ký']);
                exit;
            }

            // Kiểm tra email đã tồn tại (nếu có nhập)
            if (!empty($email)) {
                $stmt2 = $pdo->prepare("SELECT id FROM users WHERE email = ?");
                $stmt2->execute([$email]);
                if ($stmt2->fetch()) {
                    echo json_encode(['success' => false, 'message' => 'Email này đã được đăng ký']);
                    exit;
                }
            }

            // Tạo tài khoản
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmtInsert = $pdo->prepare("INSERT INTO users (full_name, phone, email, address, password_hash, role) VALUES (?, ?, ?, ?, ?, 'customer')");
            $stmtInsert->execute([$fullName, $phone, !empty($email) ? $email : null, $address, $hash]);

            echo json_encode([
                'success' => true,
                'message' => 'Đăng ký thành công! Bạn có thể đăng nhập ngay.'
            ]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
        }
        break;

    // ==================== ĐĂNG NHẬP ====================
    case 'login':
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Vui lòng nhập đủ thông tin']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE (email = ? OR phone = ?) AND status = 'active'");
            $stmt->execute([$username, $username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id'        => (int)$user['id'],
                        'full_name' => $user['full_name'],
                        'phone'     => $user['phone'],
                        'email'     => $user['email'],
                        'address'   => $user['address'],
                        'role'      => $user['role']
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Sai thông tin đăng nhập']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
        }
        break;

    // ==================== LẤY PROFILE ====================
    case 'profile':
        $userId = (int)($input['user_id'] ?? 0);
        if ($userId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Thiếu user_id']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("SELECT id, full_name, phone, email, address, role, created_at FROM users WHERE id = ? AND status = 'active'");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            if ($user) {
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Không tìm thấy tài khoản']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Action không hợp lệ']);
        break;
}
?>
