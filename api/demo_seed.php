<?php
/**
 * demo_seed.php
 * Script này tự động insert dữ liệu mẫu Hãng, Danh mục và Xe vào MySQL.
 * Chạy trang này 1 lần trên trình duyệt để nạp dữ liệu: http://localhost/shop/api/demo_seed.php
 */

require 'db.php';

echo "<h1>Đang nạp dữ liệu Demo vào MySQL...</h1>";

try {
    // Tắt kiểm tra khóa ngoại (ngoại trừ production)
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    
    // Clear dữ liệu cũ
    $pdo->exec("TRUNCATE TABLE brands;");
    $pdo->exec("TRUNCATE TABLE categories;");
    $pdo->exec("TRUNCATE TABLE products;");
    $pdo->exec("TRUNCATE TABLE product_specs;");
    
    // Insert Brands
    $pdo->exec("INSERT INTO brands (id, name, slug) VALUES (1, 'Honda', 'honda'), (2, 'Yamaha', 'yamaha'), (3, 'Ducati', 'ducati');");
    
    // Insert Categories
    $pdo->exec("INSERT INTO categories (id, name, slug) VALUES (1, 'Xe Tay Ga', 'xe-tay-ga'), (2, 'Xe Số', 'xe-so'), (3, 'Xe Côn Tay', 'xe-con-tay'), (4, 'Phân Khối Lớn', 'phan-khoi-lon');");
    
    // Insert Products Data (Tương tự JSON mock)
    $stmtProc = $pdo->prepare("INSERT INTO products (id, brand_id, category_id, name, slug, price, sale_price, main_image, is_hot, is_new) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmtSpec = $pdo->prepare("INSERT INTO product_specs (product_id, engine_type, displacement, max_power, weight) VALUES (?, ?, ?, ?, ?)");
    
    $products = [
        [1, 1, 3, "Honda Winner X 2024", "honda-winner-x-2024", 50500000, 48500000, "https://images.unsplash.com/photo-1568772585407-9361f9bf3c87?q=80&w=2070", 1, 1, "DOHC, 4 kỳ, xi-lanh đơn", "149.1 cc", "11.5kW/9,000 vòng/phút", "122 kg" ],
        [2, 2, 3, "Yamaha Exciter 155 VVA", "yamaha-exciter-155-vva", 51000000, null, "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?q=80&w=2070", 1, 0, "SOHC, 4 kỳ, 4 van, làm mát", "155.1 cc", "13.2 kW/9,500 vòng/phút", "121 kg" ],
        [3, 1, 1, "Honda SH 160i 2024", "honda-sh-160i", 105000000, 101000000, "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2070", 1, 1, "eSP+, 4 kỳ, SOHC, làm mát", "156.9 cc", "12.4kW/8,500 vòng/phút", "134 kg" ],
        [4, 1, 1, "Honda Vision 2024", "honda-vision-2024", 35000000, null, "https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=2070", 1, 0, "eSP, 4 kỳ, SOHC", "109.5 cc", "6.59kW/7,500 vòng/phút", "94 kg" ],
        [5, 2, 1, "Yamaha NVX 155 VVA", "yamaha-nvx-155", 54500000, 53000000, "https://images.unsplash.com/photo-1604054923518-e491a9a6acbc?q=80&w=2000", 0, 1, "Blue Core, SOHC, 4 kỳ", "155.1 cc", "11.3 kW/8,000 vòng/phút", "125 kg" ],
        [6, 3, 4, "Ducati Panigale V4", "ducati-panigale-v4", 750000000, null, "https://images.unsplash.com/photo-1568772585407-9361f9bf3c87?q=80&w=2070", 1, 1, "Desmosedici Stradale 90° V4", "1103 cc", "215.5 hp @ 13,000 rpm", "198.5 kg" ],
        [7, 1, 2, "Honda Wave Alpha", "honda-wave-alpha", 18000000, 17500000, "https://images.unsplash.com/photo-1558980394-0a37c6ce74fa?q=80&w=2000", 1, 0, "4 kỳ, SOHC", "109.1 cc", "6.12kW / 7.500 vòng/phút", "97 kg" ],
        [8, 2, 1, "Yamaha Grande Blue Core", "yamaha-grande", 46000000, null, "https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?q=80&w=2000", 0, 1, "Blue Core Hybrid, SOHC", "125 cc", "6.1 kW/6,500 vòng/phút", "101 kg" ],
    ];

    foreach ($products as $p) {
        $stmtProc->execute([$p[0], $p[1], $p[2], $p[3], $p[4], $p[5], $p[6], $p[7], $p[8], $p[9]]);
        $stmtSpec->execute([$p[0], $p[10], $p[11], $p[12], $p[13]]);
    }

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    echo "<p style='color:green'>Thành công! Dữ liệu đã được nạp vào MySQL. Bạn có thể quay lại trang chủ để kiểm tra.</p>";
    
} catch (Exception $e) {
    echo "<p style='color:red'>Lỗi nạp dữ liệu: " . $e->getMessage() . "</p>";
}
?>
