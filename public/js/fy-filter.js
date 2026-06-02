// ============================================================
// FY FILTER — Global Fiscal Year Filter for Center App
// এই file app.js এর পরে load করুন
// ============================================================

// ১. Current FY নির্ধারণ
function getCurrentFY() {
    const now = new Date();
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

// ২. Global FY state
let selectedFY = getCurrentFY();

// ৩. Original api() patch করো — সব GET call-এ ?fy= যোগ হবে
const _originalApi = api;
window.api = async function(u, o = {}) {
    // শুধু GET call-এ FY যোগ করো
    if ((!o.method || o.method.toUpperCase() === 'GET') && !u.includes('fy=')) {
        const sep = u.includes('?') ? '&' : '?';
        u = u + sep + 'fy=' + selectedFY;
    }
    return _originalApi(u, o);
};

// ৪. FY change করলে current page reload হবে
function changeFY(fy) {
    selectedFY = fy;
    sessionStorage.setItem('hc_fy', fy);
    // Current active page reload
    const activePage = document.querySelector('.pg.active');
    if (activePage) {
        const pageId = activePage.id.replace('pg-', '');
        if (typeof lrs !== 'undefined' && lrs[pageId]) {
            lrs[pageId]();
        }
    }
    toast(`অর্থবছর FY ${fy}-${fy+1} নির্বাচিত`);
}

// ৫. Topbar-এ FY picker inject করো
function injectFYPicker() {
    const tb = document.querySelector('.tb');
    if (!tb || document.getElementById('globalFYPicker')) return;

    const curFY = getCurrentFY();
    // Session storage থেকে FY নাও
    const savedFY = sessionStorage.getItem('hc_fy');
    if (savedFY) selectedFY = parseInt(savedFY);

    let opts = '';
    for (let y = curFY; y >= curFY - 4; y--) {
        const selected = y === selectedFY ? 'selected' : '';
        opts += `<option value="${y}" ${selected}>FY ${y}-${y+1}</option>`;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:6px;margin-right:4px';
    wrapper.innerHTML = `
        <span style="font-size:11px;color:var(--tm);white-space:nowrap">অর্থবছর:</span>
        <select id="globalFYPicker"
            style="background:var(--bg);border:1px solid var(--bd);color:var(--tp);
                   padding:5px 10px;border-radius:7px;font-size:12px;
                   font-family:var(--fb);cursor:pointer;min-height:34px"
            onchange="changeFY(parseInt(this.value))">
            ${opts}
        </select>`;

    // Avatar-এর আগে insert করো
    const av = tb.querySelector('.av');
    if (av) tb.insertBefore(wrapper, av);
    else tb.appendChild(wrapper);
}

// ৬. showApp() patch — FY picker যোগ করো
const _origShowApp = showApp;
window.showApp = function() {
    _origShowApp();
    // App দেখানোর পর FY picker inject করো
    setTimeout(injectFYPicker, 100);
};

// ৭. Page already logged in থাকলে
if (typeof TK !== 'undefined' && TK) {
    setTimeout(injectFYPicker, 500);
}
