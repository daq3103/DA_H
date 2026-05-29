/**
 * Main JavaScript cho motoShop
 * Xử lý giao diện, giỏ hàng local, và render sản phẩm
 */

const { formatCurrency, fixImageUrlForStore: fixImageUrl, escapeHTML } = window.motoShared || {};

if (typeof formatCurrency !== 'function' || typeof fixImageUrl !== 'function' || typeof escapeHTML !== 'function') {
    throw new Error('motoShared chưa được tải. Vui lòng include js/shared/moto-shared.js trước js/main.js');
}

/** Hiển thị mô tả nhiều dòng (an toàn XSS) */
function formatProductDescription(text) {
    if (!text || !String(text).trim()) return '';
    return escapeHTML(String(text).trim()).replace(/\n/g, '<br>');
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
function normalizeSearchQuery(keyword) {
    return (keyword || '').trim().toLowerCase();
}

function matchCategoryByKeyword(category, q) {
    if (!q || !category) return false;
    const name = (category.name || '').toLowerCase();
    const slug = (category.slug || '').toLowerCase();
    const desc = (category.description || '').toLowerCase();
    const qAsSlug = q.replace(/\s+/g, '-');
    return name.includes(q) || slug.includes(q) || slug.includes(qAsSlug) || desc.includes(q);
}

function getCategorySlugsMatchingKeyword(keyword) {
    const q = normalizeSearchQuery(keyword);
    if (!q) return [];
    return categoriesData
        .filter(c => matchCategoryByKeyword(c, q))
        .map(c => (c.slug || '').toLowerCase());
}

function matchBrandByKeyword(brand, q) {
    if (!q || !brand) return false;
    const name = (brand.name || '').toLowerCase();
    const slug = (brand.slug || '').toLowerCase();
    const desc = (brand.description || '').toLowerCase();
    const qAsSlug = q.replace(/\s+/g, '-');
    return name.includes(q) || slug.includes(q) || slug.includes(qAsSlug) || desc.includes(q);
}

function getBrandSlugsMatchingKeyword(keyword) {
    const q = normalizeSearchQuery(keyword);
    if (!q) return [];
    return brandsData
        .filter(b => matchBrandByKeyword(b, q))
        .map(b => (b.slug || '').toLowerCase());
}

function productMatchesBrandFilter(product, filterVal) {
    const f = (filterVal || '').toLowerCase();
    if (!f) return true;
    return (product.brand_slug || '').toLowerCase() === f ||
        (product.brand || '').toLowerCase() === f;
}

function productMatchesKeyword(product, q, matchedCategorySlugs) {
    if (!q) return true;
    if ((product.name || '').toLowerCase().includes(q)) return true;
    if ((product.brand || '').toLowerCase().includes(q)) return true;
    if ((product.category || '').toLowerCase().includes(q)) return true;
    if ((product.category_slug || '').toLowerCase().includes(q)) return true;
    if ((product.slug || '').toLowerCase().includes(q)) return true;
    const pSlug = (product.category_slug || '').toLowerCase();
    if (matchedCategorySlugs.length && matchedCategorySlugs.includes(pSlug)) return true;
    const matchedBrandSlugs = getBrandSlugsMatchingKeyword(keyword);
    const bSlug = (product.brand_slug || '').toLowerCase();
    if (matchedBrandSlugs.length && matchedBrandSlugs.includes(bSlug)) return true;
    return false;
}

function findCategoriesByKeyword(keyword, limit = 4) {
    const q = normalizeSearchQuery(keyword);
    if (!q) return [];
    return categoriesData.filter(c => matchCategoryByKeyword(c, q)).slice(0, limit);
}

function findBrandsByKeyword(keyword, limit = 4) {
    const q = normalizeSearchQuery(keyword);
    if (!q) return [];
    return brandsData.filter(b => matchBrandByKeyword(b, q)).slice(0, limit);
}

function findProductsByKeyword(keyword, limit = 5) {
    const q = normalizeSearchQuery(keyword);
    if (!q) return [];
    const matchedSlugs = getCategorySlugsMatchingKeyword(keyword);
    return productsData.filter(p => productMatchesKeyword(p, q, matchedSlugs)).slice(0, limit);
}

function renderCategorySuggestionItem(category) {
    return `
        <a href="products.html?category=${encodeURIComponent(category.slug)}" class="search-suggestion-item search-suggestion-category">
            <span class="search-suggestion-icon"><i class="fas fa-tags"></i></span>
            <div class="suggestion-info">
                <div class="suggestion-name">Danh mục: ${escapeHTML(category.name)}</div>
                <div class="suggestion-meta">Xem tất cả xe trong danh mục</div>
            </div>
        </a>`;
}

function renderBrandSuggestionItem(brand) {
    return `
        <a href="products.html?brand=${encodeURIComponent(brand.slug)}" class="search-suggestion-item search-suggestion-category">
            <span class="search-suggestion-icon"><i class="fas fa-industry"></i></span>
            <div class="suggestion-info">
                <div class="suggestion-name">Hãng: ${escapeHTML(brand.name)}</div>
                <div class="suggestion-meta">Xem tất cả xe của hãng</div>
            </div>
        </a>`;
}

function renderSearchSuggestionsHtml(keyword) {
    const trimmed = keyword.trim();
    const categories = findCategoriesByKeyword(trimmed);
    const brands = findBrandsByKeyword(trimmed);
    const products = findProductsByKeyword(trimmed);

    if (categories.length === 0 && brands.length === 0 && products.length === 0) {
        return `<div class="search-no-result"><i class="fas fa-search me-2"></i>Không tìm thấy "${escapeHTML(trimmed)}"</div>`;
    }

    let html = '';
    if (brands.length) {
        html += `<div class="search-suggestions-label">Hãng xe</div>${brands.map(renderBrandSuggestionItem).join('')}`;
    }
    if (categories.length) {
        html += `<div class="search-suggestions-label">Danh mục</div>${categories.map(renderCategorySuggestionItem).join('')}`;
    }
    if (products.length) {
        if (categories.length || brands.length) html += `<div class="search-suggestions-label">Sản phẩm</div>`;
        html += products.map(p => {
            const price = p.sale_price || p.price;
            return `
                <a href="product-detail.html?id=${p.id}" class="search-suggestion-item">
                    <img src="${fixImageUrl(p.image)}" alt="${escapeHTML(p.name)}">
                    <div class="suggestion-info">
                        <div class="suggestion-name">${escapeHTML(p.name)}</div>
                        <div class="suggestion-price">${formatCurrency(price)}</div>
                    </div>
                </a>`;
        }).join('');
    }
    html += `<a href="products.html?search=${encodeURIComponent(trimmed)}" class="search-suggestion-item search-suggestion-view-all">
        Xem tất cả kết quả <i class="fas fa-arrow-right ms-2"></i>
    </a>`;
    return html;
}

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
            const query = input.value.trim();
            
            if (query.length < 2) {
                suggestionsDiv.classList.remove('show');
                return;
            }

            debounceTimer = setTimeout(() => {
                suggestionsDiv.innerHTML = renderSearchSuggestionsHtml(query);
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

// State chung — giỏ hàng lưu riêng theo từng user
let cart = [];
let productsData = [];
let categoriesData = [];
let brandsData = [];

function getCartStorageKey() {
    const user = getLoggedInUser();
    return user ? `motoshop_cart_user_${user.id}` : null;
}

function loadCartFromStorage() {
    const key = getCartStorageKey();
    if (!key) {
        cart = [];
        return;
    }
    try {
        cart = JSON.parse(localStorage.getItem(key)) || [];
    } catch {
        cart = [];
    }
}

function saveCartToStorage() {
    const key = getCartStorageKey();
    if (!key) return;
    if (cart.length === 0) {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, JSON.stringify(cart));
    }
}

function clearCartForCurrentUser() {
    cart = [];
    const key = getCartStorageKey();
    if (key) localStorage.removeItem(key);
    updateCartIconCount();
}

/** Mỗi user có giỏ riêng; đăng xuất / đổi tài khoản không dùng chung giỏ cũ */
function initCartForCurrentUser() {
    loadCartFromStorage();
    updateCartIconCount();
    if (document.getElementById('cart-items-container')) {
        renderCartPage();
    }
}

function normalizeProductId(id) {
    return parseInt(id, 10);
}

function findProductById(id) {
    const pid = normalizeProductId(id);
    return productsData.find(p => p.id === pid);
}

function getCartQty(productId) {
    const pid = normalizeProductId(productId);
    const item = cart.find(i => normalizeProductId(i.product.id) === pid);
    return item ? item.quantity : 0;
}

/** Tồn kho an toàn — tránh undefined khiến so sánh sai (3 > undefined = false) */
function getProductStock(product) {
    const n = parseInt(product?.stock_quantity, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function canAddQuantity(productId, quantity) {
    const product = findProductById(productId);
    if (!product) {
        return { ok: false, message: 'Không tìm thấy sản phẩm', stock: 0 };
    }
    const stock = getProductStock(product);
    const inCart = getCartQty(productId);
    if (stock <= 0) {
        return { ok: false, message: 'Sản phẩm đã hết hàng', stock: 0 };
    }
    if (inCart + quantity > stock) {
        const canAdd = stock - inCart;
        if (canAdd <= 0) {
            return { ok: false, message: `Giỏ đã có ${inCart}/${stock} chiếc — không thể thêm thêm!`, stock };
        }
        return { ok: false, message: `Chỉ được chọn tối đa ${canAdd} chiếc (kho còn ${stock}, giỏ đã có ${inCart})!`, stock };
    }
    return { ok: true, stock };
}

async function syncProductStockFromServer(productId) {
    const pid = normalizeProductId(productId);
    try {
        const res = await fetch('api/check_stock.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: pid, quantity: 1 }] })
        });
        const data = await res.json();
        const info = (data.items || []).find(i => normalizeProductId(i.id) === pid);
        if (info) {
            const p = findProductById(pid);
            if (p) p.stock_quantity = info.stock_quantity;
            updateProductStockHint(info.stock_quantity);
        }
    } catch (_) { /* dùng dữ liệu local nếu API lỗi */ }
}

function updateProductStockHint(stock) {
    const hint = document.getElementById('stock-hint');
    if (!hint) return;
    if (stock <= 0) {
        hint.innerHTML = '<i class="fas fa-box me-1"></i><span class="text-danger fw-medium">Hết hàng</span>';
    } else {
        hint.innerHTML = `<i class="fas fa-box me-1"></i>Còn <strong>${stock}</strong> chiếc trong kho`;
    }
}

function filterProductsByKeyword(products, keyword) {
    if (!keyword) return [...products];
    const q = normalizeSearchQuery(keyword);
    const matchedSlugs = getCategorySlugsMatchingKeyword(keyword);
    return products.filter(p => productMatchesKeyword(p, q, matchedSlugs));
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

async function fetchCategories() {
    try {
        const res = await fetch('api/get_categories.php');
        if (!res.ok) return;
        const data = await res.json();
        if (data.error) return;
        categoriesData = Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn('Không tải được danh mục:', e);
    }
}

async function fetchBrands() {
    try {
        const res = await fetch('api/get_brands.php');
        if (!res.ok) return;
        const data = await res.json();
        if (data.error) return;
        brandsData = Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn('Không tải được hãng xe:', e);
    }
}

function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    if (!categoriesData.length) {
        container.innerHTML = '<p class="text-muted small mb-0">Chưa có danh mục</p>';
        return;
    }
    container.innerHTML = categoriesData.map(c => `
        <div class="form-check mb-2">
            <input class="form-check-input filter-category" type="checkbox" value="${escapeHTML(c.name)}" data-slug="${escapeHTML(c.slug)}" id="cat-filter-${c.id}">
            <label class="form-check-label text-muted" for="cat-filter-${c.id}">${escapeHTML(c.name)}</label>
        </div>
    `).join('');
}

function renderNavCategories() {
    const placeholder = document.getElementById('nav-category-items');
    if (!placeholder || !categoriesData.length) {
        if (placeholder) placeholder.remove();
        return;
    }
    placeholder.outerHTML = categoriesData.map(c =>
        `<li><a class="dropdown-item py-2" href="products.html?category=${encodeURIComponent(c.slug)}">${escapeHTML(c.name)}</a></li>`
    ).join('');
}

function renderBrandFilters() {
    const container = document.getElementById('brand-filters');
    if (!container) return;
    if (!brandsData.length) {
        container.innerHTML = '<p class="text-muted small mb-0">Chưa có hãng xe</p>';
        return;
    }
    container.innerHTML = brandsData.map(b => `
        <div class="form-check mb-2">
            <input class="form-check-input filter-brand" type="checkbox" value="${escapeHTML(b.name)}" data-slug="${escapeHTML(b.slug)}" id="brand-filter-${b.id}">
            <label class="form-check-label text-muted" for="brand-filter-${b.id}">${escapeHTML(b.name)}</label>
        </div>
    `).join('');
}

function renderNavBrands() {
    const placeholder = document.getElementById('nav-brand-items');
    if (!placeholder || !brandsData.length) {
        if (placeholder) placeholder.remove();
        return;
    }
    placeholder.outerHTML = brandsData.map(b =>
        `<li><a class="dropdown-item py-2" href="products.html?brand=${encodeURIComponent(b.slug)}">${escapeHTML(b.name)}</a></li>`
    ).join('');
}

function showProductsLoadError(message) {
    const detail = message || 'Không tải được sản phẩm từ server.';
    const html = `
        <div class="col-12 text-center py-5">
            <div class="alert alert-danger d-inline-block text-start" style="max-width: 520px;">
                <strong><i class="fas fa-database me-2"></i>Không hiển thị được sản phẩm</strong>
                <p class="mb-2 small mt-2">${escapeHTML(detail)}</p>
                <ul class="small mb-0 ps-3">
                    <li>Bật <strong>Apache</strong> và <strong>MySQL</strong> trong XAMPP</li>
                    <li>Mở site qua <code>http://localhost/shop/</code> (không mở file HTML trực tiếp)</li>
                    <li>Kiểm tra <a href="api/db_status.php" target="_blank" rel="noopener">api/db_status.php</a></li>
                    <li>Nếu DB trống: <a href="api/demo_seed.php" target="_blank" rel="noopener">api/demo_seed.php</a></li>
                </ul>
            </div>
        </div>`;
    document.querySelectorAll('#new-arrivals-container, #products-grid, #product-detail-container').forEach(el => {
        if (el) el.innerHTML = html;
    });
}

// Init storefront (được gọi từ main-bootstrap.js)
window.motoInitStorefront = async function() {
    if (!guardCartPage()) return;

    initCartForCurrentUser();
    initUserAuth();

    // Hiện toast đặt hàng thành công (nếu vừa redirect từ cart)
    const orderMsg = sessionStorage.getItem('motoshop_order_success');
    if (orderMsg) {
        sessionStorage.removeItem('motoshop_order_success');
        setTimeout(() => showToast(orderMsg, 'success', 5000), 500);
    }

    // Dùng FETCH qua API PHP trên XAMPP (khắc phục lỗi CORS từ file:// trước đó)
    try {
        const [productsRes] = await Promise.all([
            fetch('api/get_products.php'),
            fetchCategories(),
            fetchBrands()
        ]);
        const payload = await productsRes.json().catch(() => null);

        if (!productsRes.ok || !payload) {
            const errMsg = payload?.message || `HTTP ${productsRes.status}`;
            console.error('Lỗi API sản phẩm:', errMsg);
            showProductsLoadError(errMsg);
            return;
        }

        if (payload.error) {
            const errMsg = payload.message || String(payload.error);
            console.error('Lỗi từ DB:', errMsg);
            showProductsLoadError(errMsg);
            return;
        }

        if (!Array.isArray(payload)) {
            showProductsLoadError('Dữ liệu sản phẩm không hợp lệ.');
            return;
        }

        productsData = payload;

        if (productsData.length === 0) {
            showProductsLoadError('Database không có sản phẩm đang bán. Chạy demo_seed.php để nạp dữ liệu mẫu.');
            return;
        }

        renderCategoryFilters();
        renderBrandFilters();
        renderNavCategories();
        renderNavBrands();
        initSearch();

        if (document.getElementById('new-arrivals-container')) renderHomeProducts();
        if (document.getElementById('products-grid')) {
            renderProductsPage();
            initFilters();
        }
        if (document.getElementById('product-detail-container')) renderProductDetail();
        if (document.getElementById('cart-items-container')) {
            renderCartPage();
            initCheckoutPaymentUi();
            await syncCartStockFromServer();
        }
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu sản phẩm qua API:', error);
        showProductsLoadError('Không kết nối được API. Kiểm tra Apache/MySQL và URL localhost.');
    }
};

/** Sắp xếp sản phẩm: cập nhật mới nhất lên đầu */
function sortProductsByUpdatedDesc(products) {
    return [...products].sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at || 0).getTime();
        const tb = new Date(b.updated_at || b.created_at || 0).getTime();
        if (tb !== ta) return tb - ta;
        return (b.id || 0) - (a.id || 0);
    });
}

function renderHomeProducts() {
    const newArrivalsContainer = document.getElementById('new-arrivals-container');
    const hotSalesContainer = document.getElementById('hot-cars-container');

    if (!newArrivalsContainer || !hotSalesContainer) return;

    const newProducts = sortProductsByUpdatedDesc(productsData.filter(p => p.is_new)).slice(0, 4);
    const hotProducts = sortProductsByUpdatedDesc(productsData.filter(p => p.is_hot)).slice(0, 4);

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
        const f = filterBrand.toLowerCase();
        filtered = filtered.filter(p => productMatchesBrandFilter(p, f));
        document.querySelectorAll('.filter-brand').forEach(cb => {
            const slug = (cb.dataset.slug || '').toLowerCase();
            if (slug === f || cb.value.toLowerCase() === f) cb.checked = true;
        });
    }
    
    if (filterCategory) {
        const slug = filterCategory.toLowerCase();
        filtered = filtered.filter(p => {
            const pSlug = (p.category_slug || '').toLowerCase();
            if (pSlug === slug) return true;
            const nameSlug = (p.category || '').toLowerCase().replace(/\s+/g, '-');
            return nameSlug === slug || (p.category || '').toLowerCase().includes(slug.replace(/-/g, ' '));
        });
        document.querySelectorAll('.filter-category').forEach(cb => {
            if ((cb.dataset.slug || '').toLowerCase() === slug) cb.checked = true;
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
    const stock = getProductStock(product);

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
            
            <div class="mb-4 pb-3 border-bottom">
                <h6 class="fw-bold mb-3">Chính sách đặc quyền mua xe</h6>
                <ul class="list-unstyled text-muted lh-lg mb-0">
                    <li><i class="fas fa-check text-success me-2"></i>Bảo hành chính hãng 30.000km hoặc 3 năm.</li>
                    <li><i class="fas fa-check text-success me-2"></i>Tặng kèm: Mũ bảo hiểm, Áo mưa thiết kế cao cấp.</li>
                    <li><i class="fas fa-check text-success me-2"></i>Hỗ trợ trả góp lãi suất 0% qua thẻ tín dụng.</li>
                </ul>
                ${product.description && product.description.trim() ? '<p class="small text-muted mt-3 mb-0"><i class="fas fa-arrow-down me-1"></i>Xem mô tả chi tiết bên dưới.</p>' : ''}
            </div>
            
            <div class="d-flex flex-wrap align-items-center gap-3 mb-4">
                <div class="input-group" style="width: 130px;">
                    <button class="btn btn-outline-secondary border" type="button" onclick="changeQty(-1)"><i class="fas fa-minus"></i></button>
                    <input type="text" class="form-control text-center bg-white" id="qty-input" value="1" readonly>
                    <button class="btn btn-outline-secondary border" type="button" onclick="changeQty(1)"><i class="fas fa-plus"></i></button>
                </div>
                <span class="text-muted small" id="stock-hint"><i class="fas fa-box me-1"></i>Còn <strong>${stock}</strong> chiếc trong kho</span>
            </div>
            
            <div class="d-flex flex-column flex-sm-row gap-3 mt-4 pt-2">
                ${stock <= 0 ? 
                    `<button class="btn btn-secondary btn-lg rounded-pill w-100 fw-bold fs-5" disabled>ĐÃ HẾT HÀNG</button>` 
                    : 
                    `<button class="btn btn-outline-dark btn-lg rounded-pill px-4 fw-bold" onclick="addCurrentToCart(${product.id})">
                        <i class="fas fa-cart-plus me-2"></i> THÊM VÀO GIỎ
                    </button>
                    <button class="btn btn-moto-primary btn-lg rounded-pill flex-grow-1 fw-bold fs-5 shadow" onclick="buyNow(${product.id})">MUA NGAY</button>`
                }
            </div>
        </div>
    `;

    const detailProductId = product.id;

    window.changeQty = function(delta) {
        const input = document.getElementById('qty-input');
        const p = findProductById(detailProductId);
        const stock = getProductStock(p);
        let val = parseInt(input.value, 10) + delta;
        if (val < 1) val = 1;
        if (stock <= 0) {
            showToast('Sản phẩm đã hết hàng!', 'warning');
            input.value = 1;
            return;
        }
        const maxSelectable = Math.max(1, stock - getCartQty(detailProductId));
        if (val > maxSelectable) {
            showToast(
                getCartQty(detailProductId) > 0
                    ? `Kho còn ${stock} chiếc, giỏ đã có ${getCartQty(detailProductId)} — chỉ chọn thêm tối đa ${maxSelectable}!`
                    : `Chỉ còn ${stock} chiếc trong kho!`,
                'warning'
            );
            val = maxSelectable;
        }
        input.value = val;
    };

    window.addCurrentToCart = function(id) {
        const qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
        addToCart(id, qty);
    };

    window.buyNow = async function(id) {
        const pid = normalizeProductId(id);
        const qty = parseInt(document.getElementById('qty-input').value, 10) || 1;

        const validation = await validateBuyNow(pid, qty);

        if (!validation.ok) {
            if (validation.needLogin) {
                requireLogin(validation.message);
                return;
            }
            showToast(validation.message, 'warning');
            const input = document.getElementById('qty-input');
            const stock = parseInt(validation.stock, 10);
            if (input && Number.isFinite(stock) && stock > 0) {
                const maxSelectable = Math.max(1, stock - getCartQty(pid));
                input.value = Math.min(qty, maxSelectable);
            }
            return;
        }

        if (!addToCart(pid, qty, false, true)) {
            showToast('Không thể thêm sản phẩm vào giỏ. Vui lòng thử lại.', 'error');
            return;
        }

        showToast('Đã thêm vào giỏ. Chuyển tới trang thanh toán...', 'success', 2000);
        window.location.href = 'cart.html';
    };

    syncProductStockFromServer(detailProductId);

    const descSection = document.getElementById('product-description-section');
    const descEl = document.getElementById('product-description');
    if (product.description && product.description.trim() && descEl && descSection) {
        descEl.innerHTML = formatProductDescription(product.description);
        descSection.classList.remove('d-none');
    } else if (descSection) {
        descSection.classList.add('d-none');
    }

    const specsTable = document.getElementById('specs-table');
    if (specsTable && product.specs) {
        const hasSpecs = product.specs.engine_type || product.specs.displacement || product.specs.max_power || product.specs.weight;
        if (hasSpecs) {
            specsTable.innerHTML = `
                <tr><th>Loại động cơ</th><td>${escapeHTML(product.specs.engine_type || '—')}</td></tr>
                <tr><th>Dung tích xy-lanh</th><td>${escapeHTML(product.specs.displacement || '—')}</td></tr>
                <tr><th>Công suất tối đa</th><td>${escapeHTML(product.specs.max_power || '—')}</td></tr>
                <tr><th>Trọng lượng</th><td>${escapeHTML(product.specs.weight || '—')}</td></tr>
            `;
        } else {
            specsTable.innerHTML = '<tr><td class="text-muted">Chưa có thông số kỹ thuật</td></tr>';
        }
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

    const outOfStock = getProductStock(product) <= 0;
    const desktopCartBtn = outOfStock ? 
        `<button class="action-btn" disabled style="opacity:0.5;cursor:not-allowed;" title="Hết hàng"><i class="fas fa-shopping-cart"></i></button>` : 
        `<button class="action-btn" onclick="addToCart(${product.id})" title="Thêm vào giỏ hàng"><i class="fas fa-shopping-cart"></i></button>`;
        
    const mobileCartBtn = outOfStock ? 
        `<button class="btn btn-secondary btn-sm mt-2 w-100 d-md-none rounded-pill" disabled>Hết hàng</button>` : 
        `<button class="btn btn-outline-dark btn-sm mt-2 w-100 d-md-none rounded-pill" onclick="addToCart(${product.id})">Thêm vào giỏ</button>`;

    return `
    <div class="col-lg-3 col-md-6 col-6 mb-4">
        <div class="product-card h-100">
            <div class="product-img-wrapper">
                <div class="product-badges">${badges}</div>
                <div class="product-actions d-none d-md-flex flex-column gap-2">
                    ${desktopCartBtn}
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
                ${mobileCartBtn}
            </div>
        </div>
    </div>
    `;
}

// ============== YÊU CẦU ĐĂNG NHẬP KHI MUA HÀNG ==============

function getLoggedInUser() {
    try {
        const raw = localStorage.getItem('motoshop_user');
        if (!raw) return null;
        const user = JSON.parse(raw);
        return user && user.id ? user : null;
    } catch {
        return null;
    }
}

function requireLogin(message = 'Vui lòng đăng nhập để mua hàng!') {
    if (getLoggedInUser()) return true;
    showToast(message, 'warning');
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const qs = window.location.search || '';
    window.location.href = `login.html?redirect=${encodeURIComponent(page + qs)}`;
    return false;
}

function guardCartPage() {
    if (!document.getElementById('cart-items-container')) return true;
    if (getLoggedInUser()) return true;
    window.location.href = 'login.html?redirect=' + encodeURIComponent('cart.html');
    return false;
}

/**
 * Kiểm tra đủ điều kiện mua (tồn kho + đăng nhập + số lượng hợp lệ).
 * Chỉ khi trả về ok: true mới được chuyển sang cart.html.
 */
async function validateBuyNow(productId, quantity) {
    const pid = normalizeProductId(productId);
    const qty = parseInt(quantity, 10) || 0;

    if (qty < 1) {
        return { ok: false, message: 'Số lượng không hợp lệ.' };
    }

    if (!getLoggedInUser()) {
        return { ok: false, needLogin: true, message: 'Vui lòng đăng nhập để mua hàng!' };
    }

    if (productsData.length === 0) {
        return { ok: false, message: 'Đang tải dữ liệu sản phẩm, vui lòng thử lại.' };
    }

    const product = findProductById(pid);
    if (!product) {
        return { ok: false, message: 'Không tìm thấy sản phẩm.' };
    }

    const inCart = getCartQty(pid);
    const totalAfterBuy = inCart + qty;

    const stockData = await checkStockWithServer([{ id: pid, quantity: totalAfterBuy }]);
    if (!stockData.ok) {
        return {
            ok: false,
            message: stockData.message || 'Số lượng vượt quá tồn kho!',
            stock: (stockData.items || []).find(i => normalizeProductId(i.id) === pid)?.stock_quantity
        };
    }

    const check = canAddQuantity(pid, qty);
    if (!check.ok) {
        return { ok: false, message: check.message, stock: check.stock };
    }

    return { ok: true };
}

// Xử lý Giỏ hàng (Global)
function addToCart(productId, quantity = 1, alertUser = true, skipLoginCheck = false) {
    if (!skipLoginCheck && !requireLogin('Vui lòng đăng nhập để thêm sản phẩm vào giỏ!')) return false;
    if (productsData.length === 0) return false;

    const pid = normalizeProductId(productId);
    const product = findProductById(pid);
    if (!product) return false;

    const check = canAddQuantity(pid, quantity);
    if (!check.ok) {
        if (alertUser) showToast(check.message, 'warning');
        return false;
    }

    const existingItem = cart.find(item => normalizeProductId(item.product.id) === pid);

    if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.product.stock_quantity = product.stock_quantity;
    } else {
        cart.push({ product: { ...product }, quantity });
    }

    saveCartToStorage();
    updateCartIconCount();

    if (alertUser) showToast(`Đã thêm <b>${product.name}</b> vào giỏ hàng!`, 'success');
    return true;
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


// ============== KIỂM TRA TỒN KHO (đồng bộ với DB) ==============

/** Kiểm tra tồn kho thật từ DB — items: [{ id, quantity }] */
async function checkStockWithServer(items) {
    if (!items || items.length === 0) return { ok: true, items: [], problems: [] };

    try {
        const res = await fetch('api/check_stock.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: items.map(i => ({
                    id: normalizeProductId(i.id),
                    quantity: parseInt(i.quantity, 10) || 0
                }))
            })
        });
        const data = await res.json();

        (data.items || []).forEach(info => {
            const p = findProductById(info.id);
            if (p) p.stock_quantity = info.stock_quantity;
            const cartItem = cart.find(c => normalizeProductId(c.product.id) === normalizeProductId(info.id));
            if (cartItem) cartItem.product.stock_quantity = info.stock_quantity;
        });

        return data;
    } catch (e) {
        return { ok: false, message: 'Không kết nối được server để kiểm tra tồn kho.' };
    }
}

async function validateCartStock() {
    if (cart.length === 0) return { ok: true, items: [], problems: [] };
    return checkStockWithServer(
        cart.map(i => ({ id: i.product.id, quantity: i.quantity }))
    );
}

/** Cập nhật số lượng trong giỏ theo tồn kho mới nhất từ database */
async function syncCartStockFromServer() {
    if (cart.length === 0) return;

    const data = await validateCartStock();
    if (!data.items) return;

    let changed = false;

    if (!data.problems || data.problems.length === 0) return;

    data.problems.forEach(prob => {
        const probId = normalizeProductId(prob.id);
        const idx = cart.findIndex(c => normalizeProductId(c.product.id) === probId);
        if (idx === -1) return;

        if (prob.reason === 'insufficient' && prob.stock > 0) {
            cart[idx].quantity = prob.stock;
            changed = true;
        } else {
            cart.splice(idx, 1);
            changed = true;
        }
    });

    if (changed) {
        saveCartToStorage();
        updateCartIconCount();
        showToast(data.message || 'Giỏ hàng đã được cập nhật theo tồn kho.', 'warning');
        renderCartPage();
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
    const pid = normalizeProductId(id);
    const item = cart.find(i => normalizeProductId(i.product.id) === pid);
    if (item) {
        const product = findProductById(pid);
        const maxStock = getProductStock(product || item.product);

        if (delta > 0 && item.quantity + delta > maxStock) {
            showToast(`Kho chỉ còn ${maxStock} chiếc!`, 'warning');
            return;
        }

        item.quantity += delta;
        if(item.quantity <= 0) {
            removeCartItem(id);
        } else {
            saveCartToStorage();
            updateCartIconCount();
            renderCartPage();
        }
    }
};

window.removeCartItem = function(id) {
    const pid = normalizeProductId(id);
    cart = cart.filter(i => normalizeProductId(i.product.id) !== pid);
    saveCartToStorage();
    updateCartIconCount();
    renderCartPage();
};

/** Tính tổng tiền giỏ hàng (client) */
function getCartTotalAmount() {
    return cart.reduce((sum, item) => {
        const p = item.product;
        const price = p.sale_price ? p.sale_price : p.price;
        return sum + price * item.quantity;
    }, 0);
}

function getSelectedPaymentMethod() {
    const selected = document.querySelector('input[name="payment_method"]:checked');
    return selected ? selected.value : 'cod';
}

function updateCheckoutButtonUi() {
    const btn = document.getElementById('btn-checkout');
    const hint = document.getElementById('checkout-btn-hint');
    if (!btn) return;

    const method = getSelectedPaymentMethod();
    if (method === 'qr_transfer') {
        btn.innerHTML = '<i class="fas fa-qrcode me-2"></i> Thanh toán chuyển khoản';
        if (hint) hint.textContent = 'Quét mã QR và xác nhận chuyển khoản';
    } else {
        btn.innerHTML = '<i class="fas fa-truck me-2"></i> Đặt hàng — Thanh toán khi nhận';
        if (hint) hint.textContent = 'Thanh toán trực tiếp khi nhận xe tại cửa hàng';
    }
}

function initCheckoutPaymentUi() {
    const options = document.querySelectorAll('input[name="payment_method"]');
    if (!options.length) return;

    options.forEach(option => {
        option.addEventListener('change', updateCheckoutButtonUi);
    });
    updateCheckoutButtonUi();

    const modal = document.getElementById('paymentModal');
    if (modal && !modal.dataset.boundReset) {
        modal.dataset.boundReset = '1';
        modal.addEventListener('hidden.bs.modal', resetPaymentModal);
    }
}

let pendingCheckout = null;
let paymentModalInstance = null;

function getPaymentModal() {
    const el = document.getElementById('paymentModal');
    if (!el) return null;
    if (!paymentModalInstance) {
        paymentModalInstance = new bootstrap.Modal(el);
    }
    return paymentModalInstance;
}

function resetPaymentModal() {
    document.getElementById('payment-step-qr')?.classList.remove('d-none');
    document.getElementById('payment-step-success')?.classList.add('d-none');
    const btn = document.getElementById('btn-confirm-payment');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Xác nhận đã thanh toán';
    }
}

function buildPaymentQrText(amount, transferNote) {
    const amountStr = new Intl.NumberFormat('vi-VN').format(amount);
    return [
        'motoSHOP - Thanh toan don hang',
        `So tien: ${amountStr} VND`,
        `Noi dung: ${transferNote}`,
        'Ngan hang: Vietcombank (Demo)',
        'STK: 1234567890'
    ].join('\n');
}

function openPaymentModal(checkoutData) {
    pendingCheckout = { ...checkoutData, paymentMethod: 'qr_transfer' };
    const total = checkoutData.totalAmount;
    const transferNote = 'motoSHOP ' + Date.now().toString().slice(-6);

    const qrText = buildPaymentQrText(total, transferNote);
    const qrImg = document.getElementById('payment-qr-img');
    const amountEl = document.getElementById('payment-amount');
    const descEl = document.getElementById('payment-qr-desc');
    const noteEl = document.getElementById('payment-transfer-note');

    if (qrImg) {
        qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(qrText);
    }
    if (amountEl) amountEl.textContent = formatCurrency(total);
    if (descEl) descEl.textContent = 'Số tiền cần chuyển: ' + formatCurrency(total);
    if (noteEl) noteEl.textContent = transferNote;

    pendingCheckout.transferNote = transferNote;
    resetPaymentModal();
    getPaymentModal()?.show();
}

function showOrderSuccessModal(orderCode, paymentMethod) {
    const isCod = paymentMethod === 'cod';
    document.getElementById('payment-step-qr')?.classList.add('d-none');
    document.getElementById('payment-step-success')?.classList.remove('d-none');

    const titleEl = document.getElementById('payment-success-title');
    const descEl = document.getElementById('payment-success-desc');
    const noteEl = document.getElementById('payment-success-note');
    const codeEl = document.getElementById('payment-success-order');

    if (codeEl) codeEl.textContent = '#' + (orderCode || '');
    if (titleEl) titleEl.textContent = isCod ? 'Đặt hàng thành công!' : 'Thanh toán thành công!';
    if (descEl) {
        descEl.textContent = isCod
            ? 'Cảm ơn bạn. Shop sẽ liên hệ xác nhận và giao xe — bạn thanh toán khi nhận hàng.'
            : 'Cảm ơn bạn. Đơn hàng đã được ghi nhận và đang chờ cửa hàng xử lý.';
    }
    if (noteEl) {
        noteEl.textContent = isCod
            ? 'Bạn có thể hủy đơn trên trang Đơn hàng của tôi khi shop chưa xử lý.'
            : 'Đơn đã thanh toán không thể tự hủy trên website. Cần hỗ trợ, vui lòng liên hệ cửa hàng.';
    }

    getPaymentModal()?.show();
}

async function placeOrderRequest(checkoutData, paymentMethod, paymentConfirmed) {
    const res = await fetch('api/place_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            payment_method: paymentMethod,
            payment_confirmed: paymentConfirmed,
            customer: {
                user_id: checkoutData.userId,
                name: checkoutData.name,
                phone: checkoutData.phone,
                address: checkoutData.address,
                note: checkoutData.note
            },
            cart: cart
        })
    });
    return res.json();
}

function clearCartAfterOrder() {
    cart = [];
    pendingCheckout = null;
    saveCartToStorage();
    updateCartIconCount();
    renderCartPage();
}

window.confirmDemoPayment = async function() {
    if (!pendingCheckout) return;

    const btn = document.getElementById('btn-confirm-payment');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';
    }

    try {
        const data = await placeOrderRequest(pendingCheckout, 'qr_transfer', true);

        if (data.success) {
            clearCartAfterOrder();
            showOrderSuccessModal(data.order_code || data.order_id, 'qr_transfer');
        } else {
            showToast('Lỗi: ' + data.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Xác nhận đã thanh toán';
            }
        }
    } catch (err) {
        showToast('Lỗi kết nối server. Kiểm tra XAMPP đang chạy.', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Xác nhận đã thanh toán';
        }
    }
};

async function submitCodOrder(checkoutData) {
    const btn = document.getElementById('btn-checkout');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang đặt hàng...';
    }

    try {
        const data = await placeOrderRequest(checkoutData, 'cod', false);

        if (data.success) {
            clearCartAfterOrder();
            showOrderSuccessModal(data.order_code || data.order_id, 'cod');
            showToast('Đặt hàng COD thành công!', 'success');
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối server. Kiểm tra XAMPP đang chạy.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            updateCheckoutButtonUi();
        }
    }
}

window.handleCheckout = async function(e) {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!requireLogin('Vui lòng đăng nhập để đặt hàng!')) return;

    const user = getLoggedInUser();
    const name = document.getElementById('co_name').value.trim();
    const phone = document.getElementById('co_phone').value.trim();
    const address = document.getElementById('co_address').value.trim();
    const note = document.getElementById('co_note').value.trim();
    const btn = document.getElementById('btn-checkout');
    const paymentMethod = getSelectedPaymentMethod();

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang kiểm tra...';

    const stockCheck = await validateCartStock();
    if (!stockCheck.ok) {
        await syncCartStockFromServer();
        showToast(stockCheck.message || 'Một số sản phẩm không đủ tồn kho.', 'error');
        btn.disabled = false;
        updateCheckoutButtonUi();
        return;
    }

    btn.disabled = false;
    updateCheckoutButtonUi();

    const checkoutData = {
        userId: user.id,
        name,
        phone,
        address,
        note,
        totalAmount: getCartTotalAmount()
    };

    if (paymentMethod === 'qr_transfer') {
        if (!document.getElementById('paymentModal')) {
            showToast('Trang thanh toán chưa sẵn sàng.', 'error');
            return;
        }
        openPaymentModal(checkoutData);
        return;
    }

    await submitCodOrder(checkoutData);
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
    localStorage.removeItem('motoshop_cart'); // key cũ dùng chung (trước khi tách theo user)
    cart = [];
    updateCartIconCount();
    window.location.reload();
};

