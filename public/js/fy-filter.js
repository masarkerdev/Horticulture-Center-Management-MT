// ============================================================
// FY FILTER — Global Fiscal Year Filter
// ============================================================

function getCurrentFY() {
    const now = new Date();
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

let selectedFY = parseInt(sessionStorage.getItem('hc_fy')) || getCurrentFY();

// api() patch — GET call-এ ?fy= যোগ
const _origApi = window.api;
window.api = async function(u, o = {}) {
    if ((!o.method || o.method.toUpperCase() === 'GET') && !u.includes('fy=')) {
        u = u + (u.includes('?') ? '&' : '?') + 'fy=' + selectedFY;
    }
    return _origApi(u, o);
};

// FY change
window.changeFY = function(fy) {
    selectedFY = fy;
    sessionStorage.setItem('hc_fy', fy);
    const activePage = document.querySelector('.pg.active');
    if (activePage) {
        const pageId = activePage.id.replace('pg-', '');
        if (typeof lrs !== 'undefined' && lrs[pageId]) lrs[pageId]();
    }
    toast('FY ' + fy + '-' + (fy+1) + ' নির্বাচিত');
};

// FY picker inject
function injectFYPicker() {
    if (document.getElementById('globalFYPicker')) return;

    // tav (topbar avatar) খোঁজো
    const tav = document.getElementById('tav');
    if (!tav) { setTimeout(injectFYPicker, 400); return; }

    // app active না হলে retry
    const app = document.getElementById('app');
    if (!app || !app.classList.contains('active')) {
        setTimeout(injectFYPicker, 400); return;
    }

    const curFY = getCurrentFY();
    let opts = '';
    for (let y = curFY; y >= curFY - 4; y--) {
        opts += `<option value="${y}"${y === selectedFY ? ' selected' : ''}>FY ${y}-${y+1}</option>`;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:5px;margin-right:8px;flex-shrink:0';
    wrapper.innerHTML = `
        <span style="font-size:11px;color:var(--tm);white-space:nowrap">অর্থবছর:</span>
        <select id="globalFYPicker"
            onchange="changeFY(parseInt(this.value))"
            style="background:var(--bg);border:1px solid var(--bd);
                   color:var(--tp);padding:5px 10px;border-radius:7px;
                   font-size:12px;font-family:var(--fb);cursor:pointer;min-height:34px">
            ${opts}
        </select>`;

    // tav-এর আগে insert
    tav.parentNode.insertBefore(wrapper, tav);
}

// showApp patch
const _origShowApp = window.showApp;
window.showApp = function() {
    _origShowApp.apply(this, arguments);
    setTimeout(injectFYPicker, 300);
};

// Already logged in হলে
(function tryInject() {
    if (document.getElementById('tav') &&
        document.getElementById('app')?.classList.contains('active')) {
        injectFYPicker();
    } else {
        setTimeout(tryInject, 400);
    }
})();
