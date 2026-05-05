// =================== ORDERS ===================
let adminOrders = [];

async function loadOrders() {
    try {
        const res = await fetch(API_BASE + 'admin_orders.php');
        adminOrders = await res.json();
        if (adminOrders.error) throw new Error();
    } catch (err) {
        adminOrders = [...DEMO_ORDERS];
    }
    renderOrdersTable(adminOrders);
    updateOrderStats();
}

function updateOrderStats() {
    const stats = { pending: 0, contacted: 0, completed: 0, cancelled: 0 };
    adminOrders.forEach(o => { if (stats[o.status] !== undefined) stats[o.status]++; });
    const getById = (id) => document.getElementById(id);
    if (getById('order-stat-pending')) getById('order-stat-pending').textContent = stats.pending;
    if (getById('order-stat-contacted')) getById('order-stat-contacted').textContent = stats.contacted;
    if (getById('order-stat-completed')) getById('order-stat-completed').textContent = stats.completed;
    if (getById('order-stat-cancelled')) getById('order-stat-cancelled').textContent = stats.cancelled;
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5"><div class="empty-state"><i class="fas fa-shopping-bag d-block"></i><h5>Chưa có đơn hàng nào</h5></div></td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${o.id}</strong></td>
            <td>${o.customer_name}</td>
            <td>${o.phone || '—'}</td>
            <td class="fw-bold">${formatCurrency(o.total_amount)}</td>
            <td>
                <select class="form-select form-select-sm" style="width:140px;font-size:0.78rem;border-radius:8px;" onchange="updateOrderStatus(${o.id}, this.value)">
                    <option value="pending" ${o.status==='pending'?'selected':''}>Chờ xử lý</option>
                    <option value="contacted" ${o.status==='contacted'?'selected':''}>Đã liên hệ</option>
                    <option value="completed" ${o.status==='completed'?'selected':''}>Hoàn thành</option>
                    <option value="cancelled" ${o.status==='cancelled'?'selected':''}>Đã hủy</option>
                </select>
            </td>
            <td class="text-muted">${formatDate(o.order_date)}</td>
            <td>
                <button class="btn-action btn-view" onclick="viewOrderDetail(${o.id})" title="Xem"><i class="fas fa-eye"></i></button>
            </td>
        </tr>
    `).join('');
}

function filterOrders() {
    const q = document.getElementById('searchOrder').value.toLowerCase();
    const filtered = adminOrders.filter(o => o.customer_name.toLowerCase().includes(q) || String(o.id).includes(q));
    renderOrdersTable(filtered);
}

async function updateOrderStatus(id, newStatus) {
    try {
        await fetch(API_BASE + 'admin_orders.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });
    } catch (err) { /* demo */ }
    const order = adminOrders.find(o => o.id === id);
    if (order) order.status = newStatus;
    updateOrderStats();
}

function viewOrderDetail(id) {
    const o = adminOrders.find(x => x.id === id);
    if (!o) return;
    document.getElementById('order-detail-id').textContent = '#' + o.id;
    document.getElementById('order-detail-body').innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <h6 class="fw-bold mb-3"><i class="fas fa-user me-2"></i>Thông tin khách hàng</h6>
                <p class="mb-1"><strong>Họ tên:</strong> ${o.customer_name}</p>
                <p class="mb-1"><strong>SĐT:</strong> ${o.phone || '—'}</p>
                <p class="mb-1"><strong>Địa chỉ:</strong> ${o.address || '—'}</p>
                <p class="mb-0"><strong>Ghi chú:</strong> ${o.notes || 'Không có'}</p>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold mb-3"><i class="fas fa-info-circle me-2"></i>Thông tin đơn hàng</h6>
                <p class="mb-1"><strong>Mã đơn:</strong> #${o.id}</p>
                <p class="mb-1"><strong>Ngày đặt:</strong> ${formatDate(o.order_date)}</p>
                <p class="mb-1"><strong>Tổng tiền:</strong> <span class="text-danger fw-bold">${formatCurrency(o.total_amount)}</span></p>
                <p class="mb-0"><strong>Trạng thái:</strong> <span class="status-badge ${o.status}">${getStatusText(o.status)}</span></p>
            </div>
            <div class="col-12">
                <h6 class="fw-bold mb-3 mt-2"><i class="fas fa-list me-2"></i>Sản phẩm trong đơn</h6>
                <table class="admin-table">
                    <thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                    <tbody>
                        ${(o.items || []).map(i => `
                            <tr>
                                <td>${i.product_name}</td>
                                <td>${i.quantity}</td>
                                <td>${formatCurrency(i.unit_price)}</td>
                                <td class="fw-bold">${formatCurrency(i.quantity * i.unit_price)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
}
