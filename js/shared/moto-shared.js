/**
 * Shared utilities for motoShop frontend/admin.
 * Keep this file framework-agnostic and side-effect free.
 */
(function(global) {
    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
    };

    const formatDateVN = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    function fixImageUrlForStore(url) {
        if (!url) return 'https://via.placeholder.com/400x300?text=No+Image';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('/uploads/')) return url.substring(1);
        if (url.match(/^\/\w+\/uploads\//)) return 'uploads/' + url.split('/uploads/')[1];
        return url;
    }

    function fixImageUrlForAdmin(url) {
        if (!url) return 'https://via.placeholder.com/80x60?text=No+Image';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('../uploads/')) return url;
        if (url.startsWith('/uploads/')) return '..' + url;
        if (url.match(/^\/\w+\/uploads\//)) return '../uploads/' + url.split('/uploads/')[1];
        return url;
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    global.motoShared = {
        formatCurrency,
        formatDateVN,
        fixImageUrlForStore,
        fixImageUrlForAdmin,
        escapeHTML
    };
})(window);
