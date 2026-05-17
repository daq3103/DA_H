// =================== COUPONS ===================
let adminCoupons = [];
const COUPON_API_URL = API_BASE + 'admin_coupons.php';
const COUPON_FIELD_IDS = {
    id: 'cpn_id',
    code: 'cpn_code',
    description: 'cpn_desc',
    type: 'cpn_type',
    value: 'cpn_value',
    minOrder: 'cpn_min_order',
    maxDiscount: 'cpn_max_discount',
    maxUses: 'cpn_max_uses',
    startsAt: 'cpn_starts',
    expiresAt: 'cpn_expires',
    status: 'cpn_status'
};

const DEMO_COUPONS = [
    { id:1, code:'WELCOME10', description:'Giảm 10% cho khách hàng mới', discount_type:'percent', discount_value:10, min_order_amount:20000000, max_discount:5000000, max_uses:100, used_count:12, starts_at:null, expires_at:'2027-12-31T23:59:59', status:'active', created_at:'2026-01-01' },
    { id:2, code:'GIAM500K', description:'Giảm 500,000đ cho đơn từ 30 triệu', discount_type:'fixed', discount_value:500000, min_order_amount:30000000, max_discount:null, max_uses:50, used_count:8, starts_at:null, expires_at:'2027-06-30T23:59:59', status:'active', created_at:'2026-02-15' },
    { id:3, code:'SUMMER2026', description:'Ưu đãi mùa hè - Giảm 5%', discount_type:'percent', discount_value:5, min_order_amount:0, max_discount:3000000, max_uses:null, used_count:25, starts_at:null, expires_at:'2026-08-31T23:59:59', status:'active', created_at:'2026-05-01' }
];

async function loadCoupons() {
    try {
        const res = await fetch(COUPON_API_URL);
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
    const type = document.getElementById(COUPON_FIELD_IDS.type).value;
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
    document.getElementById(COUPON_FIELD_IDS.id).value = '';
    toggleCouponFields();
}

function openEditCoupon(id) {
    const c = adminCoupons.find(x => x.id === id);
    if (!c) return;
    document.getElementById('couponModalTitle').textContent = 'Sửa Mã Giảm Giá';
    document.getElementById(COUPON_FIELD_IDS.id).value = c.id;
    document.getElementById(COUPON_FIELD_IDS.code).value = c.code;
    document.getElementById(COUPON_FIELD_IDS.description).value = c.description || '';
    document.getElementById(COUPON_FIELD_IDS.type).value = c.discount_type;
    document.getElementById(COUPON_FIELD_IDS.value).value = c.discount_value;
    document.getElementById(COUPON_FIELD_IDS.minOrder).value = c.min_order_amount || 0;
    document.getElementById(COUPON_FIELD_IDS.maxDiscount).value = c.max_discount || '';
    document.getElementById(COUPON_FIELD_IDS.maxUses).value = c.max_uses || '';
    document.getElementById(COUPON_FIELD_IDS.status).value = c.status;
    
    document.getElementById(COUPON_FIELD_IDS.startsAt).value = c.starts_at ? c.starts_at.slice(0, 16) : '';
    document.getElementById(COUPON_FIELD_IDS.expiresAt).value = c.expires_at ? c.expires_at.slice(0, 16) : '';
    
    toggleCouponFields();
    new bootstrap.Modal(document.getElementById('couponModal')).show();
}

async function deleteCoupon(id) {
    if (!confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    try {
        await fetch(COUPON_API_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
    } catch (err) { /* demo */ }
    adminCoupons = adminCoupons.filter(c => c.id !== id);
    renderCouponsTable(adminCoupons);
}

function parseNumber(value, fallback = 0) {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function parseInteger(value, fallback = null) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function getCouponFormData() {
    const idValue = document.getElementById(COUPON_FIELD_IDS.id).value;
    const codeValue = document.getElementById(COUPON_FIELD_IDS.code).value;
    const maxDiscountValue = document.getElementById(COUPON_FIELD_IDS.maxDiscount).value;
    const maxUsesValue = document.getElementById(COUPON_FIELD_IDS.maxUses).value;

    return {
        id: idValue ? parseInteger(idValue) : null,
        code: codeValue.toUpperCase().trim(),
        description: document.getElementById(COUPON_FIELD_IDS.description).value,
        discount_type: document.getElementById(COUPON_FIELD_IDS.type).value,
        discount_value: parseNumber(document.getElementById(COUPON_FIELD_IDS.value).value),
        min_order_amount: parseNumber(document.getElementById(COUPON_FIELD_IDS.minOrder).value, 0),
        max_discount: maxDiscountValue ? parseNumber(maxDiscountValue) : null,
        max_uses: maxUsesValue ? parseInteger(maxUsesValue) : null,
        starts_at: document.getElementById(COUPON_FIELD_IDS.startsAt).value || null,
        expires_at: document.getElementById(COUPON_FIELD_IDS.expiresAt).value || null,
        status: document.getElementById(COUPON_FIELD_IDS.status).value
    };
}

async function saveCoupon(couponData) {
    const method = couponData.id ? 'PUT' : 'POST';
    const res = await fetch(COUPON_API_URL, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(couponData)
    });
    return res.json();
}

function assignCouponId(couponData) {
    if (couponData.id) return;
    couponData.id = adminCoupons.length > 0 ? Math.max(...adminCoupons.map(c => c.id)) + 1 : 1;
}

function upsertCouponLocal(couponData) {
    const idx = couponData.id ? adminCoupons.findIndex(c => c.id === couponData.id) : -1;
    if (idx !== -1) {
        adminCoupons[idx] = { ...adminCoupons[idx], ...couponData };
        return;
    }
    assignCouponId(couponData);
    couponData.used_count = 0;
    adminCoupons.push(couponData);
}

onReady(() => {
    const form = el('couponForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const couponData = getCouponFormData();

            try {
                const result = await saveCoupon(couponData);
                if (!couponData.id && result.id) couponData.id = result.id;
            } catch (err) {
                console.warn('Demo mode - not saved to DB');
            }

            upsertCouponLocal(couponData);

            renderCouponsTable(adminCoupons);
            bootstrap.Modal.getInstance(document.getElementById('couponModal')).hide();
            alert('Đã lưu mã giảm giá thành công!');
        });
    }
});
