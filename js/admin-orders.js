// =================== ORDERS ===================
let adminOrders = [];
const ORDER_API_URL = API_BASE + 'admin_orders.php';
const ORDER_STATUS_KEYS = ['pending', 'contacted', 'completed', 'cancelled'];
const ORDER_STAT_FIELD_IDS = {
    pending: 'order-stat-pending',
    contacted: 'order-stat-contacted',
    completed: 'order-stat-completed',
    cancelled: 'order-stat-cancelled'
};
const DEFAULT_TEXT = '—';

async function loadOrders() {
    try {
        const res = await fetch(ORDER_API_URL);
        adminOrders = await res.json();
        if (adminOrders.error) throw new Error();
    } catch (err) {
        adminOrders = [...DEMO_ORDERS];
    }
    renderOrdersTable(adminOrders);
    updateOrderStats();
}

function setTextById(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function getOrderById(id) {
    return adminOrders.find(order => order.id === id);
}

function updateOrderStats() {
    const stats = ORDER_STATUS_KEYS.reduce((acc, status) => {
        acc[status] = 0;
        return acc;
    }, {});

    adminOrders.forEach(order => {
        if (stats[order.status] !== undefined) stats[order.status] += 1;
    });

    ORDER_STATUS_KEYS.forEach(status => {
        setTextById(ORDER_STAT_FIELD_IDS[status], stats[status]);
    });
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
        await fetch(ORDER_API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });
    } catch (err) { /* demo */ }
    const order = getOrderById(id);
    if (order) order.status = newStatus;
    updateOrderStats();
}

let currentViewOrderId = null;

function viewOrderDetail(id) {
    const o = getOrderById(id);
    if (!o) return;
    currentViewOrderId = id;
    document.getElementById('order-detail-id').textContent = '#' + o.id;
    document.getElementById('order-detail-body').innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <h6 class="fw-bold mb-3"><i class="fas fa-user me-2"></i>Thông tin khách hàng</h6>
                <p class="mb-1"><strong>Họ tên:</strong> ${o.customer_name}</p>
                <p class="mb-1"><strong>SĐT:</strong> ${o.phone || DEFAULT_TEXT}</p>
                <p class="mb-1"><strong>Địa chỉ:</strong> ${o.address || DEFAULT_TEXT}</p>
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

function printAdminInvoice() {
    if (!currentViewOrderId) return;
    const o = getOrderById(currentViewOrderId);
    if (!o) return;

    let printWindow = window.open('', '_blank');
    let itemsHtml = (o.items || []).map(i => `
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.product_name}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i.quantity}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(i.unit_price)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(i.quantity * i.unit_price)}</td>
        </tr>
    `).join('');

    let html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Hóa Đơn #${o.id}</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; }
                .header p { margin: 5px 0 0; color: #666; }
                .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .info-box { width: 48%; }
                .info-box h3 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; font-size: 16px; text-transform: uppercase; }
                .info-box p { margin: 5px 0; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background-color: #f8f9fa; padding: 10px 8px; border: 1px solid #ddd; text-align: left; font-size: 14px; }
                .total-section { text-align: right; margin-top: 20px; font-size: 18px; }
                .total-section strong { font-size: 22px; color: #d9534f; }
                .footer { text-align: center; margin-top: 50px; font-size: 14px; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
                @media print {
                    body { padding: 0; max-width: 100%; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>HÓA ĐƠN BÁN HÀNG</h1>
                <p>MotoShop - Cửa hàng xe máy chính hãng</p>
            </div>
            
            <div class="info-section">
                <div class="info-box">
                    <h3>Thông tin khách hàng</h3>
                    <p><strong>Họ tên:</strong> ${o.customer_name}</p>
                    <p><strong>SĐT:</strong> ${o.phone || DEFAULT_TEXT}</p>
                    <p><strong>Địa chỉ:</strong> ${o.address || DEFAULT_TEXT}</p>
                </div>
                <div class="info-box">
                    <h3>Thông tin đơn hàng</h3>
                    <p><strong>Mã Đơn:</strong> #${o.id}</p>
                    <p><strong>Ngày lập:</strong> ${formatDate(o.order_date)}</p>
                    <p><strong>Nhân viên:</strong> In từ hệ thống</p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Tên sản phẩm</th>
                        <th style="text-align: center; width: 100px;">Số lượng</th>
                        <th style="text-align: right; width: 150px;">Đơn giá</th>
                        <th style="text-align: right; width: 150px;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div class="total-section">
                <p>Tổng cộng: <strong>${formatCurrency(o.total_amount)}</strong></p>
            </div>

            <div class="footer">
                <p>Cảm ơn quý khách đã mua hàng tại MotoShop!</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}
