/**
 * Bootstrap riêng cho admin app.
 * Tách phần init khỏi admin.js để file chính giữ logic nghiệp vụ.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const admin = checkAuth();
    if (!admin) return;

    const nameEl = document.getElementById('topbar-admin-name');
    const avatarEl = document.getElementById('topbar-avatar');
    if (nameEl) nameEl.textContent = admin.full_name || 'Admin';
    if (avatarEl) avatarEl.textContent = (admin.full_name || 'A').charAt(0).toUpperCase();

    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    const page = getCurrentPage();
    if (page === 'index') await loadDashboard();
    if (page === 'products') await loadProducts();
    if (page === 'orders') await loadOrders();
    if (page === 'customers') await loadCustomers();
    if (page === 'news') await loadNews();
    if (page === 'contacts') await loadContacts();
    if (page === 'coupons') await loadCoupons();
});
