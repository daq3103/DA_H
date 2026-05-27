/**
 * admin-reports.js — Báo cáo thống kê theo ngày / tuần / tháng
 */

let currentReportPeriod = 'today';
let stockInventoryData = [];
let currentStockFilter = 'all';

async function loadReports(period) {
    currentReportPeriod = period || 'today';

    document.querySelectorAll('[data-report-period]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.reportPeriod === currentReportPeriod);
    });

    const container = document.getElementById('report-chart-bars');
    if (container) {
        container.innerHTML = '<p class="text-muted text-center small py-4">Đang tải...</p>';
    }

    try {
        const res = await fetch(`${API_BASE}admin_reports.php?period=${currentReportPeriod}`);
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Lỗi tải báo cáo');
        }

        renderReportStats(data);
        renderReportChart(data.chart_7days || []);
        if (data.stock_inventory) {
            renderStockInventory(data.stock_summary, data.stock_inventory);
        }
    } catch (err) {
        loadReportsDemo(currentReportPeriod);
    }
}

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
}

function renderReportStats(data) {
    setTextIfExists('report-period-label', data.period_label || '');
    setTextIfExists('report-orders-total', data.orders_total ?? 0);
    setTextIfExists('report-revenue', formatCurrency(data.revenue || 0));
    setTextIfExists('report-completed', data.orders_completed ?? 0);
    setTextIfExists('report-pending', data.orders_pending ?? 0);
    setTextIfExists('report-cancelled', data.orders_cancelled ?? 0);
    setTextIfExists('report-customers', data.new_customers ?? 0);
}

function renderReportChart(chartData) {
    const container = document.getElementById('report-chart-bars');
    if (!container) return;

    if (!chartData.length) {
        container.innerHTML = '<p class="text-muted text-center small py-4">Chưa có dữ liệu</p>';
        return;
    }

    const maxOrders = Math.max(...chartData.map(d => d.orders_count), 1);

    container.innerHTML = chartData.map(day => {
        const height = Math.round((day.orders_count / maxOrders) * 100);
        const title = `${day.label}: ${day.orders_count} đơn, ${formatCurrency(day.revenue)}`;
        return `
            <div class="report-bar-item" title="${escapeHTML(title)}">
                <div class="report-bar-track">
                    <div class="report-bar-fill" style="height: ${Math.max(height, 4)}%;"></div>
                </div>
                <span class="report-bar-value">${day.orders_count}</span>
                <span class="report-bar-label">${day.label}</span>
            </div>
        `;
    }).join('');
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

    const chart = [];
    for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        const dayStr = day.toISOString().slice(0, 10);
        const dayOrders = DEMO_ORDERS.filter(o => o.order_date && o.order_date.slice(0, 10) === dayStr);
        chart.push({
            label: `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`,
            orders_count: dayOrders.length,
            revenue: dayOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total_amount, 0)
        });
    }
    renderReportChart(chart);

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
