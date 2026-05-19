// public/js/tenant-init.js
// এই file সব API call-এ X-Tenant-ID header যোগ করে
// app.js বা index.js-এ কোনো পরিবর্তন লাগবে না

(function () {
    // ১. URL থেকে tenant slug বের করো
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('tenant') || localStorage.getItem('tenantSlug') || 'asambasti';

    // ২. Slug localStorage-এ save করো (page reload-এ হারাবে না)
    localStorage.setItem('tenantSlug', slug);

    // ৩. fetch() monkey-patch — সব API call-এ header যোগ হবে
    const originalFetch = window.fetch;
    window.fetch = function (url, options = {}) {
        // শুধু /api/ calls-এ header দাও
        if (typeof url === 'string' && url.startsWith('/api/')) {
            options.headers = options.headers || {};
            // Headers object হলে আলাদা handle করো
            if (options.headers instanceof Headers) {
                options.headers.set('X-Tenant-ID', slug);
            } else {
                options.headers['X-Tenant-ID'] = slug;
            }
        }
        return originalFetch.call(this, url, options);
    };

    // ৪. Tenant info নিয়ে UI আপডেট করো
    fetch('/api/tenant-info')
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            const t = data.tenant;

            // Page title
            document.title = t.name_bn + ' — Horticulture Management';

            // Center নাম — login page এবং header
            document.querySelectorAll('.center-name, #center-name, .org-name').forEach(el => {
                el.textContent = t.name_bn;
            });

            // Location
            document.querySelectorAll('.center-location, #center-location, .org-location').forEach(el => {
                el.textContent = t.location;
            });

            // English name
            document.querySelectorAll('.center-name-en, #center-name-en').forEach(el => {
                el.textContent = t.name_en;
            });

            // Global-এ রাখো
            window.currentTenant = t;
        })
        .catch(() => {});

})();
