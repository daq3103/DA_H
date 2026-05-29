/**
 * admin-reports.js — Báo cáo thống kê theo ngày / tuần / tháng
 */

const { escapeHTML, formatCurrency } = window.MotoShared || {};

let currentReportPeriod = 'today';
let stockInventoryData = [];
let salesByPhoneData = [];
let salesByProductData = [];
let currentStockFilter = 'all';

async function loadReports(period) {
    currentReportPeriod = period || 'today';

    document.querySelectorAll('[data-report-period]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.reportPeriod === currentReportPeriod);
    });

    setLoadingState();

    try {
        const res = await fetch(`${API_BASE}admin_reports.php?period=${currentReportPeriod}`);
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Lỗi tải báo cáo');
        }

        renderReportStats(data);
        renderSalesByProduct(data.sales_by_product || [], data.total_units_sold ?? 0);
        renderSalesByPhone(data.sales_by_phone || []);
        if (data.stock_inventory) {
            renderStockInventory(data.stock_summary, data.stock_inventory);
        }
    } catch (err) {
        loadReportsDemo(currentReportPeriod);
    }
}

function setLoadingState() {
    const productTbody = document.getElementById('sales-product-tbody');
    const phoneTbody = document.getElementById('sales-phone-tbody');
    if (productTbody) {
        productTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Đang tải...</td></tr>';
    }
    if (phoneTbody) {
        phoneTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Đang tải...</td></tr>';
    }
}

function renderSalesByProduct(items, totalUnits) {
    salesByProductData = items || [];
    const badge = document.getElementById('report-units-sold-badge');
    if (badge) badge.textContent = `${totalUnits} xe đã bán`;

    const tbody = document.getElementById('sales-product-tbody');
    if (!tbody) return;

    if (!salesByProductData.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Chưa có sản phẩm bán trong kỳ này</td></tr>';
        return;
    }

    tbody.innerHTML = salesByProductData.map((p, index) => `
        <tr>
            <td><strong>#${p.product_id || '—'}</strong></td>
            <td>${escapeHTML(p.name || '—')}</td>
            <td>${escapeHTML(p.brand || '—')}</td>
            <td class="text-center fw-bold">${p.qty_sold}</td>
            <td class="text-center">${p.order_count}</td>
            <td class="text-end fw-bold" style="color:#2563eb;">${formatCurrency(p.revenue || 0)}</td>
        </tr>
    `).join('');
}

function renderSalesByPhone(items) {
    salesByPhoneData = items || [];
    filterSalesByPhone();
}

window.filterSalesByPhone = function() {
    const tbody = document.getElementById('sales-phone-tbody');
    if (!tbody) return;

    const q = (document.getElementById('searchReportPhone')?.value || '').toLowerCase().trim();
    let list = salesByPhoneData;
    if (q) {
        list = list.filter(row =>
            (row.phone || '').toLowerCase().includes(q) ||
            (row.name || '').toLowerCase().includes(q)
        );
    }

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Không có dữ liệu phù hợp</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(row => `
        <tr>
            <td><strong>${escapeHTML(row.phone || '—')}</strong></td>
            <td>${escapeHTML(row.name || '—')}</td>
            <td class="text-center fw-bold">${row.order_count}</td>
            <td class="text-center ${row.cancelled_count > 0 ? 'text-danger' : 'text-muted'}">${row.cancelled_count}</td>
            <td class="text-end">${formatCurrency(row.total_amount || 0)}</td>
            <td class="text-end fw-bold text-success">${formatCurrency(row.completed_amount || 0)}</td>
        </tr>
    `).join('');
};

function getStockLevelLabel(level) {
    const map = { ok: 'Đủ hàng', low: 'Sắp hết', out: 'Hết hàng' };
    return map[level] || '—';
}

function renderStockInventory(summary, items) {
    stockInventoryData = items || [];
    summary = summary || {};

    setTextIfExists('stock-total-products', summary.total_products ?? 0);
    setTextIfExists('stock-total-units', summary.total_units ?? 0);
    setTextIfExists('stock-low-count', summary.low_stock ?? 0);
    setTextIfExists('stock-out-count', summary.out_of_stock ?? 0);

    filterStockReport(currentStockFilter);
}

window.filterStockReport = function(level) {
    currentStockFilter = level || 'all';

    document.querySelectorAll('.stock-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.stockFilter === currentStockFilter);
    });

    const tbody = document.getElementById('stock-inventory-tbody');
    if (!tbody) return;

    let list = stockInventoryData;
    if (currentStockFilter === 'low') {
        list = list.filter(p => p.stock_level === 'low');
    } else if (currentStockFilter === 'out') {
        list = list.filter(p => p.stock_level === 'out');
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Không có sản phẩm phù hợp bộ lọc</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(p => `
        <tr>
            <td><strong>#${p.id}</strong></td>
            <td><code class="small">${escapeHTML(p.slug || '')}</code></td>
            <td>${escapeHTML(p.name || '')}</td>
            <td>${escapeHTML(p.brand || '—')}</td>
            <td class="text-muted small">${escapeHTML(p.category || '—')}</td>
            <td class="text-center fw-bold">${p.stock_quantity}</td>
            <td class="text-center">
                <span class="status-badge stock-${p.stock_level}">${getStockLevelLabel(p.stock_level)}</span>
            </td>
        </tr>
    `).join('');
};

function renderReportStats(data) {
    setTextIfExists('report-period-label', data.period_label || '');
    setTextIfExists('report-orders-total', data.orders_total ?? 0);
    setTextIfExists('report-revenue', formatCurrency(data.revenue || 0));
    setTextIfExists('report-completed', data.orders_completed ?? 0);
    setTextIfExists('report-pending', data.orders_pending ?? 0);
    setTextIfExists('report-cancelled', data.orders_cancelled ?? 0);
    setTextIfExists('report-customers', data.new_customers ?? 0);
}

function buildDemoSalesByPhone(orders) {
    const map = {};
    orders.forEach(o => {
        const phone = o.phone || '—';
        if (!map[phone]) {
            map[phone] = {
                phone,
                name: o.customer_name,
                order_count: 0,
                total_amount: 0,
                completed_amount: 0,
                cancelled_count: 0
            };
        }
        map[phone].order_count += 1;
        map[phone].total_amount += o.total_amount;
        if (o.status === 'completed') map[phone].completed_amount += o.total_amount;
        if (o.status === 'cancelled') map[phone].cancelled_count += 1;
    });
    return Object.values(map).sort((a, b) => b.order_count - a.order_count);
}

function buildDemoSalesByProduct(orders) {
    const map = {};
    let totalUnits = 0;

    orders.filter(o => o.status !== 'cancelled').forEach(o => {
        (o.items || []).forEach(item => {
            const pid = item.product_id || 0;
            if (!map[pid]) {
                const prod = DEMO_PRODUCTS.find(p => p.id === pid);
                map[pid] = {
                    product_id: pid,
                    name: item.product_name || prod?.name || `SP #${pid}`,
                    brand: prod?.brand || '—',
                    qty_sold: 0,
                    revenue: 0,
                    order_count: 0,
                    _orderIds: new Set()
                };
            }
            map[pid].qty_sold += item.quantity || 1;
            map[pid].revenue += (item.unit_price || 0) * (item.quantity || 1);
            map[pid]._orderIds.add(o.id);
            totalUnits += item.quantity || 1;
        });
    });

    const list = Object.values(map).map(row => {
        row.order_count = row._orderIds.size;
        delete row._orderIds;
        return row;
    }).sort((a, b) => b.qty_sold - a.qty_sold);

    return { list, totalUnits };
}

/** Demo khi không có API */
function loadReportsDemo(period) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    function inPeriod(dateStr) {
        const d = new Date(dateStr);
        if (period === 'all') return true;
        if (period === 'today') {
            return d.toDateString() === now.toDateString();
        }
        if (period === 'week') {
            return d >= startOfWeek && d <= now;
        }
        if (period === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (period === 'year') {
            return d.getFullYear() === now.getFullYear();
        }
        return true;
    }

    const orders = DEMO_ORDERS.filter(o => inPeriod(o.order_date));
    const completed = orders.filter(o => o.status === 'completed');
    const revenue = completed.reduce((s, o) => s + o.total_amount, 0);

    const labels = { today: 'Hôm nay', week: 'Tuần này', month: 'Tháng này', year: 'Năm nay', all: 'Tất cả' };

    renderReportStats({
        period_label: labels[period] || period,
        orders_total: orders.length,
        orders_completed: completed.length,
        orders_pending: orders.filter(o => o.status === 'pending').length,
        orders_cancelled: orders.filter(o => o.status === 'cancelled').length,
        revenue,
        new_customers: 0
    });

    const { list, totalUnits } = buildDemoSalesByProduct(orders);
    renderSalesByProduct(list, totalUnits);
    renderSalesByPhone(buildDemoSalesByPhone(orders));

    const stockItems = DEMO_PRODUCTS.map(p => {
        const qty = p.stock_quantity ?? 0;
        let stockLevel = 'ok';
        if (qty <= 0) stockLevel = 'out';
        else if (qty <= 5) stockLevel = 'low';
        return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            category: p.category,
            stock_quantity: qty,
            stock_level: stockLevel
        };
    });
    const summary = {
        total_products: stockItems.length,
        total_units: stockItems.reduce((s, p) => s + p.stock_quantity, 0),
        out_of_stock: stockItems.filter(p => p.stock_level === 'out').length,
        low_stock: stockItems.filter(p => p.stock_level === 'low').length
    };
    renderStockInventory(summary, stockItems);
}
