<?php
/**
 * create_admin.php
 * Chạy 1 lần để tạo/reset tài khoản admin.
 * Truy cập: http://localhost/shop/api/create_admin.php
 * SAU KHI TẠO XONG NÊN XÓA FILE NÀY!
 */

header('Content-Type: text/html; charset=utf-8');
require 'db.php';

$password = 'admin123';
$hash = password_hash($password, PASSWORD_BCRYPT);

try {
    // Xóa admin cũ nếu có
    $pdo->prepare("DELETE FROM users WHERE email = ?")->execute(['admin@motoshop.vn']);

    // Tạo admin mới
    $stmt = $pdo->prepare("INSERT INTO users (full_name, phone, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'admin', 'active')");
    $stmt->execute(['Quản Trị Viên', '0988123456', 'admin@motoshop.vn', $hash]);

    echo "<h2 style='color:green;'>✅ Tạo tài khoản admin thành công!</h2>";
    echo "<p><b>Email:</b> admin@motoshop.vn</p>";
    echo "<p><b>Password:</b> admin123</p>";
    echo "<p><b>Hash:</b> $hash</p>";
    echo "<br><a href='../admin/login.html'>→ Đăng nhập Admin</a>";
    echo "<br><br><small style='color:red;'>⚠️ Nhớ xóa file create_admin.php sau khi tạo xong!</small>";
} catch (Exception $e) {
    echo "<h2 style='color:red;'>❌ Lỗi: " . $e->getMessage() . "</h2>";
}
?>
