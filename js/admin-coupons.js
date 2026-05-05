// =================== COUPONS ===================
let adminCoupons = [];

const DEMO_COUPONS = [
    { id:1, code:'WELCOME10', description:'Giảm 10% cho khách hàng mới', discount_type:'percent', discount_value:10, min_order_amount:20000000, max_discount:5000000, max_uses:100, used_count:12, starts_at:null, expires_at:'2027-12-31T23:59:59', status:'active', created_at:'2026-01-01' },
    { id:2, code:'GIAM500K', description:'Giảm 500,000đ cho đơn từ 30 triệu', discount_type:'fixed', discount_value:500000, min_order_amount:30000000, max_discount:null, max_uses:50, used_count:8, starts_at:null, expires_at:'2027-06-30T23:59:59', status:'active', created_at:'2026-02-15' },
    { id:3, code:'SUMMER2026', description:'Ưu đãi mùa hè - Giảm 5%', discount_type:'percent', discount_value:5, min_order_amount:0, max_discount:3000000, max_uses:null, used_count:25, starts_at:null, expires_at:'2026-08-31T23:59:59', status:'active', created_at:'2026-05-01' }
];

async function loadCoupons() {
    try {
        const res = await fetch(API_BASE + 'admin_coupons.php');
        adminCoupons = await res.json();
        if (adminCoupons.error) throw new Error();
    } catch (err) {
        adminCoupons = [...DEMO_COUPONS];
    }
    renderCouponsTable(adminCoupons);
}

function renderCouponsTable(coupons) {
    const tbody = document.getElementById('coupons-tbody');
    if (!tbody) return;
    if (coupons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5"><div class="empty-state"><i class="fas fa-ticket-alt d-block"></i><h5>Chưa có mã giảm giá nào</h5></div></td></tr>';
        return;
    }
    tbody.innerHTML = coupons.map(c => {
        const typeText = c.discount_type === 'percent' ? `${c.discount_value}%` : formatCurrency(c.discount_value);
        const usageText = c.max_uses ? `${c.used_count}/${c.max_uses}` : `${c.used_count}/∞`;
        const expiry = c.expires_at ? formatDate(c.expires_at) : 'Vô hạn';
        const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
        
        return `
        <tr>
            <td><code class="fw-bold" style="font-size:0.85rem;color:#7c3aed;">${c.code}</code></td>
            <td class="text-truncate" style="max-width:180px;" title="${c.description}">${c.description || '—'}</td>
            <td>${c.discount_type === 'percent' ? '<span class="badge bg-primary">%</span>' : '<span class="badge bg-success">VNĐ</span>'}</td>
            <td class="fw-bold">${typeText}</td>
            <td>${c.min_order_amount > 0 ? formatCurrency(c.min_order_amount) : '—'}</td>
            <td><span class="badge bg-light text-dark">${usageText}</span></td>
            <td>${isExpired ? '<span class="text-danger small"><i class="fas fa-clock me-1"></i>Hết hạn</span>' : expiry}</td>
            <td><span class="status-badge ${c.status}">${c.status === 'active' ? 'Hoạt động' : 'Tắt'}</span></td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-action btn-edit" onclick="openEditCoupon(${c.id})" title="Sửa"><i class="fas fa-pen"></i></button>
                    <button class="btn-action btn-delete" onclick="deleteCoupon(${c.id})" title="Xóa"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function toggleCouponFields() {
    const type = document.getElementById('cpn_type').value;
    const label = document.getElementById('cpn_value_label');
    const maxGroup = document.getElementById('cpn_max_discount_group');
    if (type === 'percent') {
        label.innerHTML = 'Giá trị (%) <span class="text-danger">*</span>';
        maxGroup.style.display = 'block';
    } else {
        label.innerHTML = 'Số tiền giảm (VNĐ) <span class="text-danger">*</span>';
        maxGroup.style.display = 'none';
    }
}

function openAddCoupon() {
    document.getElementById('couponModalTitle').textContent = 'Tạo Mã Giảm Giá Mới';
    document.getElementById('couponForm').reset();
    document.getElementById('cpn_id').value = '';
    toggleCouponFields();
}

function openEditCoupon(id) {
    const c = adminCoupons.find(x => x.id === id);
    if (!c) return;
    document.getElementById('couponModalTitle').textContent = 'Sửa Mã Giảm Giá';
    document.getElementById('cpn_id').value = c.id;
    document.getElementById('cpn_code').value = c.code;
    document.getElementById('cpn_desc').value = c.description || '';
    document.getElementById('cpn_type').value = c.discount_type;
    document.getElementById('cpn_value').value = c.discount_value;
    document.getElementById('cpn_min_order').value = c.min_order_amount || 0;
    document.getElementById('cpn_max_discount').value = c.max_discount || '';
    document.getElementById('cpn_max_uses').value = c.max_uses || '';
    document.getElementById('cpn_status').value = c.status;
    
    if (c.starts_at) document.getElementById('cpn_starts').value = c.starts_at.slice(0, 16);
    if (c.expires_at) document.getElementById('cpn_expires').value = c.expires_at.slice(0, 16);
    
    toggleCouponFields();
    new bootstrap.Modal(document.getElementById('couponModal')).show();
}

async function deleteCoupon(id) {
    if (!confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    try {
        await fetch(API_BASE + 'admin_coupons.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
    } catch (err) { /* demo */ }
    adminCoupons = adminCoupons.filter(c => c.id !== id);
    renderCouponsTable(adminCoupons);
}

onReady(() => {
    const form = el('couponForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const couponData = {
                id: document.getElementById('cpn_id').value ? parseInt(document.getElementById('cpn_id').value) : null,
                code: document.getElementById('cpn_code').value.toUpperCase().trim(),
                description: document.getElementById('cpn_desc').value,
                discount_type: document.getElementById('cpn_type').value,
                discount_value: parseFloat(document.getElementById('cpn_value').value),
                min_order_amount: parseFloat(document.getElementById('cpn_min_order').value) || 0,
                max_discount: document.getElementById('cpn_max_discount').value ? parseFloat(document.getElementById('cpn_max_discount').value) : null,
                max_uses: document.getElementById('cpn_max_uses').value ? parseInt(document.getElementById('cpn_max_uses').value) : null,
                starts_at: document.getElementById('cpn_starts').value || null,
                expires_at: document.getElementById('cpn_expires').value || null,
                status: document.getElementById('cpn_status').value
            };

            try {
                const method = couponData.id ? 'PUT' : 'POST';
                const res = await fetch(API_BASE + 'admin_coupons.php', {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(couponData)
                });
                const result = await res.json();
                if (!couponData.id && result.id) couponData.id = result.id;
            } catch (err) {
                console.warn('Demo mode - not saved to DB');
            }

            if (couponData.id && adminCoupons.find(c => c.id === couponData.id)) {
                const idx = adminCoupons.findIndex(c => c.id === couponData.id);
                if (idx !== -1) adminCoupons[idx] = { ...adminCoupons[idx], ...couponData };
            } else {
                if (!couponData.id) {
                    couponData.id = adminCoupons.length > 0 ? Math.max(...adminCoupons.map(c => c.id)) + 1 : 1;
                }
                couponData.used_count = 0;
                adminCoupons.push(couponData);
            }

            renderCouponsTable(adminCoupons);
            bootstrap.Modal.getInstance(document.getElementById('couponModal')).hide();
            alert('Đã lưu mã giảm giá thành công!');
        });
    }
});
