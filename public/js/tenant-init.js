// public/js/tenant-init.js
// সব API call-এ X-Tenant-ID header যোগ করে + UI আপডেট করে

(function () {
    // ১. URL থেকে tenant slug বের করো
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('tenant') || localStorage.getItem('tenantSlug') || 'asambasti';

    // ২. Slug localStorage-এ save করো
    localStorage.setItem('tenantSlug', slug);

    // ৩. fetch() monkey-patch — সব API call-এ header যোগ হবে
    const originalFetch = window.fetch;
    window.fetch = function (url, options = {}) {
        if (typeof url === 'string' && url.startsWith('/api/')) {
            options.headers = options.headers || {};
            if (options.headers instanceof Headers) {
                options.headers.set('X-Tenant-ID', slug);
            } else {
                options.headers['X-Tenant-ID'] = slug;
            }
        }
        return originalFetch.call(this, url, options);
    };

    // ৪. UI আপডেট করার function
    function applyTenantUI(t) {
        // Page title
        document.title = t.name_bn + ' — Horticulture Management';

        // Login page (.lb এর ভেতরে)
        const loginBox = document.querySelector('.lb');
        if (loginBox) {
            const h1 = loginBox.querySelector('h1');
            if (h1) h1.textContent = t.name_bn;

            const su = loginBox.querySelector('.su');
            if (su) su.textContent = t.name_en.split(',')[0].trim();

            const lc = loginBox.querySelector('.lc');
            if (lc) lc.textContent = t.location;
        }

        // Sidebar (.sbl এর ভেতরে)
        const sbl = document.querySelector('.sbl');
        if (sbl) {
            const sh1 = sbl.querySelector('h1');
            if (sh1) sh1.textContent = '🌿 ' + t.name_bn;

            const sp = sbl.querySelector('p');
            if (sp) sp.textContent = t.location;
        }

        // Settings page
        const cfgNB = document.getElementById('cfgNB');
        if (cfgNB) cfgNB.value = t.name_bn + ', ' + t.location;

        const cfgNE = document.getElementById('cfgNE');
        if (cfgNE) cfgNE.value = t.name_en;

        window.currentTenant = t;
    }

    // ৫. Tenant info fetch করো
    fetch('/api/tenant-info')
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => applyTenantUI(data.tenant));
            } else {
                applyTenantUI(data.tenant);
            }
        })
        .catch(() => {});

})();
