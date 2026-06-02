// ============================================================
// OPENING BALANCE — প্রারম্ভিক স্টক এন্ট্রি
// app.js এর পরে এই file include করুন
// ============================================================

// Nav item ও Page যোগ করুন
(function injectOpeningBalancePage() {
    // ১. Nav item যোগ (স্টক রেজিস্টার-এর পরে)
    const stkNav = document.querySelector('.ni[onclick*="stk"]');
    if (stkNav && !document.querySelector('.ni[onclick*="ob"]')) {
        const ni = document.createElement('div');
        ni.className = 'ni';
        ni.setAttribute('onclick', "go('ob', this)");
        ni.innerHTML = `<i class="ti ti-database-import" style="font-size:16px"></i> প্রারম্ভিক স্টক`;
        stkNav.parentNode.insertBefore(ni, stkNav.nextSibling);
    }

    // ২. Page div যোগ
    if (!document.getElementById('pg-ob')) {
        const pg = document.createElement('div');
        pg.className = 'pg';
        pg.id = 'pg-ob';
        pg.innerHTML = `
        <div style="max-width:800px">
          <div style="background:var(--a50);border:1px solid #e5c97e;border-radius:10px;
                      padding:14px 16px;margin-bottom:20px;display:flex;gap:10px;align-items:flex-start">
            <i class="ti ti-info-circle" style="color:var(--a400);font-size:20px;margin-top:2px"></i>
            <div style="font-size:13px">
              <strong>প্রারম্ভিক স্টক এন্ট্রি</strong><br>
              <span style="color:var(--tm)">App চালু করার আগের stock এখানে যোগ করুন।
              এটা একবারই করুন — প্রতিটি চারার পাশে পরিমাণ লিখুন এবং Save করুন।</span>
            </div>
          </div>

          <div class="card">
            <div style="padding:16px;border-bottom:1px solid var(--bd);
                        display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:15px;font-weight:600">চারার তালিকা</div>
                <div style="font-size:12px;color:var(--tm);margin-top:2px">
                  শুধু পরিমাণ লেখা ঘরগুলোতে save হবে
                </div>
              </div>
              <div style="display:flex;gap:8px">
                <input id="obSearch" class="fc" placeholder="🔍 খুঁজুন..."
                  oninput="filterOB()"
                  style="width:180px;min-height:36px;padding:6px 10px;font-size:13px">
                <button class="btn btnp" onclick="saveOB()">
                  <i class="ti ti-device-floppy"></i> সংরক্ষণ করুন
                </button>
              </div>
            </div>
            <div id="obList" style="padding:8px 16px">
              <div class="lt">লোড হচ্ছে...</div>
            </div>
          </div>
        </div>`;
        document.querySelector('.ct')?.appendChild(pg);
    }

    // ৩. tls ও lrs-এ যোগ
    if (typeof tls !== 'undefined') tls['ob'] = '📦 প্রারম্ভিক স্টক এন্ট্রি';
    if (typeof lrs !== 'undefined') lrs['ob'] = lOB;
})();

// Role check — শুধু admin
function checkOBAccess() {
    const nav = document.querySelector('.ni[onclick*="ob"]');
    if (!nav) return;
    if (typeof ME !== 'undefined' && ME.role !== 'admin') {
        nav.style.display = 'none';
    }
}

// Page load
let obAllData = [];
async function lOB() {
    checkOBAccess();
    const el = document.getElementById('obList');
    if (!el) return;
    try {
        const d = await fetch('/api/seedlings?limit=200', {
            cache: 'no-store',
            headers: { Authorization: 'Bearer ' + TK }
        }).then(r => r.json());

        obAllData = d.data || [];
        renderOBTable(obAllData);
    } catch (e) {
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
    if (!data.length) {
        el.innerHTML = '<div class="lt">কোনো চারা নেই</div>';
        return;
    }
    el.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="padding:10px 8px;text-align:left;font-size:11px;color:var(--tm);
                   border-bottom:1px solid var(--bd);font-weight:600">চারার নাম</th>
        <th style="padding:10px 8px;text-align:left;font-size:11px;color:var(--tm);
                   border-bottom:1px solid var(--bd);font-weight:600">জাত</th>
        <th style="padding:10px 8px;text-align:center;font-size:11px;color:var(--tm);
                   border-bottom:1px solid var(--bd);font-weight:600">বর্তমান স্টক</th>
        <th style="padding:10px 8px;text-align:center;font-size:11px;color:var(--g600);
                   border-bottom:1px solid var(--bd);font-weight:600">যোগ করুন</th>
      </tr></thead>
      <tbody>
        ${data.map(s => `
        <tr id="obRow-${s.id}">
          <td style="padding:10px 8px;font-weight:600;border-bottom:1px solid var(--bd)">
            ${s.name_bn}
          </td>
          <td style="padding:10px 8px;color:var(--tm);font-size:13px;border-bottom:1px solid var(--bd)">
            ${s.variety || '—'}
          </td>
          <td style="padding:10px 8px;text-align:center;border-bottom:1px solid var(--bd)">
            <span id="obCur-${s.id}" style="font-weight:600;color:${s.current_stock > 0 ? 'var(--g600)' : 'var(--tm)'}">
              ${s.current_stock}টি
            </span>
          </td>
          <td style="padding:8px;text-align:center;border-bottom:1px solid var(--bd)">
            <input type="number" id="obQty-${s.id}"
              placeholder="পরিমাণ লিখুন"
              min="0"
              style="width:130px;padding:7px 10px;border:1px solid var(--bd);
                     border-radius:7px;font-size:13px;font-family:var(--fb);
                     text-align:center;outline:none"
              onfocus="this.style.borderColor='var(--g400)'"
              onblur="this.style.borderColor='var(--bd)'">
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function saveOB() {
    // শুধু value আছে এমন rows collect করো
    const entries = [];
    obAllData.forEach(s => {
        const input = document.getElementById('obQty-' + s.id);
        const qty = parseInt(input?.value || 0);
        if (qty > 0) {
            entries.push({ seedling_id: s.id, quantity: qty });
        }
    });

    if (!entries.length) {
        if (typeof toast !== 'undefined') toast('কমপক্ষে একটি পরিমাণ দিন', 1);
        return;
    }

    try {
        const r = await fetch('/api/stock/opening-balance', {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + TK
            },
            body: JSON.stringify({ entries })
        });
        const d = await r.json();

        if (d.success) {
            if (typeof toast !== 'undefined') toast(d.message + ' ✅');
            // Input গুলো clear করো এবং stock update দেখাও
            d.data.forEach(item => {
                const seed = obAllData.find(s => s.name_bn === item.name);
                if (seed) {
                    const input = document.getElementById('obQty-' + seed.id);
                    const curEl = document.getElementById('obCur-' + seed.id);
                    if (input) input.value = '';
                    if (curEl) {
                        curEl.textContent = item.total + 'টি';
                        curEl.style.color = 'var(--g600)';
                        seed.current_stock = item.total;
                    }
                }
            });
        } else {
            if (typeof toast !== 'undefined') toast(d.error || 'সমস্যা হয়েছে', 1);
        }
    } catch (e) {
        if (typeof toast !== 'undefined') toast('সার্ভার সমস্যা', 1);
    }
}
