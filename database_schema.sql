-- Tạo cơ sở dữ liệu
CREATE DATABASE IF NOT EXISTS shop_motorcycle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shop_motorcycle;

-- 1. Bảng Hãng xe
CREATE TABLE brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- Tối ưu SEO
    logo_url VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Bảng Loại xe / Danh mục
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- Tối ưu SEO
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Bảng Sản phẩm (Xe máy)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand_id INT,
    category_id INT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    price DECIMAL(15, 0) NOT NULL, -- Tiền Việt (VND) thường không có số lẻ, dùng (15,0)
    sale_price DECIMAL(15, 0),
    stock_quantity INT DEFAULT 0,
    main_image VARCHAR(255),
    description LONGTEXT,
    is_hot BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT TRUE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    -- Đánh Index để tìm kiếm nhanh hơn
    INDEX idx_status_hot (status, is_hot),
    INDEX idx_brand_category (brand_id, category_id)
) ENGINE=InnoDB;

-- 4. Bảng Hình ảnh sản phẩm (Gallery)
CREATE TABLE product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    image_url VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_order (product_id, display_order) -- Truy xuất gallery nhanh hơn
) ENGINE=InnoDB;

-- 5. Bảng Thông số kỹ thuật xe
-- Giữ nguyên, nhưng nếu sau này muốn filter (ví dụ: tìm xe có dung tích > 150cc), 
-- bạn nên tách số ra thành cột riêng (vd: displacement_cc INT)
CREATE TABLE product_specs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNIQUE,
    engine_type VARCHAR(150),
    displacement VARCHAR(50),
    max_power VARCHAR(100),
    max_torque VARCHAR(100),
    fuel_capacity VARCHAR(50),
    weight VARCHAR(50),
    fuel_consumption VARCHAR(50),
    transmission VARCHAR(100),
    brakes VARCHAR(150),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Bảng Người dùng / Khách hàng
CREATE TABLE users ( -- Đổi tên thành users để bao quát cả admin và khách
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL, -- Chống trùng SĐT
    email VARCHAR(150) UNIQUE, -- Chống trùng Email
    address TEXT,
    password_hash VARCHAR(255),
    role ENUM('customer', 'staff', 'admin') DEFAULT 'customer', -- Quản lý quyền tốt hơn
    status ENUM('active', 'locked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO users (full_name, phone, email, password_hash, role) VALUES
('Quản Trị Viên', '0988123456', 'admin@motoshop.vn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- 7. Bảng Đơn hàng
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL, -- Mã đơn hàng hiển thị cho khách (VD: HD2403-1A2B)
    user_id INT,
    
    -- Snapshot thông tin người nhận (Bắt buộc phải có để không bị đổi nếu user đổi profile)
    shipping_name VARCHAR(150) NOT NULL,
    shipping_phone VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,
    
    total_amount DECIMAL(15, 0) NOT NULL,
    status ENUM('pending', 'contacted', 'completed', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(100) DEFAULT 'cod',
    payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid', -- Trạng thái thanh toán
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL, -- Xóa user không làm mất đơn hàng
    INDEX idx_order_status (status)
) ENGINE=InnoDB;

-- 8. Chi tiết Đơn hàng
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 0) NOT NULL, -- Lưu giá lúc mua (đề phòng sản phẩm sau này đổi giá)
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 9. Bảng Tin tức / Blog
CREATE TABLE news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    thumbnail_url VARCHAR(255),
    summary TEXT,
    content LONGTEXT,
    author_id INT, -- Liên kết với người viết bài
    published_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_published_at (published_at)
) ENGINE=InnoDB;

-- (Đã bỏ tính năng mã giảm giá — bảng coupons không còn dùng)

-- 10. Bảng Liên hệ
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    message TEXT NOT NULL,
    status ENUM('unread', 'read', 'replied') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;