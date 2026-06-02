// ============================================================
// OPENING BALANCE — প্রারম্ভিক স্টক এন্ট্রি
// app.js এর পরে include করুন
// ============================================================

// applyRoleSidebar patch — 'ob' যোগ করো access list-এ
const _origApplyRole = window.applyRoleSidebar;
window.applyRoleSidebar = function() {
    _origApplyRole.apply(this, arguments);
    // admin-এর জন্য 'ob' nav দেখাও
    if (typeof ME !== 'undefined' && ME.role === 'admin') {
        const obNav = document.querySelector('.ni[onclick*="ob"]');
        if (obNav) obNav.style.display = 'flex';
    }
};

// Nav item ও Page inject
function injectOBPage() {
    // ১. Nav item
    if (!document.querySelector('.ni[onclick*="\'ob\'"]')) {
        const stkNav = document.querySelector('.ni[onclick*="\'stk\'"]');
        if (stkNav) {
            const ni = document.createElement('div');
            ni.className = 'ni';
            ni.setAttribute('onclick', "go('ob', this)");
            ni.innerHTML = `<i class="ti ti-database-import" style="font-size:16px"></i> প্রারম্ভিক স্টক`;
            stkNav.parentNode.insertBefore(ni, stkNav.nextSibling);
        }
    }

    // ২. Page div
    if (!document.getElementById('pg-ob')) {
        const pg = document.createElement('div');
        pg.className = 'pg';
        pg.id = 'pg-ob';
        pg.innerHTML = `
        <div style="max-width:800px">
          <div style="background:var(--a50);border:1px solid #e5c97e;border-radius:10px;
                      padding:14px 16px;margin-bottom:20px;display:flex;gap:10px">
            <i class="ti ti-info-circle" style="color:var(--a400);font-size:20px;margin-top:2px"></i>
            <div style="font-size:13px">
              <strong>প্রারম্ভিক স্টক এন্ট্রি</strong><br>
              <span style="color:var(--tm)">App চালু করার আগের stock এখানে যোগ করুন।
              প্রতিটি চারার পাশে পরিমাণ লিখুন এবং Save করুন।</span>
            </div>
          </div>
          <div class="card">
            <div style="padding:16px;border-bottom:1px solid var(--bd);
                        display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div>
                <div style="font-size:15px;font-weight:600">চারার তালিকা</div>
                <div style="font-size:12px;color:var(--tm);margin-top:2px">শুধু পরিমাণ লেখা ঘরগুলো save হবে</div>
              </div>
              <div style="display:flex;gap:8px">
                <input id="obSearch" class="fc" placeholder="🔍 খুঁজুন..."
                  oninput="filterOB()"
                  style="width:160px;min-height:36px;padding:6px 10px;font-size:13px">
                <button class="btn btnp" onclick="saveOB()">
                  <i class="ti ti-device-floppy"></i> সংরক্ষণ
                </button>
              </div>
            </div>
            <div id="obList" style="padding:8px"><div class="lt">লোড হচ্ছে...</div></div>
          </div>
        </div>`;
        const ct = document.querySelector('.ct');
        if (ct) ct.appendChild(pg);
    }

    // ৩. tls ও lrs-এ যোগ
    if (typeof tls !== 'undefined') tls['ob'] = '📦 প্রারম্ভিক স্টক';
    if (typeof lrs !== 'undefined') lrs['ob'] = lOB;
}

// showApp patch
const _origShowAppOB = window.showApp;
window.showApp = function() {
    _origShowAppOB.apply(this, arguments);
    setTimeout(injectOBPage, 200);
};

// Already logged in
(function tryInjectOB() {
    const app = document.getElementById('app');
    if (app && app.classList.contains('active')) {
        injectOBPage();
        // role apply হওয়ার পর nav দেখাও
        setTimeout(() => {
            if (typeof ME !== 'undefined' && ME.role === 'admin') {
                const obNav = document.querySelector('.ni[onclick*="\'ob\'"]');
                if (obNav) obNav.style.display = 'flex';
            }
        }, 500);
    } else {
        setTimeout(tryInjectOB, 300);
    }
})();

// ===== Data =====
let obAllData = [];

async function lOB() {
    const el = document.getElementById('obList');
    if (!el) return;
    try {
        const r = await fetch('/api/seedlings?limit=200', {
            cache: 'no-store',
            headers: { Authorization: 'Bearer ' + TK }
        });
        const d = await r.json();
        obAllData = d.data || [];
        renderOBTable(obAllData);
    } catch(e) {
        el.innerHTML = '<div class="lt">লোড সমস্যা</div>';
    }
}

function filterOB() {
    const s = (document.getElementById('obSearch')?.value || '').toLowerCase();
    renderOBTable(s ? obAllData.filter(x =>
        (x.name_bn||'').toLowerCase().includes(s) ||
        (x.variety||'').toLowerCase().includes(s)
    ) : obAllData);
}

function renderOBTable(data) {
    const el = document.getElementById('obList');
    if (!data.length) { el.innerHTML = '<div class="lt">কোনো চারা নেই</div>'; return; }
    el.innerHTML = `
    <div class="tw"><table>
      <thead><tr>
        <th>চারার নাম</th>
        <th>জাত</th>
        <th style="text-align:center">বর্তমান স্টক</th>
        <th style="text-align:center;color:var(--g600)">যোগ করুন (পরিমাণ)</th>
      </tr></thead>
      <tbody>
        ${data.map(s => `<tr>
          <td><strong>${s.name_bn}</strong></td>
          <td style="color:var(--tm)">${s.variety || '—'}</td>
          <td style="text-align:center">
            <span id="obCur-${s.id}" style="font-weight:600;color:${s.current_stock>0?'var(--g600)':'var(--tm)'}">
              ${s.current_stock}টি
            </span>
          </td>
          <td style="text-align:center;padding:8px">
            <input type="number" id="obQty-${s.id}" placeholder="০"
              min="0" class="fc"
              style="width:130px;min-height:38px;text-align:center;font-size:14px">
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

async function saveOB() {
    const entries = [];
    obAllData.forEach(s => {
        const qty = parseInt(document.getElementById('obQty-' + s.id)?.value || 0);
        if (qty > 0) entries.push({ seedling_id: s.id, quantity: qty });
    });

    if (!entries.length) { toast('কমপক্ষে একটি পরিমাণ দিন', 1); return; }

    try {
        const r = await fetch('/api/stock/opening-balance', {
            method: 'POST', cache: 'no-store',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TK },
            body: JSON.stringify({ entries })
        });
        const d = await r.json();
        if (d.success) {
            toast(d.message + ' ✅');
            d.data.forEach(item => {
                const seed = obAllData.find(s => s.name_bn === item.name);
                if (seed) {
                    const input = document.getElementById('obQty-' + seed.id);
                    const curEl = document.getElementById('obCur-' + seed.id);
                    if (input) input.value = '';
                    if (curEl) { curEl.textContent = item.total + 'টি'; curEl.style.color = 'var(--g600)'; }
                    seed.current_stock = item.total;
                }
            });
        } else toast(d.error || 'সমস্যা', 1);
    } catch(e) { toast('সার্ভার সমস্যা', 1); }
}
