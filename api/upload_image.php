<?php
/**
 * upload_image.php
 * API upload ảnh sản phẩm từ máy tính lên server.
 * Trả về đường dẫn tương đối của ảnh đã upload.
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// Thư mục lưu ảnh
$uploadDir = __DIR__ . '/../uploads/products/';

// Tạo thư mục nếu chưa có
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Kiểm tra có file được gửi lên không
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE   => 'File quá lớn (vượt giới hạn server)',
        UPLOAD_ERR_FORM_SIZE  => 'File quá lớn (vượt giới hạn form)',
        UPLOAD_ERR_PARTIAL    => 'File chỉ được upload một phần',
        UPLOAD_ERR_NO_FILE    => 'Không có file nào được chọn',
        UPLOAD_ERR_NO_TMP_DIR => 'Thiếu thư mục tạm trên server',
        UPLOAD_ERR_CANT_WRITE => 'Không thể ghi file lên server',
    ];
    $errCode = $_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE;
    $msg = $errorMessages[$errCode] ?? 'Lỗi upload không xác định';
    echo json_encode(['success' => false, 'message' => $msg]);
    exit;
}

$file = $_FILES['image'];

// Kiểm tra loại file (chỉ cho phép ảnh)
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    echo json_encode(['success' => false, 'message' => 'Chỉ cho phép upload ảnh (JPG, PNG, GIF, WEBP)']);
    exit;
}

// Kiểm tra dung lượng (tối đa 5MB)
$maxSize = 5 * 1024 * 1024; // 5MB
if ($file['size'] > $maxSize) {
    echo json_encode(['success' => false, 'message' => 'Ảnh quá lớn. Tối đa 5MB.']);
    exit;
}

// Tạo tên file duy nhất để tránh trùng
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$newName = time() . '_' . bin2hex(random_bytes(4)) . '.' . strtolower($ext);
$destPath = $uploadDir . $newName;

if (move_uploaded_file($file['tmp_name'], $destPath)) {
    // Tự động xác định đường dẫn tương đối dựa trên vị trí thực của project
    // Tìm base path của project từ URL hiện tại
    $scriptDir = dirname($_SERVER['SCRIPT_NAME']); // /shop/api
    $basePath = dirname($scriptDir);                // /shop
    $relativePath = $basePath . '/uploads/products/' . $newName;
    echo json_encode([
        'success' => true,
        'url' => $relativePath,
        'message' => 'Upload ảnh thành công!'
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Không thể lưu file. Kiểm tra quyền thư mục uploads/']);
}
?>
