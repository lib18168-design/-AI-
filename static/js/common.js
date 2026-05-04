function showPage(pageId) {
    const homePage = document.getElementById('homePage');
    const pages = ['imageAnalysisPage', 'videoPromptPage', 'visualParsePage', 'aiGeneratePage'];
    if (homePage) homePage.classList.add('hidden');
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    if (pageId === 'home') {
        if (homePage) homePage.classList.remove('hidden');
    } else {
        const target = document.getElementById(pageId);
        if (target) target.classList.remove('hidden');
    }
}

function bindFeatureCards() {
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', () => {
            const pageId = card.getAttribute('data-page');
            if (pageId) showPage(pageId);
        });
    });
}

window.showPage = showPage;
window.bindFeatureCards = bindFeatureCards;
// ========== 图片灯箱组件 ==========
(function() {
    let lightbox = null;

    function ensureLightbox() {
        if (lightbox) return lightbox;
        lightbox = document.createElement('div');
        lightbox.id = 'globalLightbox';
        lightbox.className = 'fixed inset-0 bg-black/80 z-50 hidden items-center justify-center p-4';
        lightbox.innerHTML = `
            <div class="relative max-w-5xl max-h-full">
                <img class="max-w-full max-h-[85vh] rounded-lg shadow-2xl" alt="预览">
                <button class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 backdrop-blur text-white text-2xl flex items-center justify-center hover:bg-white/40 transition">&times;</button>
            </div>
        `;
        document.body.appendChild(lightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.closest('button')) {
                lightbox.classList.add('hidden');
            }
        });
        return lightbox;
    }

    function openLightbox(imgSrc) {
        const lb = ensureLightbox();
        const img = lb.querySelector('img');
        if (img) img.src = imgSrc;
        lb.classList.remove('hidden');
    }

    // 全局委托：点击任何图片都触发灯箱（排除按钮内的小图标等，非 img 元素没问题）
    document.addEventListener('click', (e) => {
        const img = e.target.closest('img');
        if (img && img.src && !img.closest('.no-lightbox')) {
            e.preventDefault();
            openLightbox(img.src);
        }
    });

    window.openLightbox = openLightbox;
})();
// ========== 移动端侧边抽屉导航 ==========
(function() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const drawer = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('mobileDrawerOverlay');
    if (!menuBtn || !drawer) return;

    function openDrawer() {
        document.body.classList.add('mobile-sidebar-open');
    }
    function closeDrawer() {
        document.body.classList.remove('mobile-sidebar-open');
    }
    menuBtn.addEventListener('click', openDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
    // 点击抽屉内的导航链接关闭抽屉
    drawer.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            closeDrawer();
            // 注意：现有的 showPage 函数会处理页面跳转，链接带有 data-page 属性
            const page = link.getAttribute('data-page');
            if (page && typeof window.showPage === 'function') {
                window.showPage(page);
            }
        });
    });
    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('mobile-sidebar-open')) {
            closeDrawer();
        }
    });
})();