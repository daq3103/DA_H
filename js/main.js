/**
 * Main JavaScript cho MotoShop
 * Xử lý giao diện, giỏ hàng local, và render sản phẩm
 */

const { formatCurrency, fixImageUrlForStore: fixImageUrl } = window.MotoShared || {};

if (typeof formatCurrency !== 'function' || typeof fixImageUrl !== 'function') {
    throw new Error('MotoShared chưa được tải. Vui lòng include js/shared/moto-shared.js trước js/main.js');
}

// ============== TOAST NOTIFICATION SYSTEM ==============
function showToast(message, type = 'success', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-check',
        error: 'fa-times',
        warning: 'fa-exclamation',
        info: 'fa-info'
    };
    const titles = {
        success: 'Thành công',
        error: 'Lỗi',
        warning: 'Cảnh báo',
        info: 'Thông báo'
    };

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.style.position = 'relative';
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
        <div class="toast-content">
            <strong>${titles[type]}</strong>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.classList.add('toast-out');setTimeout(()=>this.parentElement.remove(),300)">
            <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============== SEARCH FUNCTIONALITY ==============
function initSearch() {
    const searchForms = document.querySelectorAll('form:has(input[type="search"])');
    searchForms.forEach(form => {
        const input = form.querySelector('input[type="search"]');
        if (!input) return;

        // Make form position relative for suggestions
        form.style.position = 'relative';

        // Create suggestions dropdown
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'search-suggestions';
        form.appendChild(suggestionsDiv);

        // Handle form submit -> redirect to products page
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = input.value.trim();
            if (query) {
                window.location.href = `products.html?search=${encodeURIComponent(query)}`;
            }
        });

        // Handle input for realtime suggestions
        let debounceTimer;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = input.value.trim().toLowerCase();
            
            if (query.length < 2 || productsData.length === 0) {
                suggestionsDiv.classList.remove('show');
                return;
            }

            debounceTimer = setTimeout(() => {
                const results = productsData.filter(p =>
                    p.name.toLowerCase().includes(query) ||
                    p.brand.toLowerCase().includes(query) ||
                    p.category.toLowerCase().includes(query)
                ).slice(0, 5);

                if (results.length === 0) {
                    suggestionsDiv.innerHTML = `<div class="search-no-result"><i class="fas fa-search me-2"></i>Không tìm thấy "${input.value.trim()}"</div>`;
                } else {
                    suggestionsDiv.innerHTML = results.map(p => {
                        const price = p.sale_price || p.price;
                        return `
                            <a href="product-detail.html?id=${p.id}" class="search-suggestion-item">
                                <img src="${fixImageUrl(p.image)}" alt="${p.name}">
                                <div class="suggestion-info">
                                    <div class="suggestion-name">${p.name}</div>
                                    <div class="suggestion-price">${formatCurrency(price)}</div>
                                </div>
                            </a>`;
                    }).join('') + `<a href="products.html?search=${encodeURIComponent(input.value.trim())}" class="search-suggestion-item" style="justify-content:center;color:var(--moto-primary);font-weight:600;">
                        Xem tất cả kết quả <i class="fas fa-arrow-right ms-2"></i>
                    </a>`;
                }
                suggestionsDiv.classList.add('show');
            }, 250);
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!form.contains(e.target)) suggestionsDiv.classList.remove('show');
        });

        input.addEventListener('focus', () => {
            if (suggestionsDiv.innerHTML && input.value.trim().length >= 2) {
                suggestionsDiv.classList.add('show');
            }
        });
    });
}

// ============== PAGINATION ==============
const ITEMS_PER_PAGE = 8;
let currentPage = 1;
const PRODUCT_EMPTY_STATE_HTML = `<div class="col-12 text-center py-5"><h5 class="text-muted">Không tìm thấy sản phẩm phù hợp.</h5></div>`;

function renderPagination(totalItems, container) {
    const paginationNav = document.querySelector('.pagination');
    if (!paginationNav) return;

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) {
        paginationNav.closest('nav').style.display = 'none';
        return;
    }
    paginationNav.closest('nav').style.display = 'block';

    let html = `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link border-0 text-muted" href="#" data-page="${currentPage - 1}">Trang trước</a>
    </li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
            if (i === 3 || i === totalPages - 2) html += `<li class="page-item disabled"><span class="page-link border-0">...</span></li>`;
            continue;
        }
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link border-0 ${i === currentPage ? 'bg-primary-moto text-white' : 'text-dark'}" href="#" data-page="${i}">${i}</a>
        </li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link border-0 text-muted" href="#" data-page="${currentPage + 1}">Trang sau</a>
    </li>`;

    paginationNav.innerHTML = html;

    paginationNav.querySelectorAll('a[data-page]').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(a.dataset.page);
            if (page >= 1 && page <= totalPages && page !== currentPage) {
                currentPage = page;
                if (typeof applyFiltersAndRender === 'function') applyFiltersAndRender();
                window.scrollTo({ top: 300, behavior: 'smooth' });
            }
        });
    });
}

function paginateArray(arr) {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return arr.slice(start, start + ITEMS_PER_PAGE);
}

// State chung
let cart = JSON.parse(localStorage.getItem('motoshop_cart')) || [];
let productsData = [];

function filterProductsByKeyword(products, keyword) {
    if (!keyword) return [...products];
    const q = keyword.toLowerCase();
    return products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
}

function renderProductsGridState(productsGrid, products) {
    if (!productsGrid) return;
    if (products.length === 0) {
        productsGrid.innerHTML = PRODUCT_EMPTY_STATE_HTML;
        return;
    }
    productsGrid.innerHTML = products.map(p => createProductCardHTML(p)).join('');
}

function getProductsPageParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        filterBrand: params.get('brand'),
        filterCategory: params.get('category'),
        searchQuery: params.get('search')
    };
}

// Init storefront (được gọi từ main-bootstrap.js)
window.motoInitStorefront = async function() {
    updateCartIconCount();
    initUserAuth();

    // Hiện toast đặt hàng thành công (nếu vừa redirect từ cart)
    const orderMsg = sessionStorage.getItem('motoshop_order_success');
    if (orderMsg) {
        sessionStorage.removeItem('motoshop_order_success');
        setTimeout(() => showToast(orderMsg, 'success', 5000), 500);
    }

    // Dùng FETCH qua API PHP trên XAMPP (khắc phục lỗi CORS từ file:// trước đó)
    try {
        const response = await fetch('api/get_products.php');
        if (response.ok) {
            productsData = await response.json();
            
            if (productsData.error) {
                console.error("Lỗi từ DB: ", productsData.message);
                return;
            }

            // Init search sau khi có data
            initSearch();

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
};

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

    const { filterBrand, filterCategory, searchQuery } = getProductsPageParams();

    let filtered = [...productsData];

    // Search keyword filter
    if (searchQuery) {        
        filtered = filterProductsByKeyword(filtered, searchQuery);
        // Show search info
        const headerTitle = document.querySelector('.display-4');
        if (headerTitle) headerTitle.textContent = `Kết quả tìm kiếm: "${searchQuery}"`;
    }

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

    countSpan.textContent = filtered.length;
    renderPagination(filtered.length);
    const pageItems = paginateArray(filtered);
    renderProductsGridState(productsGrid, pageItems);
}

// Global reference for pagination callback
let _lastFilteredProducts = [];

function applyFiltersAndRender() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    
    const countSpan = document.getElementById('product-count');
    countSpan.textContent = _lastFilteredProducts.length;
    renderPagination(_lastFilteredProducts.length);
    const pageItems = paginateArray(_lastFilteredProducts);
    renderProductsGridState(productsGrid, pageItems);
}

function initFilters() {
    const brands = document.querySelectorAll('.filter-brand');
    const categories = document.querySelectorAll('.filter-category');
    const prices = document.querySelectorAll('.filter-price');
    const resetBtn = document.getElementById('reset-filters');
    const sortSelect = document.getElementById('sort-select');

    const updateFilters = () => {
        const { searchQuery } = getProductsPageParams();
        let filtered = filterProductsByKeyword(productsData, searchQuery);

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

        currentPage = 1;
        _lastFilteredProducts = filtered;
        applyFiltersAndRender();
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
        currentPage = 1;
        _lastFilteredProducts = [...productsData];
        applyFiltersAndRender();
    });

    // Initialize _lastFilteredProducts
    _lastFilteredProducts = [...productsData];
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
    
    if(alertUser) showToast(`Đã thêm <b>${product.name}</b> vào giỏ hàng!`, 'success');
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

    // Tính giảm giá coupon
    const discountRow = document.getElementById('discount-row');
    const discountEl = document.getElementById('cart-discount');
    let finalTotal = totalValue;
    
    if (activeCoupon && activeCoupon.discount_amount) {
        // Re-calculate discount based on current total
        let discountAmt = 0;
        if (activeCoupon.discount_type === 'percent') {
            discountAmt = totalValue * (activeCoupon.discount_value / 100);
            if (activeCoupon.max_discount && discountAmt > activeCoupon.max_discount) {
                discountAmt = activeCoupon.max_discount;
            }
        } else {
            discountAmt = activeCoupon.discount_value;
        }
        if (discountAmt > totalValue) discountAmt = totalValue;
        activeCoupon.discount_amount = discountAmt;
        
        if (discountRow) { discountRow.classList.remove('d-none'); }
        if (discountEl) { discountEl.textContent = '- ' + formatCurrency(discountAmt); }
        finalTotal = totalValue - discountAmt;
    } else {
        if (discountRow) { discountRow.classList.add('d-none'); }
    }

    document.getElementById('cart-total-final').textContent = formatCurrency(finalTotal);
}

// ============== COUPON SYSTEM ==============
let activeCoupon = null;

window.applyCoupon = async function() {
    const input = document.getElementById('coupon-input');
    const msgEl = document.getElementById('coupon-message');
    const appliedEl = document.getElementById('coupon-applied');
    const btn = document.getElementById('btn-apply-coupon');
    const code = input.value.trim().toUpperCase();

    if (!code) {
        msgEl.style.display = 'block';
        msgEl.innerHTML = '<span class="text-warning"><i class="fas fa-exclamation-triangle me-1"></i>Vui lòng nhập mã giảm giá</span>';
        return;
    }

    // Tính tổng giỏ hàng hiện tại
    let orderTotal = 0;
    cart.forEach(item => {
        const p = item.product;
        orderTotal += (p.sale_price || p.price) * item.quantity;
    });

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        const res = await fetch('api/coupon.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, order_total: orderTotal })
        });
        const data = await res.json();

        if (data.success) {
            activeCoupon = data.coupon;
            // Hiện coupon applied
            appliedEl.classList.remove('d-none');
            document.getElementById('coupon-code-display').textContent = data.coupon.code;
            document.getElementById('coupon-desc-display').textContent = '- ' + data.coupon.description;
            input.disabled = true;
            btn.style.display = 'none';
            msgEl.style.display = 'none';
            showToast(`Áp dụng mã <b>${data.coupon.code}</b> thành công! Giảm ${formatCurrency(data.coupon.discount_amount)}`, 'success');
            renderCartPage(); // Re-render để cập nhật giá
        } else {
            msgEl.style.display = 'block';
            msgEl.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle me-1"></i>${data.message}</span>`;
            activeCoupon = null;
        }
    } catch (err) {
        msgEl.style.display = 'block';
        msgEl.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle me-1"></i>Lỗi kết nối Server!</span>';
    }

    btn.disabled = false;
    btn.innerHTML = 'Áp dụng';
};

window.removeCoupon = function() {
    activeCoupon = null;
    const input = document.getElementById('coupon-input');
    const appliedEl = document.getElementById('coupon-applied');
    const btn = document.getElementById('btn-apply-coupon');
    
    input.disabled = false;
    input.value = '';
    btn.style.display = 'block';
    appliedEl.classList.add('d-none');
    document.getElementById('coupon-message').style.display = 'none';
    showToast('Đã xóa mã giảm giá', 'info');
    renderCartPage();
};

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
                cart: cart,
                coupon_code: activeCoupon ? activeCoupon.code : null,
                discount_amount: activeCoupon ? activeCoupon.discount_amount : 0
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            cart = [];
            activeCoupon = null;
            localStorage.removeItem('motoshop_cart');
            updateCartIconCount();
            // Lưu thông báo để hiện ở trang chủ
            sessionStorage.setItem('motoshop_order_success', `Cảm ơn ${name}! Đơn hàng #${data.order_code || data.order_id} đã được tiếp nhận.`);
            window.location.href = "index.html"; 
        } else {
            showToast("Đã xảy ra lỗi: " + data.message, 'error');
            btn.disabled = false;
            btn.innerHTML = 'Xác Nhận Đặt Hàng';
        }
    } catch (err) {
        showToast("Lỗi kết nối tới Server. Hãy chắc chắn XAMPP đang chạy!", 'error');
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
                    <a href="profile.html"><i class="fas fa-user"></i> Tài khoản</a>
                    <a href="my-orders.html"><i class="fas fa-box"></i> Đơn hàng</a>
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

