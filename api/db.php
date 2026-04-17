<?php
/**
 * db.php
 * File kết nối Database MySQL sử dụng kịch bản kết nối an toàn (PDO).
 */

$host = '127.0.0.1'; // Hoặc 'localhost'
$db = 'shop_motorcycle';
$user = 'root';      // Mặc định của XAMPP là root
$pass = '';               // Mặc định của XAMPP pass rỗng
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Trả về JSON lỗi nếu không kết nối được
    header('Content-Type: application/json');
    echo json_encode([
        'error' => true,
        'message' => 'Lỗi kết nối CSDL: ' . $e->getMessage() . '. Bạn đã tạo CSDL shop_motorcycle chưa?'
    ]);
    exit;
}
?>