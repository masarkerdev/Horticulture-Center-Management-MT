// public/js/tenant-init.js
(function () {
    // ১. URL থেকে tenant slug বের করো
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('tenant') || localStorage.getItem('tenantSlug') || 'asambasti';

    // ২. localStorage ও Cookie-তে save করো
    localStorage.setItem('tenantSlug', slug);
    document.cookie = 'tenant=' + slug + '; path=/; max-age=86400';

    // ৩. fetch() monkey-patch
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

    // ৪. XMLHttpRequest monkey-patch — XHR-এও header যোগ হবে
    const OriginalXHR = window.XMLHttpRequest;
    function PatchedXHR() {
        const xhr = new OriginalXHR();
        const originalOpen = xhr.open.bind(xhr);
        const originalSend = xhr.send.bind(xhr);
        let _url = '';
        xhr.open = function (method, url, ...args) {
            _url = url;
            return originalOpen(method, url, ...args);
        };
        xhr.send = function (...args) {
            if (typeof _url === 'string' && _url.startsWith('/api/')) {
                try { xhr.setRequestHeader('X-Tenant-ID', slug); } catch(e) {}
            }
            return originalSend(...args);
        };
        return xhr;
    }
    PatchedXHR.prototype = OriginalXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    // ৫. UI আপডেট function
    function applyTenantUI(t) {
        document.title = t.name_bn + ' — Horticulture Management';
        const loginBox = document.querySelector('.lb');
        if (loginBox) {
            const h1 = loginBox.querySelector('h1');
            if (h1) h1.textContent = t.name_bn;
            const su = loginBox.querySelector('.su');
            if (su) su.textContent = t.name_en.split(',')[0].trim();
            const lc = loginBox.querySelector('.lc');
            if (lc) lc.textContent = t.location;
        }
        const sbl = document.querySelector('.sbl');
        if (sbl) {
            const sh1 = sbl.querySelector('h1');
            if (sh1) sh1.textContent = '🌿 ' + t.name_bn;
            const sp = sbl.querySelector('p');
            if (sp) sp.textContent = t.location;
        }
        const cfgNB = document.getElementById('cfgNB');
        if (cfgNB) cfgNB.value = t.name_bn + ', ' + t.location;
        const cfgNE = document.getElementById('cfgNE');
        if (cfgNE) cfgNE.value = t.name_en;
        window.currentTenant = t;
    }

    // ৬. Tenant info fetch করো
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
