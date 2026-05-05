/**
 * Admin JavaScript - MotoShop
 * Handles auth, dashboard stats, CRUD operations for products/orders/news/contacts/customers
 */

const API_BASE = '../api/';
const { formatCurrency, formatDateVN: formatDate, fixImageUrlForAdmin: fixImageUrl } = window.MotoShared || {};
const el = (id) => document.getElementById(id);
const onReady = (callback) => document.addEventListener('DOMContentLoaded', callback);
if (
    typeof formatCurrency !== 'function' ||
    typeof formatDate !== 'function' ||
    typeof fixImageUrl !== 'function'
) {
    throw new Error('MotoShared chưa được tải. Vui lòng include ../js/shared/moto-shared.js trước ../js/admin.js');
}

// =================== AUTH ===================
function checkAuth() {
    const admin = localStorage.getItem('motoshop_admin');
    if (!admin) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(admin);
}

function adminLogout() {
    localStorage.removeItem('motoshop_admin');
    window.location.href = 'login.html';
}

function toggleSidebar() {
    document.getElementById('adminSidebar').classList.toggle('show');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}

// =================== DEMO DATA ===================
// Demo data used when API is not available (no XAMPP)
const DEMO_PRODUCTS = [
    { id:1, name:"Honda Winner X 2024", slug:"honda-winner-x-2024", brand:"Honda", brand_id:1, category:"Xe Côn Tay", category_id:3, price:50500000, sale_price:48500000, image:"https://images.unsplash.com/photo-1568772585407-9361f9bf3c87?q=80&w=400", is_hot:true, is_new:true, status:"active", stock_quantity:15, specs:{engine_type:"DOHC, 4 kỳ",displacement:"149.1 cc",max_power:"11.5kW",weight:"122 kg"} },
    { id:2, name:"Yamaha Exciter 155 VVA", slug:"yamaha-exciter-155", brand:"Yamaha", brand_id:2, category:"Xe Côn Tay", category_id:3, price:51000000, sale_price:null, image:"https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?q=80&w=400", is_hot:true, is_new:false, status:"active", stock_quantity:22, specs:{engine_type:"SOHC, VVA",displacement:"155.1 cc",max_power:"13.2 kW",weight:"121 kg"} },
    { id:3, name:"Honda SH 160i 2024", slug:"honda-sh-160i", brand:"Honda", brand_id:1, category:"Xe Tay Ga", category_id:1, price:105000000, sale_price:101000000, image:"https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=400", is_hot:true, is_new:true, status:"active", stock_quantity:8, specs:{engine_type:"eSP+, SOHC",displacement:"156.9 cc",max_power:"12.4kW",weight:"134 kg"} },
    { id:4, name:"Honda Vision 2024", slug:"honda-vision-2024", brand:"Honda", brand_id:1, category:"Xe Tay Ga", category_id:1, price:35000000, sale_price:null, image:"https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=400", is_hot:true, is_new:false, status:"active", stock_quantity:30, specs:{engine_type:"eSP, SOHC",displacement:"109.5 cc",max_power:"6.59kW",weight:"94 kg"} },
    { id:5, name:"Yamaha NVX 155 VVA", slug:"yamaha-nvx-155", brand:"Yamaha", brand_id:2, category:"Xe Tay Ga", category_id:1, price:54500000, sale_price:53000000, image:"https://images.unsplash.com/photo-1604054923518-e491a9a6acbc?q=80&w=400", is_hot:false, is_new:true, status:"active", stock_quantity:12, specs:{engine_type:"Blue Core, SOHC",displacement:"155.1 cc",max_power:"11.3 kW",weight:"125 kg"} },
    { id:6, name:"Ducati Panigale V4", slug:"ducati-panigale-v4", brand:"Ducati", brand_id:3, category:"Phân Khối Lớn", category_id:4, price:750000000, sale_price:null, image:"https://images.unsplash.com/photo-1568772585407-9361f9bf3c87?q=80&w=400", is_hot:true, is_new:true, status:"active", stock_quantity:2, specs:{engine_type:"V4 Desmosedici",displacement:"1103 cc",max_power:"215.5 hp",weight:"198.5 kg"} },
    { id:7, name:"Honda Wave Alpha", slug:"honda-wave-alpha", brand:"Honda", brand_id:1, category:"Xe Số", category_id:2, price:18000000, sale_price:17500000, image:"https://images.unsplash.com/photo-1558980394-0a37c6ce74fa?q=80&w=400", is_hot:true, is_new:false, status:"active", stock_quantity:50, specs:{engine_type:"4 kỳ, SOHC",displacement:"109.1 cc",max_power:"6.12kW",weight:"97 kg"} },
    { id:8, name:"Yamaha Grande Blue Core", slug:"yamaha-grande", brand:"Yamaha", brand_id:2, category:"Xe Tay Ga", category_id:1, price:46000000, sale_price:null, image:"https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?q=80&w=400", is_hot:false, is_new:true, status:"inactive", stock_quantity:18, specs:{engine_type:"Blue Core Hybrid",displacement:"125 cc",max_power:"6.1 kW",weight:"101 kg"} }
];

const DEMO_ORDERS = [
    { id:1, customer_name:"Nguyễn Văn A", phone:"0912345678", address:"123 Cầu Diễn, HN", total_amount:48500000, status:"pending", order_date:"2026-03-15T10:30:00", notes:"Giao buổi sáng", items:[{product_name:"Honda Winner X 2024",quantity:1,unit_price:48500000}] },
    { id:2, customer_name:"Trần Thị B", phone:"0987654321", address:"456 Láng Hạ, HN", total_amount:101000000, status:"contacted", order_date:"2026-03-14T14:20:00", notes:"", items:[{product_name:"Honda SH 160i 2024",quantity:1,unit_price:101000000}] },
    { id:3, customer_name:"Lê Văn C", phone:"0901234567", address:"789 Kim Mã, HN", total_amount:51000000, status:"completed", order_date:"2026-03-12T09:00:00", notes:"Đã thanh toán", items:[{product_name:"Yamaha Exciter 155 VVA",quantity:1,unit_price:51000000}] },
    { id:4, customer_name:"Phạm Thị D", phone:"0976543210", address:"321 Tây Hồ, HN", total_amount:35000000, status:"pending", order_date:"2026-03-16T16:45:00", notes:"Cần tư vấn thêm", items:[{product_name:"Honda Vision 2024",quantity:1,unit_price:35000000}] },
    { id:5, customer_name:"Hoàng Văn E", phone:"0945678901", address:"654 Thanh Xuân, HN", total_amount:750000000, status:"cancelled", order_date:"2026-03-10T11:15:00", notes:"Khách hủy", items:[{product_name:"Ducati Panigale V4",quantity:1,unit_price:750000000}] }
];

const DEMO_CUSTOMERS = [
    { id:1, full_name:"Nguyễn Văn A", phone:"0912345678", email:"nguyenvana@gmail.com", address:"123 Cầu Diễn, HN", order_count:2, created_at:"2026-01-15" },
    { id:2, full_name:"Trần Thị B", phone:"0987654321", email:"tranthib@gmail.com", address:"456 Láng Hạ, HN", order_count:1, created_at:"2026-02-20" },
    { id:3, full_name:"Lê Văn C", phone:"0901234567", email:"levanc@yahoo.com", address:"789 Kim Mã, HN", order_count:1, created_at:"2026-02-28" },
    { id:4, full_name:"Phạm Thị D", phone:"0976543210", email:"phamthid@gmail.com", address:"321 Tây Hồ, HN", order_count:1, created_at:"2026-03-05" },
    { id:5, full_name:"Hoàng Văn E", phone:"0945678901", email:"hoangvane@gmail.com", address:"654 Thanh Xuân, HN", order_count:1, created_at:"2026-03-10" }
];

const DEMO_NEWS = [
    { id:1, title:"Honda ra mắt Winner X 2024 tại Việt Nam", slug:"honda-winner-x-2024-ra-mat", thumbnail_url:"https://images.unsplash.com/photo-1568772585407-9361f9bf3c87?q=80&w=400", author:"MotoShop", published_at:"2026-03-10", summary:"Honda Việt Nam vừa chính thức giới thiệu phiên bản mới của Winner X..." },
    { id:2, title:"So sánh Exciter 155 vs Winner X: Đâu là lựa chọn tốt nhất?", slug:"so-sanh-exciter-winner", thumbnail_url:"https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?q=80&w=400", author:"Admin", published_at:"2026-03-08", summary:"Hai mẫu xe côn tay bán chạy nhất Việt Nam..." },
    { id:3, title:"Bảng giá xe máy Honda tháng 3/2026", slug:"bang-gia-honda-thang-3", thumbnail_url:"https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=400", author:"MotoShop", published_at:"2026-03-01", summary:"Cập nhật bảng giá mới nhất cho các dòng xe Honda..." }
];

const DEMO_CONTACTS = [
    { id:1, full_name:"Nguyễn Minh Tuấn", phone:"0911222333", email:"tuan.nm@gmail.com", message:"Tôi muốn hỏi về giá xe SH 160i, có hỗ trợ trả góp không?", status:"unread", created_at:"2026-03-16T08:30:00" },
    { id:2, full_name:"Lê Thị Hương", phone:"0922333444", email:"huong.lt@yahoo.com", message:"Cho tôi hỏi xe Winner X còn hàng không ạ? Tôi muốn đến xem xe vào cuối tuần", status:"read", created_at:"2026-03-15T14:20:00" },
    { id:3, full_name:"Trần Đức Nam", phone:"0933444555", email:"nam.td@gmail.com", message:"Dịch vụ bảo dưỡng xe định kỳ giá bao nhiêu?", status:"replied", created_at:"2026-03-14T10:00:00" },
    { id:4, full_name:"Phạm Anh Khoa", phone:"0944555666", email:"khoa.pa@gmail.com", message:"Tôi muốn đặt hàng Ducati Panigale V4, cần tư vấn thêm về bảo hiểm và đăng ký biển số", status:"unread", created_at:"2026-03-17T09:15:00" }
];

// State
let adminProducts = [];
let adminCustomers = [];
let adminNews = [];
let adminContacts = [];

function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('products.html')) return 'products';
    if (path.includes('orders.html')) return 'orders';
    if (path.includes('customers.html')) return 'customers';
    if (path.includes('news.html')) return 'news';
    if (path.includes('contacts.html')) return 'contacts';
    if (path.includes('coupons.html')) return 'coupons';
    return 'index';
}

// =================== DASHBOARD ===================
async function loadDashboard() {
    try {
        const res = await fetch(API_BASE + 'admin_stats.php');
        const data = await res.json();
        if (!data.error) {
            document.getElementById('stat-products').textContent = data.total_products || 0;
            document.getElementById('stat-orders').textContent = data.total_orders || 0;
            document.getElementById('stat-customers').textContent = data.total_customers || 0;
            document.getElementById('stat-revenue').textContent = formatCurrency(data.total_revenue || 0);
            document.getElementById('stat-pending-orders').textContent = data.pending_orders || 0;
            document.getElementById('stat-completed-orders').textContent = data.completed_orders || 0;
            document.getElementById('stat-unread-contacts').textContent = data.unread_contacts || 0;
            document.getElementById('stat-news-count').textContent = data.total_news || 0;

            if (data.recent_orders) renderRecentOrders(data.recent_orders);
            if (data.recent_contacts) renderRecentContacts(data.recent_contacts);

            // Update sidebar badges
            const oc = document.getElementById('sidebar-order-count');
            const cc = document.getElementById('sidebar-contact-count');
            if (oc) oc.textContent = data.pending_orders || 0;
            if (cc) cc.textContent = data.unread_contacts || 0;
        }
    } catch (err) {
        // Use demo data
        loadDashboardDemo();
    }
}

function loadDashboardDemo() {
    document.getElementById('stat-products').textContent = DEMO_PRODUCTS.length;
    document.getElementById('stat-orders').textContent = DEMO_ORDERS.length;
    document.getElementById('stat-customers').textContent = DEMO_CUSTOMERS.length;

    const totalRevenue = DEMO_ORDERS.filter(o => o.status === 'completed').reduce((s, o) => s + o.total_amount, 0);
    document.getElementById('stat-revenue').textContent = formatCurrency(totalRevenue);

    const pending = DEMO_ORDERS.filter(o => o.status === 'pending').length;
    const completed = DEMO_ORDERS.filter(o => o.status === 'completed').length;
    document.getElementById('stat-pending-orders').textContent = pending;
    document.getElementById('stat-completed-orders').textContent = completed;
    document.getElementById('stat-unread-contacts').textContent = DEMO_CONTACTS.filter(c => c.status === 'unread').length;
    document.getElementById('stat-news-count').textContent = DEMO_NEWS.length;

    const oc = document.getElementById('sidebar-order-count');
    const cc = document.getElementById('sidebar-contact-count');
    if (oc) oc.textContent = pending;
    if (cc) cc.textContent = DEMO_CONTACTS.filter(c => c.status === 'unread').length;

    renderRecentOrders(DEMO_ORDERS.slice(0, 5));
    renderRecentContacts(DEMO_CONTACTS.filter(c => c.status === 'unread').slice(0, 3));
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recent-orders-body');
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có đơn hàng nào</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${o.id}</strong></td>
            <td>${o.customer_name || 'N/A'}</td>
            <td class="fw-bold">${formatCurrency(o.total_amount)}</td>
            <td><span class="status-badge ${o.status}">${getStatusText(o.status)}</span></td>
            <td class="text-muted">${formatDate(o.order_date)}</td>
        </tr>
    `).join('');
}

function renderRecentContacts(contacts) {
    const container = document.getElementById('recent-contacts-body');
    if (!container) return;
    if (contacts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center small py-3">Không có tin nhắn mới</p>';
        return;
    }
    container.innerHTML = contacts.map(c => `
        <div class="d-flex gap-3 align-items-start mb-3 pb-3 border-bottom">
            <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0;">
                ${c.full_name.charAt(0)}
            </div>
            <div>
                <div style="font-size:0.85rem;font-weight:600;color:#0f1535;">${c.full_name}</div>
                <div style="font-size:0.78rem;color:var(--admin-text-muted);margin-top:2px;" class="text-truncate" title="${c.message}">${c.message.substring(0, 60)}...</div>
                <div style="font-size:0.7rem;color:#aaa;margin-top:4px;">${formatDate(c.created_at)}</div>
            </div>
        </div>
    `).join('');
}

function getStatusText(s) {
    const map = { pending:'Chờ xử lý', contacted:'Đã liên hệ', completed:'Hoàn thành', cancelled:'Đã hủy', unread:'Chưa đọc', read:'Đã đọc', replied:'Đã trả lời', active:'Đang bán', inactive:'Ngừng bán' };
    return map[s] || s;
}

// =================== PRODUCTS ===================
async function loadProducts() {
    try {
        const res = await fetch(API_BASE + 'admin_products.php');
        adminProducts = await res.json();
        if (adminProducts.error) throw new Error(adminProducts.message);
    } catch (err) {
        adminProducts = [...DEMO_PRODUCTS];
    }
    renderProductsTable(adminProducts);
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-5"><div class="empty-state"><i class="fas fa-motorcycle d-block"></i><h5>Chưa có sản phẩm nào</h5></div></td></tr>';
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${fixImageUrl(p.image)}" class="product-thumb" alt="${p.name}"></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.brand || '—'}</td>
            <td>${p.category || '—'}</td>
            <td class="fw-bold">${formatCurrency(p.price)}</td>
            <td>${p.sale_price ? '<span class="text-danger fw-bold">' + formatCurrency(p.sale_price) + '</span>' : '—'}</td>
            <td><span class="status-badge ${p.status || 'active'}">${getStatusText(p.status || 'active')}</span></td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-action btn-edit" onclick="openEditProduct(${p.id})" title="Sửa"><i class="fas fa-pen"></i></button>
                    <button class="btn-action btn-delete" onclick="deleteProduct(${p.id})" title="Xóa"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterProducts() {
    const q = document.getElementById('searchProduct').value.toLowerCase();
    const filtered = adminProducts.filter(p => p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q)));
    renderProductsTable(filtered);
}

function openAddProduct() {
    el('productModalTitle').textContent = 'Thêm Sản Phẩm Mới';
    // Không reset toàn bộ form, chỉ reset các field cụ thể (trừ prod_image để giữ URL đã upload)
    const defaults = {
        prod_id: '',
        prod_name: '',
        prod_slug: '',
        prod_brand: '',
        prod_category: '',
        prod_status: 'active',
        prod_price: '',
        prod_sale_price: '',
        prod_stock: '0',
        prod_image: '',
        prod_desc: '',
        spec_engine: '',
        spec_displacement: '',
        spec_power: '',
        spec_weight: '',
        spec_fuel: ''
    };
    Object.entries(defaults).forEach(([id, value]) => {
        const input = el(id);
        if (input) input.value = value;
    });
    el('prod_is_new').checked = false;
    el('prod_is_hot').checked = false;
    // Reset image preview
    const preview = document.getElementById('image-preview');
    if (preview) preview.innerHTML = '<i class="fas fa-image text-muted"></i>';
    const status = document.getElementById('upload-status');
    if (status) status.textContent = '';
}

// === UPLOAD ẢNH TỪ MÁY TÍNH ===
async function uploadProductImage(input) {
    const file = input.files[0];
    if (!file) return;

    const statusEl = document.getElementById('upload-status');
    const imageInput = document.getElementById('prod_image');

    // Validate phía client
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        statusEl.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle me-1"></i>Chỉ chấp nhận JPG, PNG, GIF, WEBP</span>';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        statusEl.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle me-1"></i>Ảnh quá lớn (tối đa 5MB)</span>';
        return;
    }

    // Hiện preview ngay lập tức từ file local
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('image-preview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);

    // Upload lên server
    statusEl.innerHTML = '<span class="text-primary"><i class="fas fa-spinner fa-spin me-1"></i>Đang upload...</span>';

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch(API_BASE + 'upload_image.php', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            imageInput.value = data.url;
            statusEl.innerHTML = '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Upload thành công!</span>';
        } else {
            statusEl.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle me-1"></i>${data.message}</span>`;
        }
    } catch (err) {
        statusEl.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle me-1"></i>Lỗi kết nối server</span>';
    }

    // Reset file input để có thể chọn lại cùng file
    input.value = '';
}

// Preview ảnh khi dán URL
function previewImageURL() {
    const url = el('prod_image').value.trim();
    const preview = el('image-preview');
    if (url) {
        preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-exclamation-triangle text-warning\\'></i>'">`;
    } else {
        preview.innerHTML = '<i class="fas fa-image text-muted"></i>';
    }
}

// Gắn event listeners cho upload ảnh (tránh dùng inline handler)
onReady(() => {
    const fileInput = el('prod_image_file');
    const urlInput = el('prod_image');
    if (fileInput) fileInput.addEventListener('change', function() { uploadProductImage(this); });
    if (urlInput) urlInput.addEventListener('input', previewImageURL);
});

function openEditProduct(id) {
    const p = adminProducts.find(x => x.id === id);
    if (!p) return;
    el('productModalTitle').textContent = 'Sửa Sản Phẩm';
    const fields = {
        prod_id: p.id,
        prod_name: p.name,
        prod_slug: p.slug || '',
        prod_brand: p.brand_id || '',
        prod_category: p.category_id || '',
        prod_status: p.status || 'active',
        prod_price: p.price,
        prod_sale_price: p.sale_price || '',
        prod_stock: p.stock_quantity || 0,
        prod_image: p.image || '',
        prod_desc: p.description || ''
    };
    Object.entries(fields).forEach(([id, value]) => {
        const input = el(id);
        if (input) input.value = value;
    });
    el('prod_is_new').checked = p.is_new;
    el('prod_is_hot').checked = p.is_hot;
    if (p.specs) {
        el('spec_engine').value = p.specs.engine_type || '';
        el('spec_displacement').value = p.specs.displacement || '';
        el('spec_power').value = p.specs.max_power || '';
        el('spec_weight').value = p.specs.weight || '';
    }
    // Hiện preview ảnh hiện tại
    const preview = document.getElementById('image-preview');
    const statusEl = document.getElementById('upload-status');
    if (preview && p.image) {
        preview.innerHTML = `<img src="${fixImageUrl(p.image)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image text-muted\\'></i>'">`;
    }
    if (statusEl) statusEl.textContent = '';
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

async function deleteProduct(id) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
        await fetch(API_BASE + 'admin_products.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
    } catch (err) { /* demo mode */ }
    adminProducts = adminProducts.filter(p => p.id !== id);
    renderProductsTable(adminProducts);
}

// Product form submit
onReady(() => {
    const form = el('productForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const brandMap = { '1':'Honda', '2':'Yamaha', '3':'Ducati', '4':'Suzuki', '5':'Kawasaki' };
            const catMap = { '1':'Xe Tay Ga', '2':'Xe Số', '3':'Xe Côn Tay', '4':'Phân Khối Lớn' };

            const productData = {
                id: document.getElementById('prod_id').value ? parseInt(document.getElementById('prod_id').value) : null,
                name: document.getElementById('prod_name').value,
                slug: document.getElementById('prod_slug').value || document.getElementById('prod_name').value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
                brand_id: parseInt(document.getElementById('prod_brand').value),
                brand: brandMap[document.getElementById('prod_brand').value] || '',
                category_id: parseInt(document.getElementById('prod_category').value),
                category: catMap[document.getElementById('prod_category').value] || '',
                price: parseFloat(document.getElementById('prod_price').value),
                sale_price: document.getElementById('prod_sale_price').value ? parseFloat(document.getElementById('prod_sale_price').value) : null,
                stock_quantity: parseInt(document.getElementById('prod_stock').value) || 0,
                image: document.getElementById('prod_image').value,
                description: document.getElementById('prod_desc').value,
                status: document.getElementById('prod_status').value,
                is_new: document.getElementById('prod_is_new').checked,
                is_hot: document.getElementById('prod_is_hot').checked,
                specs: {
                    engine_type: document.getElementById('spec_engine').value,
                    displacement: document.getElementById('spec_displacement').value,
                    max_power: document.getElementById('spec_power').value,
                    weight: document.getElementById('spec_weight').value,
                    fuel_consumption: document.getElementById('spec_fuel') ? document.getElementById('spec_fuel').value : ''
                }
            };

            let savedToDb = false;
            try {
                const method = productData.id ? 'PUT' : 'POST';
                const res = await fetch(API_BASE + 'admin_products.php', {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                const result = await res.json();
                if (result.error) {
                    alert('Lỗi từ server: ' + result.message);
                    return;
                }
                savedToDb = true;
                // Lấy ID thực từ database cho sản phẩm mới
                if (!productData.id && result.id) {
                    productData.id = result.id;
                }
            } catch (err) {
                console.warn('Không kết nối được API, chỉ lưu tạm trên giao diện:', err);
            }

            // Update local state
            if (productData.id && adminProducts.find(p => p.id === productData.id)) {
                const idx = adminProducts.findIndex(p => p.id === productData.id);
                if (idx !== -1) adminProducts[idx] = { ...adminProducts[idx], ...productData };
            } else {
                if (!productData.id) {
                    productData.id = adminProducts.length > 0 ? Math.max(...adminProducts.map(p => p.id)) + 1 : 1;
                }
                adminProducts.push(productData);
            }

            renderProductsTable(adminProducts);
            bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
            alert(savedToDb ? 'Đã lưu sản phẩm vào database thành công!' : 'Lưu tạm trên giao diện (chưa kết nối được database)');
        });
    }
});

// =================== CUSTOMERS ===================
async function loadCustomers() {
    try {
        const res = await fetch(API_BASE + 'admin_customers.php');
        adminCustomers = await res.json();
        if (adminCustomers.error) throw new Error();
    } catch (err) {
        adminCustomers = [...DEMO_CUSTOMERS];
    }
    renderCustomersTable(adminCustomers);
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customers-tbody');
    if (!tbody) return;
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5"><div class="empty-state"><i class="fas fa-users d-block"></i><h5>Chưa có khách hàng nào</h5></div></td></tr>';
        return;
    }
    tbody.innerHTML = customers.map((c, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${c.full_name}</strong></td>
            <td>${c.phone}</td>
            <td>${c.email || '—'}</td>
            <td class="text-truncate" style="max-width:200px;">${c.address || '—'}</td>
            <td><span class="badge bg-primary rounded-pill">${c.order_count || 0}</span></td>
            <td class="text-muted">${formatDate(c.created_at)}</td>
        </tr>
    `).join('');
}

function filterCustomers() {
    const q = document.getElementById('searchCustomer').value.toLowerCase();
    const filtered = adminCustomers.filter(c => c.full_name.toLowerCase().includes(q) || c.phone.includes(q));
    renderCustomersTable(filtered);
}

// =================== NEWS ===================
async function loadNews() {
    try {
        const res = await fetch(API_BASE + 'admin_news.php');
        adminNews = await res.json();
        if (adminNews.error) throw new Error();
    } catch (err) {
        adminNews = [...DEMO_NEWS];
    }
    renderNewsTable(adminNews);
}

function renderNewsTable(news) {
    const tbody = document.getElementById('news-tbody');
    if (!tbody) return;
    if (news.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="empty-state"><i class="fas fa-newspaper d-block"></i><h5>Chưa có bài viết nào</h5></div></td></tr>';
        return;
    }
    tbody.innerHTML = news.map((n, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><img src="${fixImageUrl(n.thumbnail_url)}" class="product-thumb" alt=""></td>
            <td><strong>${n.title}</strong></td>
            <td>${n.author || '—'}</td>
            <td class="text-muted">${formatDate(n.published_at)}</td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-action btn-edit" onclick="openEditNews(${n.id})" title="Sửa"><i class="fas fa-pen"></i></button>
                    <button class="btn-action btn-delete" onclick="deleteNews(${n.id})" title="Xóa"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddNews() {
    document.getElementById('newsModalTitle').textContent = 'Thêm Bài Viết Mới';
    document.getElementById('newsForm').reset();
    document.getElementById('news_id').value = '';
}

function openEditNews(id) {
    const n = adminNews.find(x => x.id === id);
    if (!n) return;
    document.getElementById('newsModalTitle').textContent = 'Sửa Bài Viết';
    document.getElementById('news_id').value = n.id;
    document.getElementById('news_title').value = n.title;
    document.getElementById('news_author').value = n.author || '';
    document.getElementById('news_thumbnail').value = n.thumbnail_url || '';
    document.getElementById('news_summary').value = n.summary || '';
    document.getElementById('news_content').value = n.content || '';
    new bootstrap.Modal(document.getElementById('newsModal')).show();
}

async function deleteNews(id) {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
        await fetch(API_BASE + 'admin_news.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    } catch (err) { /* demo */ }
    adminNews = adminNews.filter(n => n.id !== id);
    renderNewsTable(adminNews);
}

onReady(() => {
    const form = el('newsForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newsData = {
                id: document.getElementById('news_id').value ? parseInt(document.getElementById('news_id').value) : null,
                title: document.getElementById('news_title').value,
                slug: document.getElementById('news_title').value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
                author: document.getElementById('news_author').value,
                thumbnail_url: document.getElementById('news_thumbnail').value,
                summary: document.getElementById('news_summary').value,
                content: document.getElementById('news_content').value,
                published_at: new Date().toISOString()
            };

            try {
                const method = newsData.id ? 'PUT' : 'POST';
                await fetch(API_BASE + 'admin_news.php', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newsData) });
            } catch (err) { /* demo */ }

            if (newsData.id) {
                const idx = adminNews.findIndex(n => n.id === newsData.id);
                if (idx !== -1) adminNews[idx] = { ...adminNews[idx], ...newsData };
            } else {
                newsData.id = adminNews.length > 0 ? Math.max(...adminNews.map(n => n.id)) + 1 : 1;
                adminNews.push(newsData);
            }
            renderNewsTable(adminNews);
            bootstrap.Modal.getInstance(document.getElementById('newsModal')).hide();
            alert('Đã lưu bài viết thành công!');
        });
    }
});

// =================== CONTACTS ===================
async function loadContacts() {
    try {
        const res = await fetch(API_BASE + 'admin_contacts.php');
        adminContacts = await res.json();
        if (adminContacts.error) throw new Error();
    } catch (err) {
        adminContacts = [...DEMO_CONTACTS];
    }
    renderContactsTable(adminContacts);
}

function renderContactsTable(contacts) {
    const tbody = document.getElementById('contacts-tbody');
    if (!tbody) return;
    if (contacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-5"><div class="empty-state"><i class="fas fa-envelope d-block"></i><h5>Chưa có liên hệ nào</h5></div></td></tr>';
        return;
    }
    tbody.innerHTML = contacts.map((c, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${c.full_name}</strong></td>
            <td>${c.phone}</td>
            <td>${c.email || '—'}</td>
            <td class="text-truncate" style="max-width:200px;" title="${c.message}">${c.message.substring(0, 50)}${c.message.length > 50 ? '...' : ''}</td>
            <td>
                <select class="form-select form-select-sm" style="width:120px;font-size:0.78rem;border-radius:8px;" onchange="updateContactStatus(${c.id}, this.value)">
                    <option value="unread" ${c.status==='unread'?'selected':''}>Chưa đọc</option>
                    <option value="read" ${c.status==='read'?'selected':''}>Đã đọc</option>
                    <option value="replied" ${c.status==='replied'?'selected':''}>Đã trả lời</option>
                </select>
            </td>
            <td class="text-muted">${formatDate(c.created_at)}</td>
            <td>
                <button class="btn-action btn-view" onclick="viewContactDetail(${c.id})" title="Xem"><i class="fas fa-eye"></i></button>
            </td>
        </tr>
    `).join('');
}

function filterContacts() {
    const q = document.getElementById('searchContact').value.toLowerCase();
    const filtered = adminContacts.filter(c => c.full_name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q)));
    renderContactsTable(filtered);
}

async function updateContactStatus(id, newStatus) {
    try {
        await fetch(API_BASE + 'admin_contacts.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });
    } catch (err) { /* demo */ }
    const contact = adminContacts.find(c => c.id === id);
    if (contact) contact.status = newStatus;
}

function viewContactDetail(id) {
    const c = adminContacts.find(x => x.id === id);
    if (!c) return;
    document.getElementById('contact-detail-body').innerHTML = `
        <div class="mb-3 pb-3 border-bottom">
            <small class="text-muted d-block mb-1">Họ tên</small>
            <strong>${c.full_name}</strong>
        </div>
        <div class="mb-3 pb-3 border-bottom">
            <small class="text-muted d-block mb-1">Số điện thoại</small>
            <strong>${c.phone}</strong>
        </div>
        <div class="mb-3 pb-3 border-bottom">
            <small class="text-muted d-block mb-1">Email</small>
            <strong>${c.email || '—'}</strong>
        </div>
        <div class="mb-3 pb-3 border-bottom">
            <small class="text-muted d-block mb-1">Nội dung tin nhắn</small>
            <p class="mb-0">${c.message}</p>
        </div>
        <div>
            <small class="text-muted d-block mb-1">Ngày gửi</small>
            <strong>${formatDate(c.created_at)}</strong>
        </div>
    `;
    // Auto-mark as read
    if (c.status === 'unread') {
        c.status = 'read';
        updateContactStatus(c.id, 'read');
        renderContactsTable(adminContacts);
    }
    new bootstrap.Modal(document.getElementById('contactDetailModal')).show();
}

