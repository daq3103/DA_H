// =================== ORDERS ===================
(function () {
'use strict';

const { escapeHTML, formatCurrency, formatDateVN: formatDate } = window.motoShared;
const ORDER_API_URL = '../api/admin_orders.php';

let adminOrders = [];
let paymentFilter = 'all';
let ordersUserIdFilter = null;
const ORDER_STATUS_KEYS = ['pending', 'contacted', 'completed', 'cancelled'];
const ORDER_STAT_FIELD_IDS = {
    pending: 'order-stat-pending',
    contacted: 'order-stat-contacted',
    completed: 'order-stat-completed',
    cancelled: 'order-stat-cancelled'
};
const DEFAULT_TEXT = '—';

function getPaymentMethodLabel(method) {
    if (method === 'qr_transfer') return 'Chuyển khoản QR';
    return 'COD (khi nhận hàng)';
}

function getPaymentMethodBadgeClass(method) {
    return method === 'qr_transfer' ? 'pay-qr' : 'pay-cod';
}

function getPaymentStatusLabel(status, method) {
    if (status === 'paid') {
        return method === 'qr_transfer' ? 'Đã thanh toán (QR)' : 'Đã thu tiền (COD)';
    }
    return method === 'qr_transfer' ? 'Chờ xác nhận QR' : 'Chưa thu tiền';
}

function getPaymentStatusBadgeClass(status) {
    return status === 'paid' ? 'pay-paid' : 'pay-unpaid';
}

function isQrOrder(order) {
    return order.payment_method === 'qr_transfer';
}

function renderPaymentStatusCell(order) {
    const paid = order.payment_status === 'paid';
    const badge = `<span class="status-badge ${getPaymentStatusBadgeClass(order.payment_status)}">${getPaymentStatusLabel(order.payment_status, order.payment_method)}</span>`;

    if (isQrOrder(order)) {
        return badge;
    }

    if (paid) {
        return badge;
    }

    return `
        <div class="d-flex flex-column gap-1" style="min-width:130px;">
            ${badge}
            <button type="button" class="btn btn-sm btn-success" style="font-size:0.72rem;padding:2px 8px;" onclick="confirmCodPayment(${order.id})">
                <i class="fas fa-money-bill-wave me-1"></i>Xác nhận thu tiền
            </button>
        </div>
    `;
}

function initOrdersUserFilter() {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('user_id');
    ordersUserIdFilter = uid ? parseInt(uid, 10) : null;
    const banner = document.getElementById('orders-user-filter-banner');
    const textEl = document.getElementById('orders-user-filter-text');
    if (!banner || !textEl || !ordersUserIdFilter) return;

    const order = adminOrders.find(o => o.user_id === ordersUserIdFilter);
    const label = order?.account_name || order?.user_email || `ID #${ordersUserIdFilter}`;
    textEl.innerHTML = `<i class="fas fa-user me-2"></i>Đang lọc đơn của tài khoản: <strong>${escapeHTML(label)}</strong>`;
    banner.classList.remove('d-none');
}

function renderOrderAccountCell(order) {
    if (!order.user_id) {
        return '<span class="text-muted small">Khách không đăng nhập</span>';
    }
    const label = escapeHTML(order.user_email || order.account_name || `User #${order.user_id}`);
    return `<a href="orders.html?user_id=${order.user_id}" class="text-decoration-none small" title="Lọc đơn của tài khoản">${label}</a>`;
}

async function loadOrders() {
    const tbody = document.getElementById('orders-tbody');
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('user_id');
    const url = uid ? `${ORDER_API_URL}?user_id=${encodeURIComponent(uid)}` : ORDER_API_URL;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.message || 'API lỗi');
        if (!Array.isArray(data)) throw new Error('Dữ liệu không hợp lệ');
        adminOrders = data;
    } catch (err) {
        console.warn('loadOrders:', err);
        adminOrders = [...(typeof DEMO_ORDERS !== 'undefined' ? DEMO_ORDERS : [])];
        if (uid) {
            const userId = parseInt(uid, 10);
            adminOrders = adminOrders.filter(o => o.user_id === userId);
        }
    }

    try {
        initOrdersUserFilter();
        renderOrdersTable(getFilteredOrders());
        updateOrderStats();
    } catch (renderErr) {
        console.error('renderOrders:', renderErr);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Lỗi hiển thị đơn hàng: ${escapeHTML(String(renderErr.message || renderErr))}</td></tr>`;
        }
    }
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

function getFilteredOrders() {
    const q = (document.getElementById('searchOrder')?.value || '').toLowerCase();
    return adminOrders.filter(o => {
        const matchSearch = !q ||
            o.customer_name.toLowerCase().includes(q) ||
            String(o.id).includes(q) ||
            (o.order_code && o.order_code.toLowerCase().includes(q)) ||
            (o.user_email && o.user_email.toLowerCase().includes(q)) ||
            (o.account_name && o.account_name.toLowerCase().includes(q));
        const method = o.payment_method === 'qr_transfer' ? 'qr_transfer' : 'cod';
        const matchPay = paymentFilter === 'all' || method === paymentFilter;
        const matchUser = !ordersUserIdFilter || o.user_id === ordersUserIdFilter;
        return matchSearch && matchPay && matchUser;
    });
}

function filterOrdersByPayment(type) {
    paymentFilter = type;
    document.querySelectorAll('.order-pay-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.payFilter === type);
    });
    renderOrdersTable(getFilteredOrders());
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5"><div class="empty-state"><i class="fas fa-shopping-bag d-block"></i><h5>Chưa có đơn hàng nào</h5></div></td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${o.order_code || o.id}</strong></td>
            <td>${renderOrderAccountCell(o)}</td>
            <td>${escapeHTML(o.customer_name)}</td>
            <td>${o.phone || '—'}</td>
            <td class="fw-bold">${formatCurrency(o.total_amount)}</td>
            <td><span class="status-badge ${getPaymentMethodBadgeClass(o.payment_method)}">${getPaymentMethodLabel(o.payment_method)}</span></td>
            <td>${renderPaymentStatusCell(o)}</td>
            <td>
                <select class="form-select form-select-sm" style="width:140px;font-size:0.78rem;border-radius:8px;" onchange="updateOrderStatus(${o.id}, this.value)" ${o.status === 'cancelled' ? 'disabled' : ''}>
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
    renderOrdersTable(getFilteredOrders());
}

async function patchOrder(id, payload) {
    try {
        await fetch(ORDER_API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...payload })
        });
    } catch (err) { /* demo */ }
}

async function updateOrderStatus(id, newStatus) {
    await patchOrder(id, { status: newStatus });
    const order = getOrderById(id);
    if (order) {
        order.status = newStatus;
        if (newStatus === 'completed' && !isQrOrder(order) && order.payment_status !== 'paid') {
            order.payment_status = 'paid';
        }
    }
    renderOrdersTable(getFilteredOrders());
    updateOrderStats();
}

async function confirmCodPayment(id) {
    if (!confirm('Xác nhận đã thu tiền COD từ khách hàng?')) return;
    await patchOrder(id, { payment_status: 'paid' });
    const order = getOrderById(id);
    if (order) order.payment_status = 'paid';
    renderOrdersTable(getFilteredOrders());
}

let currentViewOrderId = null;

function canPrintOrderInvoice(order) {
    if (!order) return false;
    if (order.status === 'cancelled') return false;
    return order.payment_status === 'paid' || order.status === 'completed';
}

function viewOrderDetail(id) {
    const o = getOrderById(id);
    if (!o) return;
    currentViewOrderId = id;
    const payHint = isQrOrder(o)
        ? 'Khách đã thanh toán qua QR khi đặt hàng — ưu tiên xử lý giao hàng.'
        : (o.payment_status === 'paid'
            ? 'Đã thu tiền COD — có thể hoàn tất đơn.'
            : 'Chưa thu tiền — xác nhận thu tiền khi giao hàng hoặc khi hoàn thành đơn.');

    document.getElementById('order-detail-id').textContent = '#' + (o.order_code || o.id);
    document.getElementById('order-detail-body').innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <h6 class="fw-bold mb-3"><i class="fas fa-user me-2"></i>Thông tin khách hàng</h6>
                <p class="mb-1"><strong>Họ tên:</strong> ${escapeHTML(o.customer_name)}</p>
                <p class="mb-1"><strong>SĐT:</strong> ${o.phone || DEFAULT_TEXT}</p>
                <p class="mb-1"><strong>Địa chỉ:</strong> ${escapeHTML(o.address || DEFAULT_TEXT)}</p>
                <p class="mb-0"><strong>Ghi chú:</strong> ${escapeHTML(o.notes || 'Không có')}</p>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold mb-3"><i class="fas fa-info-circle me-2"></i>Thông tin đơn hàng</h6>
                <p class="mb-1"><strong>Mã đơn:</strong> #${o.order_code || o.id}</p>
                <p class="mb-1"><strong>Tài khoản:</strong> ${o.user_id ? escapeHTML(o.user_email || o.account_name || ('User #' + o.user_id)) : 'Khách không đăng nhập'}</p>
                <p class="mb-1"><strong>Ngày đặt:</strong> ${formatDate(o.order_date)}</p>
                <p class="mb-1"><strong>Tổng tiền:</strong> <span class="text-danger fw-bold">${formatCurrency(o.total_amount)}</span></p>
                <p class="mb-1"><strong>Phương thức:</strong> <span class="status-badge ${getPaymentMethodBadgeClass(o.payment_method)}">${getPaymentMethodLabel(o.payment_method)}</span></p>
                <p class="mb-1"><strong>Thanh toán:</strong> <span class="status-badge ${getPaymentStatusBadgeClass(o.payment_status)}">${getPaymentStatusLabel(o.payment_status, o.payment_method)}</span></p>
                <p class="mb-1"><strong>Trạng thái đơn:</strong> <span class="status-badge ${o.status}">${getStatusText(o.status)}</span></p>
                <p class="mb-0 small text-muted"><i class="fas fa-lightbulb me-1"></i>${payHint}</p>
                ${!isQrOrder(o) && o.payment_status !== 'paid' && o.status !== 'cancelled' ? `
                <button type="button" class="btn btn-sm btn-success mt-2" onclick="confirmCodPayment(${o.id}); bootstrap.Modal.getInstance(document.getElementById('orderDetailModal'))?.hide();">
                    <i class="fas fa-money-bill-wave me-1"></i>Xác nhận thu tiền COD
                </button>` : ''}
            </div>
            <div class="col-12">
                <h6 class="fw-bold mb-3 mt-2"><i class="fas fa-list me-2"></i>Sản phẩm trong đơn</h6>
                <table class="admin-table">
                    <thead><tr><th>Mã SP</th><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                    <tbody>
                        ${(o.items || []).map(i => `
                            <tr>
                                <td><strong>#${i.product_id || '—'}</strong></td>
                                <td>${escapeHTML(i.product_name || '—')}</td>
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
    const printBtn = document.getElementById('btn-print-invoice');
    if (printBtn) {
        const allowPrint = canPrintOrderInvoice(o);
        printBtn.disabled = !allowPrint;
        printBtn.classList.toggle('d-none', !allowPrint);
        printBtn.title = allowPrint ? '' : 'Không in hóa đơn cho đơn đã hủy hoặc chưa thanh toán';
    }
    new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
}

function printAdminInvoice() {
    if (!currentViewOrderId) return;
    const o = getOrderById(currentViewOrderId);
    if (!o) return;
    if (!canPrintOrderInvoice(o)) {
        alert(o.status === 'cancelled'
            ? 'Đơn đã hủy, không thể in hóa đơn.'
            : 'Chỉ in hóa đơn khi đơn đã thanh toán hoặc hoàn thành.');
        return;
    }

    let printWindow = window.open('', '_blank');
    let itemsHtml = (o.items || []).map(i => `
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">#${i.product_id || '—'}</td>
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
            <title>Hóa Đơn #${o.order_code || o.id}</title>
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
                <p>motoShop - Cửa hàng xe máy chính hãng</p>
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
                    <p><strong>Mã Đơn:</strong> #${o.order_code || o.id}</p>
                    <p><strong>Ngày lập:</strong> ${formatDate(o.order_date)}</p>
                    <p><strong>Thanh toán:</strong> ${getPaymentMethodLabel(o.payment_method)} — ${getPaymentStatusLabel(o.payment_status, o.payment_method)}</p>
                    <p><strong>Nhân viên:</strong> In từ hệ thống</p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Mã SP</th>
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
                <p>Cảm ơn quý khách đã mua hàng tại motoShop!</p>
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

window.loadOrders = loadOrders;
window.filterOrdersByPayment = filterOrdersByPayment;
window.filterOrders = filterOrders;
window.updateOrderStatus = updateOrderStatus;
window.confirmCodPayment = confirmCodPayment;
window.viewOrderDetail = viewOrderDetail;
window.printAdminInvoice = printAdminInvoice;

})();
