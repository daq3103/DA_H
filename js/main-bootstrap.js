/**
 * Bootstrap riêng cho storefront.
 * Tách phần init khỏi main.js để file chính tập trung business logic.
 */
(function() {
    // Tự động chuyển hướng sang localhost nếu mở bằng file://
    if (window.location.protocol === 'file:') {
        const path = window.location.pathname;
        const match = path.match(/\/shop\/(.*)/i);
        if (match) {
            const page = match[1] || 'index.html';
            window.location.href = 'http://localhost/shop/' + page;
            return;
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (typeof window.motoInitStorefront === 'function') {
            await window.motoInitStorefront();
        }
    });
})();
