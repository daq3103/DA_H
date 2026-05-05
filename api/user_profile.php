<?php
/**
 * user_profile.php
 * API cập nhật thông tin cá nhân và đổi mật khẩu.
 * ?action=update | change_password
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
    case 'update':
        $userId   = (int)($input['user_id'] ?? 0);
        $fullName = trim($input['full_name'] ?? '');
        $phone    = trim($input['phone'] ?? '');
        $email    = trim($input['email'] ?? '');
        $address  = trim($input['address'] ?? '');

        if ($userId <= 0 || empty($fullName) || empty($phone)) {
            echo json_encode(['success' => false, 'message' => 'Thiếu thông tin bắt buộc']);
            exit;
        }

        try {
            // Kiểm tra trùng SĐT với user khác
            $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ? AND id != ?");
            $stmt->execute([$phone, $userId]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Số điện thoại đã được sử dụng bởi tài khoản khác']);
                exit;
            }

            // Kiểm tra trùng email
            if (!empty($email)) {
                $stmt2 = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
                $stmt2->execute([$email, $userId]);
                if ($stmt2->fetch()) {
                    echo json_encode(['success' => false, 'message' => 'Email đã được sử dụng bởi tài khoản khác']);
                    exit;
                }
            }

            $stmtUpdate = $pdo->prepare("UPDATE users SET full_name = ?, phone = ?, email = ?, address = ? WHERE id = ?");
            $stmtUpdate->execute([$fullName, $phone, !empty($email) ? $email : null, $address, $userId]);

            // Trả về thông tin mới
            $stmtGet = $pdo->prepare("SELECT id, full_name, phone, email, address, role FROM users WHERE id = ?");
            $stmtGet->execute([$userId]);
            $user = $stmtGet->fetch();

            echo json_encode(['success' => true, 'message' => 'Cập nhật thành công!', 'user' => $user]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
        }
        break;

    case 'change_password':
        $userId      = (int)($input['user_id'] ?? 0);
        $oldPassword = $input['old_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        if ($userId <= 0 || empty($oldPassword) || empty($newPassword)) {
            echo json_encode(['success' => false, 'message' => 'Vui lòng nhập đầy đủ thông tin']);
            exit;
        }

        if (strlen($newPassword) < 6) {
            echo json_encode(['success' => false, 'message' => 'Mật khẩu mới phải có ít nhất 6 ký tự']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($oldPassword, $user['password_hash'])) {
                echo json_encode(['success' => false, 'message' => 'Mật khẩu hiện tại không đúng']);
                exit;
            }

            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmtUpdate = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $stmtUpdate->execute([$newHash, $userId]);

            echo json_encode(['success' => true, 'message' => 'Đổi mật khẩu thành công!']);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Action không hợp lệ']);
        break;
}
?>
