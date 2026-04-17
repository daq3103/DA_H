/**
 * Main JavaScript cho MotoShop
 * Xử lý giao diện, giỏ hàng local, và render sản phẩm
 */

// === Tự động chuyển hướng sang localhost nếu mở bằng file:// ===
(function() {
    if (window.location.protocol === 'file:') {
        // Lấy đường dẫn file, tìm thư mục gốc project (VD: /shop/)
        const path = window.location.pathname; // VD: /D:/code/HUMG_DA/shop/index.html
        const match = path.match(/\/shop\/(.*)/i);
        if (match) {
            const page = match[1] || 'index.html';
            window.location.href = 'http://localhost/shop/' + page;
            return; // Dừng thực thi JS tiếp
        }
    }
})();

// Format tiền tệ VNĐ
const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
};

/**
 * Sửa đường dẫn ảnh upload local.
 * Nếu ảnh là URL đầy đủ (http/https) thì giữ nguyên.
 * Nếu ảnh là đường dẫn /uploads/... thì sửa thành đường dẫn đúng.
 * Frontend page nằm ở /shop/ nên cần đường dẫn uploads/... (tương đối)
 */
function fixImageUrl(url) {
    if (!url) return 'https://via.placeholder.com/400x300?text=No+Image';
    // URL đầy đủ (http/https) → giữ nguyên
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Đường dẫn /uploads/... → sửa thành uploads/... (bỏ dấu / đầu)
    if (url.startsWith('/uploads/')) return url.substring(1);
    // Đường dẫn /shop/uploads/... → sửa thành uploads/...
    if (url.match(/^\/\w+\/uploads\//)) return 'uploads/' + url.split('/uploads/')[1];
    return url;
}

// State chung
let cart = JSON.parse(localStorage.getItem('motoshop_cart')) || [];
let productsData = [];

// Init khi DOM load xong
document.addEventListener('DOMContentLoaded', async () => {
    updateCartIconCount();
    initUserAuth();

    // Dùng FETCH qua API PHP trên XAMPP (khắc phục lỗi CORS từ file:// trước đó)
    try {
        const response = await fetch('api/get_products.php');
        if (response.ok) {
            productsData = await response.json();
            
            if (productsData.error) {
                console.error("Lỗi từ DB: ", productsData.message);
                return;
            }

            // Gọi render khi có data
            if (document.getElementById('new-arrivals-container')) renderHomeProducts();
            if (document.getElementById('products-grid')) {
                renderProductsPage();
                initFilters();
            }
            if (document.getElementById('product-detail-container')) renderProductDetail();
            if (document.getElementById('cart-items-container')) renderCartPage();
        }
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu sản phẩm qua API:", error);
        
        // Cảnh báo thân thiện cho UX
        const mains = document.querySelectorAll('#new-arrivals-container, #products-grid, #product-main-view');
        mains.forEach(el => {
            if(el) el.innerHTML = `<div class="col-12 text-center py-5 text-danger"><h5>Không thể kết nối CSDL MySQL. Bạn đã bật Apache & MySQL trên XAMPP chưa?</h5></div>`;
        });
    }
});

function renderHomeProducts() {
    const newArrivalsContainer = document.getElementById('new-arrivals-container');
    const hotSalesContainer = document.getElementById('hot-cars-container');

    if (!newArrivalsContainer || !hotSalesContainer) return;

    const newProducts = productsData.filter(p => p.is_new).slice(0, 4);
    const hotProducts = productsData.filter(p => p.is_hot).slice(0, 4);

    newArrivalsContainer.innerHTML = newProducts.map(p => createProductCardHTML(p)).join('');
    hotSalesContainer.innerHTML = hotProducts.map(p => createProductCardHTML(p)).join('');
}

function renderProductsPage() {
    const productsGrid = document.getElementById('products-grid');
    const countSpan = document.getElementById('product-count');
    if (!productsGrid) return;

    const urlParams = new URLSearchParams(window.location.search);
    const filterBrand = urlParams.get('brand');
    const filterCategory = urlParams.get('category');

    let filtered = [...productsData];

    if (filterBrand) {
        filtered = filtered.filter(p => p.brand.toLowerCase() === filterBrand.toLowerCase());
        document.querySelectorAll('.filter-brand').forEach(cb => {
            if(cb.value.toLowerCase() === filterBrand.toLowerCase()) cb.checked = true;
        });
    }
    
    if (filterCategory) {
        const catStr = filterCategory.replace(/-/g, ' ').toLowerCase();
        filtered = filtered.filter(p => p.category.toLowerCase().includes(catStr) || catStr.includes(p.category.toLowerCase()));
        
        document.querySelectorAll('.filter-category').forEach(cb => {
            if(cb.value.toLowerCase().includes(catStr)) cb.checked = true;
        });
    }

    if(filtered.length === 0) {
        productsGrid.innerHTML = `<div class="col-12 text-center py-5"><h5 class="text-muted">Không tìm thấy sản phẩm phù hợp.</h5></div>`;
    } else {
        productsGrid.innerHTML = filtered.map(p => createProductCardHTML(p)).join('');
    }
    
    countSpan.textContent = filtered.length;
}

function initFilters() {
    const brands = document.querySelectorAll('.filter-brand');
    const categories = document.querySelectorAll('.filter-category');
    const prices = document.querySelectorAll('.filter-price');
    const resetBtn = document.getElementById('reset-filters');
    const sortSelect = document.getElementById('sort-select');

    const updateFilters = () => {
        let filtered = [...productsData];

        const checkedBrands = Array.from(brands).filter(cb => cb.checked).map(cb => cb.value);
        if (checkedBrands.length > 0) {
            filtered = filtered.filter(p => checkedBrands.includes(p.brand));
        }

        const checkedCats = Array.from(categories).filter(cb => cb.checked).map(cb => cb.value);
        if (checkedCats.length > 0) {
            filtered = filtered.filter(p => checkedCats.includes(p.category));
        }

        const selectedPrice = Array.from(prices).find(rb => rb.checked).value;
        if (selectedPrice !== 'all') {
            const finalPrice = (p) => p.sale_price ? p.sale_price : p.price;
            if (selectedPrice === '0-30') filtered = filtered.filter(p => finalPrice(p) < 30000000);
            if (selectedPrice === '30-50') filtered = filtered.filter(p => finalPrice(p) >= 30000000 && finalPrice(p) <= 50000000);
            if (selectedPrice === '50-100') filtered = filtered.filter(p => finalPrice(p) > 50000000 && finalPrice(p) <= 100000000);
            if (selectedPrice === '100-up') filtered = filtered.filter(p => finalPrice(p) > 100000000);
        }
        
        const sortVal = sortSelect.value;
        if(sortVal === 'price-asc') {
            filtered.sort((a,b) => (a.sale_price||a.price) - (b.sale_price||b.price));
        } else if(sortVal === 'price-desc') {
            filtered.sort((a,b) => (b.sale_price||b.price) - (a.sale_price||a.price));
        } else if(sortVal === 'name-asc') {
            filtered.sort((a,b) => a.name.localeCompare(b.name));
        }

        const productsGrid = document.getElementById('products-grid');
        document.getElementById('product-count').textContent = filtered.length;
        
        if (filtered.length === 0) {
            productsGrid.innerHTML = `<div class="col-12 text-center py-5"><h5 class="text-muted">Không tìm thấy sản phẩm phù hợp.</h5></div>`;
        } else {
            productsGrid.innerHTML = filtered.map(p => createProductCardHTML(p)).join('');
        }
    };

    brands.forEach(cb => cb.addEventListener('change', updateFilters));
    categories.forEach(cb => cb.addEventListener('change', updateFilters));
    prices.forEach(rb => rb.addEventListener('change', updateFilters));
    sortSelect.addEventListener('change', updateFilters);

    resetBtn.addEventListener('click', () => {
        brands.forEach(cb => cb.checked = false);
        categories.forEach(cb => cb.checked = false);
        prices.forEach(rb => {
            if(rb.value === 'all') rb.checked = true;
        });
        sortSelect.value = 'default';
        window.history.replaceState({}, '', window.location.pathname);
        updateFilters();
    });
}

function renderProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    
    if (!productId) {
        window.location.href = 'products.html';
        return;
    }

    const product = productsData.find(p => p.id === productId);
    if (!product) {
        document.getElementById('product-main-view').innerHTML = `<div class="col-12 text-center my-5 py-5"><h3 class="text-danger">Sản phẩm không tồn tại</h3></div>`;
        return;
    }

    const hasSale = product.sale_price && product.sale_price < product.price;
    const displayPrice = hasSale ? formatCurrency(product.sale_price) : formatCurrency(product.price);
    const oldPriceHTML = hasSale ? `<span class="text-muted text-decoration-line-through fs-5 ms-3">${formatCurrency(product.price)}</span>` : '';

    document.getElementById('product-breadcrumb').innerHTML = `
        <li class="breadcrumb-item"><a href="index.html" class="text-primary-moto text-decoration-none">Trang chủ</a></li>
        <li class="breadcrumb-item"><a href="products.html" class="text-primary-moto text-decoration-none">Sản phẩm</a></li>
        <li class="breadcrumb-item active" aria-current="page">${product.name}</li>
    `;

    document.getElementById('product-main-view').innerHTML = `
        <div class="col-lg-6 mb-4 mb-lg-0">
            <div class="bg-light rounded-3 p-4 mb-3 text-center position-relative h-100 d-flex align-items-center justify-content-center">
                ${product.is_new ? '<span class="badge bg-primary-moto position-absolute top-0 start-0 m-3 h6 px-3 py-2 rounded-pill">Mới Ra Mắt</span>' : ''}
                <img src="${fixImageUrl(product.image)}" class="img-fluid" alt="${product.name}" style="max-height: 400px; object-fit: contain;">
            </div>
        </div>
        
        <div class="col-lg-6 px-lg-5">
            <div class="d-flex align-items-center mb-2">
                <span class="badge bg-dark text-white me-2">${product.brand}</span>
                <span class="text-muted small"><i class="fas fa-tag me-1"></i> ${product.category}</span>
            </div>
            <h1 class="display-5 fw-bold mb-3">${product.name}</h1>
            
            <div class="price-box mb-4 pb-4 border-bottom">
                <span class="text-primary-moto display-6 fw-bold">${displayPrice}</span>
                ${oldPriceHTML}
            </div>
            
            <div class="mb-4">
                <h6 class="fw-bold mb-3">Chính sách đặc quyền mua xe:</h6>
                <ul class="list-unstyled text-muted lh-lg">
                    <li><i class="fas fa-check text-success me-2"></i>Bảo hành chính hãng 30.000km hoặc 3 năm.</li>
                    <li><i class="fas fa-check text-success me-2"></i>Tặng kèm: Mũ bảo hiểm, Áo mưa thiết kế cao cấp.</li>
                    <li><i class="fas fa-check text-success me-2"></i>Hỗ trợ trả góp lãi suất 0% qua thẻ tín dụng.</li>
                </ul>
            </div>
            
            <div class="d-flex gap-3 mb-4">
                <div class="input-group" style="width: 130px;">
                    <button class="btn btn-outline-secondary border" type="button" onclick="changeQty(-1)"><i class="fas fa-minus"></i></button>
                    <input type="text" class="form-control text-center bg-white" id="qty-input" value="1" readonly>
                    <button class="btn btn-outline-secondary border" type="button" onclick="changeQty(1)"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            
            <div class="d-flex flex-column flex-sm-row gap-3 mt-4 pt-2">
                <button class="btn btn-outline-dark btn-lg rounded-pill px-4 fw-bold" onclick="addCurrentToCart(${product.id})">
                    <i class="fas fa-cart-plus me-2"></i> THÊM VÀO GIỎ
                </button>
                <button class="btn btn-moto-primary btn-lg rounded-pill flex-grow-1 fw-bold fs-5 shadow" onclick="buyNow(${product.id})">MUA NGAY</button>
            </div>
        </div>
    `;

    document.getElementById('leadForm').addEventListener('submit', function(e) {
        e.preventDefault();
        alert("Chúng tôi đã nhận được yêu cầu tư vấn cho xe " + product.name + ". Nhân viên sẽ sớm gọi lại cho bạn.");
        this.reset();
    });

    window.changeQty = function(delta) {
        const input = document.getElementById('qty-input');
        let val = parseInt(input.value) + delta;
        if(val < 1) val = 1;
        input.value = val;
    };

    window.addCurrentToCart = function(id) {
        const qty = parseInt(document.getElementById('qty-input').value) || 1;
        addToCart(id, qty);
    };

    window.buyNow = function(id) {
        const qty = parseInt(document.getElementById('qty-input').value) || 1;
        addToCart(id, qty, false); // false = đừng alert
        window.location.href = "cart.html";
    };

    if (product.specs) {
        const specsHtml = `
            <tr><th>Loại động cơ</th><td>${product.specs.engine_type}</td></tr>
            <tr><th>Dung tích xy-lanh</th><td>${product.specs.displacement}</td></tr>
            <tr><th>Công suất tối đa</th><td>${product.specs.max_power}</td></tr>
            <tr><th>Trọng lượng</th><td>${product.specs.weight}</td></tr>
        `;
        document.getElementById('specs-table').innerHTML = specsHtml;
    }
}

function createProductCardHTML(product) {
    const hasSale = product.sale_price && product.sale_price < product.price;
    const displayPrice = hasSale ? formatCurrency(product.sale_price) : formatCurrency(product.price);
    const oldPriceHTML = hasSale ? `<span class="text-muted text-decoration-line-through small ms-2">${formatCurrency(product.price)}</span>` : '';
    
    let badges = '';
    if (product.is_new) badges += `<span class="badge bg-primary-moto shadow-sm">Mới</span>`;
    if (hasSale) {
        const percent = Math.round((1 - product.sale_price / product.price) * 100);
        badges += `<span class="badge bg-danger shadow-sm mt-1">-${percent}%</span>`;
    }

    return `
    <div class="col-lg-3 col-md-6 col-6 mb-4">
        <div class="product-card h-100">
            <div class="product-img-wrapper">
                <div class="product-badges">${badges}</div>
                <div class="product-actions d-none d-md-flex flex-column gap-2">
                    <button class="action-btn" onclick="addToCart(${product.id})" title="Thêm vào giỏ hàng">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    <a href="product-detail.html?id=${product.id}" class="action-btn" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </a>
                </div>
                <a href="product-detail.html?id=${product.id}">
                    <img src="${fixImageUrl(product.image)}" loading="lazy" alt="${product.name}">
                </a>
            </div>
            <div class="p-3 d-flex flex-column flex-grow-1">
                <span class="text-muted small mb-1">${product.brand}</span>
                <h5 class="fw-bold mb-2 fs-6">
                    <a href="product-detail.html?id=${product.id}" class="text-dark text-decoration-none hover-primary text-truncate-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${product.name}</a>
                </h5>
                <div class="mt-auto pt-2 border-top">
                    <span class="text-primary-moto fw-bold fs-6">${displayPrice}</span><br>
                    ${oldPriceHTML}
                </div>
                <button class="btn btn-outline-dark btn-sm mt-2 w-100 d-md-none rounded-pill" onclick="addToCart(${product.id})">Thêm vào giỏ</button>
            </div>
        </div>
    </div>
    `;
}

// Xử lý Giỏ hàng (Global)
function addToCart(productId, quantity = 1, alertUser = true) {
    if(productsData.length === 0) return;

    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.product.id === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ product, quantity });
    }
    
    localStorage.setItem('motoshop_cart', JSON.stringify(cart));
    updateCartIconCount();
    
    if(alertUser) alert(`Đã thêm ${product.name} vào giỏ hàng!`);
}

function updateCartIconCount() {
    const countSpans = document.querySelectorAll('#cart-count');
    if (countSpans.length > 0) {
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        countSpans.forEach(span => {
            span.textContent = total;
            if(total > 0) {
                span.style.transform = "scale(1.2)";
                setTimeout(() => { span.style.transform = "scale(1)"; }, 200);
            }
        });
    }
}


// ============== TRANG GIỎ HÀNG (CART) ==============
function renderCartPage() {
    const container = document.getElementById('cart-items-container');
    const emptyView = document.getElementById('empty-cart-view');
    const cartView = document.getElementById('cart-view-container');
    
    if (cart.length === 0) {
        emptyView.classList.remove('d-none');
        cartView.classList.add('d-none');
        return;
    }
    
    emptyView.classList.add('d-none');
    cartView.classList.remove('d-none');

    let html = '';
    let totalValue = 0;

    cart.forEach(item => {
        const p = item.product;
        const finalPrice = p.sale_price ? p.sale_price : p.price;
        const subTotal = finalPrice * item.quantity;
        totalValue += subTotal;

        html += `
            <tr class="border-bottom">
                <td class="py-3">
                    <div class="d-flex align-items-center">
                        <img src="${fixImageUrl(p.image)}" alt="${p.name}" class="rounded" style="width: 80px; height: 60px; object-fit: cover;">
                        <div class="ms-3">
                            <h6 class="fw-bold mb-1"><a href="product-detail.html?id=${p.id}" class="text-dark text-decoration-none">${p.name}</a></h6>
                            <span class="text-muted small">Mã SP: ${p.id}</span>
                        </div>
                    </div>
                </td>
                <td class="py-3 text-center fw-medium">${formatCurrency(finalPrice)}</td>
                <td class="py-3 text-center">
                    <div class="input-group input-group-sm mx-auto" style="width: 100px;">
                        <button class="btn btn-outline-secondary" onclick="updateCartQty(${p.id}, -1)">-</button>
                        <input type="text" class="form-control text-center bg-white px-0" value="${item.quantity}" readonly>
                        <button class="btn btn-outline-secondary" onclick="updateCartQty(${p.id}, 1)">+</button>
                    </div>
                </td>
                <td class="py-3 text-end fw-bold text-dark">${formatCurrency(subTotal)}</td>
                <td class="py-3 text-end">
                    <button class="btn text-danger bg-light rounded-circle" onclick="removeCartItem(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    container.innerHTML = html;
    
    document.getElementById('cart-total-tmp').textContent = formatCurrency(totalValue);
    document.getElementById('cart-total-final').textContent = formatCurrency(totalValue);
}

window.updateCartQty = function(id, delta) {
    const item = cart.find(i => i.product.id === id);
    if(item) {
        item.quantity += delta;
        if(item.quantity <= 0) {
            removeCartItem(id);
        } else {
            localStorage.setItem('motoshop_cart', JSON.stringify(cart));
            updateCartIconCount();
            renderCartPage();
        }
    }
};

window.removeCartItem = function(id) {
    cart = cart.filter(i => i.product.id !== id);
    localStorage.setItem('motoshop_cart', JSON.stringify(cart));
    updateCartIconCount();
    renderCartPage();
};

window.handleCheckout = async function(e) {
    e.preventDefault();
    if(cart.length === 0) return;
    
    const name = document.getElementById('co_name').value;
    const phone = document.getElementById('co_phone').value;
    const address = document.getElementById('co_address').value;
    const note = document.getElementById('co_note').value;
    const btn = document.getElementById('btn-checkout');
    
    // Đổi UI Load
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang xử lý...';

    // Đẩy dữ liệu lên PHP API
    try {
        const res = await fetch('api/place_order.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer: { name, phone, address, note },
                cart: cart
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert(`Cảm ơn ${name}! MotoShop đã nhận được đơn đặt hàng của bạn. (Mã đơn: #${data.order_id}). Chúng tôi sẽ liên hệ sớm nhất để tư vấn.`);
            cart = [];
            localStorage.removeItem('motoshop_cart');
            updateCartIconCount();
            window.location.href = "index.html"; 
        } else {
            alert("Đã xảy ra lỗi hệ thống: " + data.message);
            btn.disabled = false;
            btn.innerHTML = 'Xác Nhận Đặt Hàng';
        }
    } catch (err) {
        alert("Lỗi kết nối tới Server. Hãy chắc chắn Server PHP đang chạy!");
        btn.disabled = false;
        btn.innerHTML = 'Xác Nhận Đặt Hàng';
    }
};


// ============== HỆ THỐNG USER AUTH ==============

/**
 * Khởi tạo trạng thái đăng nhập user trên navbar.
 * Tìm phần tử #user-auth-area và cập nhật UI theo trạng thái.
 */
function initUserAuth() {
    const authArea = document.getElementById('user-auth-area');
    if (!authArea) return;

    const userData = localStorage.getItem('motoshop_user');

    if (userData) {
        const user = JSON.parse(userData);
        const initials = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

        authArea.innerHTML = `
            <div class="position-relative user-dropdown-toggle" id="userDropdownToggle">
                <div class="head-icon-btn user-logged-in-icon d-flex align-items-center justify-content-center" 
                     style="width:40px;height:40px;border-radius:50%;cursor:pointer;" title="${user.full_name}">
                    ${initials}
                </div>
                <div class="user-dropdown-menu" id="userDropdownMenu">
                    <div class="user-dropdown-header">
                        <div class="user-name">${user.full_name}</div>
                        <div class="user-phone">${user.phone || user.email || ''}</div>
                        ${user.address ? `<div class="user-phone" style="margin-top:4px;"><i class="fas fa-map-marker-alt me-1" style="font-size:0.7rem;"></i>${user.address}</div>` : ''}
                    </div>
                    <a href="#"><i class="fas fa-user"></i> Tài khoản</a>
                    <a href="#"><i class="fas fa-box"></i> Đơn hàng</a>
                    ${(user.role === 'admin' || user.role === 'staff') ? '<a href="admin/index.html"><i class="fas fa-cogs"></i> Quản lý Admin</a>' : ''}
                    <div class="divider"></div>
                    <button class="logout-btn" onclick="logoutUser()"><i class="fas fa-sign-out-alt"></i> Đăng xuất</button>
                </div>
            </div>
        `;

        // Toggle dropdown
        const toggle = document.getElementById('userDropdownToggle');
        const menu = document.getElementById('userDropdownMenu');
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            menu.classList.toggle('show');
        });

        // Đóng dropdown khi click ngoài
        document.addEventListener('click', function() {
            menu.classList.remove('show');
        });

        // Auto-fill checkout form nếu đang ở trang cart
        const coName = document.getElementById('co_name');
        const coPhone = document.getElementById('co_phone');
        const coAddress = document.getElementById('co_address');
        if (coName && !coName.value) coName.value = user.full_name || '';
        if (coPhone && !coPhone.value) coPhone.value = user.phone || '';
        if (coAddress && !coAddress.value) coAddress.value = user.address || '';

    } else {
        // Chưa đăng nhập: hiển thị nút đăng nhập/đăng ký
        authArea.innerHTML = `
            <div class="position-relative user-dropdown-toggle" id="userDropdownToggle">
                <div class="head-icon-btn d-flex align-items-center justify-content-center" 
                     style="width:40px;height:40px;border-radius:50%;cursor:pointer;">
                    <i class="far fa-user"></i>
                </div>
                <div class="user-dropdown-menu" id="userDropdownMenu">
                    <a href="login.html"><i class="fas fa-sign-in-alt"></i> Đăng nhập</a>
                    <a href="register.html"><i class="fas fa-user-plus"></i> Đăng ký</a>
                </div>
            </div>
        `;

        const toggle = document.getElementById('userDropdownToggle');
        const menu = document.getElementById('userDropdownMenu');
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            menu.classList.toggle('show');
        });
        document.addEventListener('click', function() {
            menu.classList.remove('show');
        });
    }
}

window.logoutUser = function() {
    localStorage.removeItem('motoshop_user');
    window.location.reload();
};

