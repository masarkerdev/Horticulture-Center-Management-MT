// ============================================================
// OPENING BALANCE — প্রারম্ভিক স্টক এন্ট্রি
// ============================================================

let obAllData = [];
let _obReady = false;
let obMap = {}; // seedling_id → total opening balance

function injectOBPage() {
    if (!document.getElementById('nav-ob')) {
        const stkNav = document.querySelector('.sb .ni[onclick*="stk"]');
        const ni = document.createElement('div');
        ni.className = 'ni';
        ni.id = 'nav-ob';
        ni.setAttribute('onclick', "go('ob', this)");
        ni.innerHTML = `<i class="ti ti-database-import" style="font-size:16px"></i> প্রারম্ভিক স্টক`;
        ni.style.display = 'flex';
        if (stkNav) stkNav.parentNode.insertBefore(ni, stkNav.nextSibling);
        else document.querySelector('.sb')?.appendChild(ni);
    }

    if (!document.getElementById('pg-ob')) {
        const pg = document.createElement('div');
        pg.className = 'pg';
        pg.id = 'pg-ob';
        pg.innerHTML = `
        <div style="max-width:860px">
          <!-- Widgets -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px" id="obWidgets">
            <div class="sc">
              <div class="si" style="background:var(--b50)">
                <i class="ti ti-database-import" style="color:var(--b600);font-size:18px"></i>
              </div>
              <div class="sl">মোট প্রারম্ভিক স্টক</div>
              <div class="sv" id="obWOpening" style="color:var(--b600)">—</div>
              <div class="ss2">পূর্বের মোট এন্ট্রি</div>
            </div>
            <div class="sc">
              <div class="si" style="background:var(--g50)">
                <i class="ti ti-stack-2" style="color:var(--g600);font-size:18px"></i>
              </div>
              <div class="sl">বর্তমান স্টক</div>
              <div class="sv" id="obWCurrent" style="color:var(--g600)">—</div>
              <div class="ss2">সব চারা/কলম</div>
            </div>
            <div class="sc">
              <div class="si" style="background:var(--t50)">
                <i class="ti ti-chart-bar" style="color:var(--t600);font-size:18px"></i>
              </div>
              <div class="sl">মোট স্টক</div>
              <div class="sv" id="obWTotal" style="color:var(--t600)">—</div>
              <div class="ss2">প্রারম্ভিক + নতুন</div>
            </div>
          </div>

          <!-- Info -->
          <div style="background:var(--a50);border:1px solid #e5c97e;border-radius:10px;
                      padding:12px 16px;margin-bottom:16px;display:flex;gap:10px">
            <i class="ti ti-info-circle" style="color:var(--a400);font-size:18px;flex-shrink:0;margin-top:1px"></i>
            <div style="font-size:13px">
              <strong>প্রারম্ভিক স্টক এন্ট্রি</strong> —
              <span style="color:var(--tm)">App চালু করার আগের stock এখানে যোগ করুন।
              প্রতিটি চারার পাশে পরিমাণ লিখে সেইভ বাটন চাপুন।</span>
            </div>
          </div>

          <!-- Table -->
          <div class="card">
            <div style="padding:14px 16px;border-bottom:1px solid var(--bd);
                        display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div style="font-size:14px;font-weight:600">চারার তালিকা</div>
              <input id="obSearch" class="fc" placeholder="🔍 খুঁজুন..."
                oninput="filterOB()"
                style="width:180px;min-height:36px;padding:6px 10px;font-size:13px">
            </div>
            <div id="obList"><div class="lt">লোড হচ্ছে...</div></div>
          </div>
        </div>`;
        document.querySelector('.ct')?.appendChild(pg);
    }

    if (typeof tls !== 'undefined') tls['ob'] = '📦 প্রারম্ভিক স্টক';
    if (typeof lrs !== 'undefined') lrs['ob'] = lOB;
    _obReady = true;
}

// Poll
const _obTimer = setInterval(() => {
    const app = document.getElementById('app');
    if (!app || !app.classList.contains('active')) return;
    injectOBPage();
    const nav = document.getElementById('nav-ob');
    if (nav && typeof ME !== 'undefined' && ME.role === 'admin') nav.style.display = 'flex';
    if (_obReady) clearInterval(_obTimer);
}, 300);

// Load
async function lOB() {
    try {
        // Widgets load
        const stats = await fetch('/api/stock/opening-balance/stats', {
            cache: 'no-store',
            headers: { Authorization: 'Bearer ' + TK }
        }).then(r => r.json());

        if (stats.success) {
            const d = stats.data;
            obMap = d.ob_map || {};
            document.getElementById('obWOpening').textContent = (d.total_opening || 0).toLocaleString() + 'টি';
            document.getElementById('obWCurrent').textContent = (d.current_stock || 0).toLocaleString() + 'টি';
            document.getElementById('obWTotal').textContent = (d.total_stock || 0).toLocaleString() + 'টি';
        }

        // Seedlings load
        const el = document.getElementById('obList');
        el.innerHTML = '<div class="lt">লোড হচ্ছে...</div>';
        const d = await fetch('/api/seedlings?limit=200', {
            cache: 'no-store',
            headers: { Authorization: 'Bearer ' + TK }
        }).then(r => r.json());
        obAllData = d.data || [];
        renderOBTable(obAllData);
    } catch(e) {
        document.getElementById('obList').innerHTML = '<div class="lt">লোড সমস্যা</div>';
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
    el.innerHTML = `<div class="tw"><table>
      <thead><tr>
        <th>চারার নাম</th>
        <th>জাত</th>
        <th style="text-align:center;color:var(--b600)">প্রারম্ভিক স্টক</th>
        <th style="text-align:center">বর্তমান স্টক</th>
        <th style="text-align:center;color:var(--g600)">পরিমাণ</th>
        <th style="text-align:center">কার্যক্রম</th>
      </tr></thead>
      <tbody>
        ${data.map(s => {
          const obQty = obMap[s.id] || 0;
          return `<tr id="obRow-${s.id}">
          <td><strong>${s.name_bn}</strong></td>
          <td style="color:var(--tm);font-size:12px">${s.variety || '—'}</td>
          <td style="text-align:center">
            <span id="obOp-${s.id}" style="font-weight:600;color:${obQty > 0 ? 'var(--b600)' : 'var(--tm)'}">
              ${obQty > 0 ? obQty + 'টি' : '—'}
            </span>
          </td>
          <td style="text-align:center">
            <span id="obCur-${s.id}" style="font-weight:600;
              color:${s.current_stock > 0 ? 'var(--g600)' : 'var(--tm)'}">
              ${s.current_stock}টি
            </span>
          </td>
          <td style="text-align:center;padding:8px">
            <input type="number" id="obQty-${s.id}"
              placeholder="পরিমাণ" min="1" class="fc"
              style="width:110px;min-height:38px;text-align:center;font-size:14px"
              onkeydown="if(event.key==='Enter') saveOBRow(${s.id},'${s.name_bn}')">
          </td>
          <td style="text-align:center">
            <div style="display:flex;gap:4px;justify-content:center">
              <button class="btn btns btnp" onclick="saveOBRow(${s.id},'${s.name_bn}')"
                id="obBtn-${s.id}" title="যোগ করুন">
                <i class="ti ti-device-floppy"></i> সেইভ
              </button>
              ${obQty > 0 ? `<button class="btn btns btne" onclick="editOBRow(${s.id},'${s.name_bn}',${obQty})"
                title="সম্পাদনা"><i class="ti ti-edit"></i></button>` : ''}
            </div>
          </td>
        </tr>`;}).join('')}
      </tbody>
    </table></div>`;
}

// Per-row save
async function saveOBRow(seedlingId, name) {
    const input = document.getElementById('obQty-' + seedlingId);
    const btn = document.getElementById('obBtn-' + seedlingId);
    const qty = parseInt(input?.value || 0);

    if (!qty || qty <= 0) { toast('পরিমাণ দিন', 1); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader"></i>';

    try {
        const r = await fetch('/api/stock/opening-balance', {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TK },
            body: JSON.stringify({ entries: [{ seedling_id: seedlingId, quantity: qty }] })
        });
        const d = await r.json();

        if (d.success) {
            toast(name + ' — ' + qty + 'টি যোগ হয়েছে ✅');
            input.value = '';

            // Row update
            const updated = d.data?.[0];
            if (updated) {
                const curEl = document.getElementById('obCur-' + seedlingId);
                if (curEl) {
                    curEl.textContent = updated.total + 'টি';
                    curEl.style.color = 'var(--g600)';
                }
                const seed = obAllData.find(s => s.id === seedlingId);
                if (seed) seed.current_stock = updated.total;
            }

            // Row highlight
            const row = document.getElementById('obRow-' + seedlingId);
            if (row) {
                row.style.background = 'var(--g50)';
                setTimeout(() => row.style.background = '', 2000);
            }

            // Edit opening balance row
async function editOBRow(seedlingId, name, currentOb) {
    const newQty = prompt(`"${name}" এর প্রারম্ভিক স্টক সম্পাদনা\nবর্তমান: ${currentOb}টি\nনতুন মোট পরিমাণ দিন:`, currentOb);
    if (newQty === null) return; // cancel
    const qty = parseInt(newQty);
    if (!qty || qty < 0) { toast('সঠিক পরিমাণ দিন', 1); return; }

    // Difference calculate করো
    const diff = qty - currentOb;
    if (diff === 0) { toast('কোনো পরিবর্তন নেই', 1); return; }

    try {
        const r = await fetch('/api/stock/adjustment', {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TK },
            body: JSON.stringify({
                seedling_id: seedlingId,
                quantity: Math.abs(diff),
                direction: diff > 0 ? '+' : '-',
                notes: 'প্রারম্ভিক স্টক সংশোধন'
            })
        });
        const d = await r.json();
        if (d.success) {
            toast(`"${name}" আপডেট হয়েছে ✅`);
            const opEl = document.getElementById('obOp-' + seedlingId);
            const curEl = document.getElementById('obCur-' + seedlingId);
            if (opEl) { opEl.textContent = qty + 'টি'; opEl.style.color = 'var(--b600)'; }
            if (curEl) { curEl.textContent = d.new_balance + 'টি'; curEl.style.color = 'var(--g600)'; }
            obMap[seedlingId] = qty;
            const seed = obAllData.find(s => s.id === seedlingId);
            if (seed) seed.current_stock = d.new_balance;
            refreshOBWidgets();
        } else toast(d.error || 'সমস্যা', 1);
    } catch(e) { toast('সার্ভার সমস্যা', 1); }
}

// Widgets refresh
            refreshOBWidgets();
        } else {
            toast(d.error || 'সমস্যা', 1);
        }
    } catch(e) {
        toast('সার্ভার সমস্যা', 1);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-device-floppy"></i> সেইভ';
    }
}

// Edit opening balance row
async function editOBRow(seedlingId, name, currentOb) {
    const newQty = prompt(`"${name}" এর প্রারম্ভিক স্টক সম্পাদনা\nবর্তমান: ${currentOb}টি\nনতুন মোট পরিমাণ দিন:`, currentOb);
    if (newQty === null) return; // cancel
    const qty = parseInt(newQty);
    if (!qty || qty < 0) { toast('সঠিক পরিমাণ দিন', 1); return; }

    // Difference calculate করো
    const diff = qty - currentOb;
    if (diff === 0) { toast('কোনো পরিবর্তন নেই', 1); return; }

    try {
        const r = await fetch('/api/stock/adjustment', {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TK },
            body: JSON.stringify({
                seedling_id: seedlingId,
                quantity: Math.abs(diff),
                direction: diff > 0 ? '+' : '-',
                notes: 'প্রারম্ভিক স্টক সংশোধন'
            })
        });
        const d = await r.json();
        if (d.success) {
            toast(`"${name}" আপডেট হয়েছে ✅`);
            const opEl = document.getElementById('obOp-' + seedlingId);
            const curEl = document.getElementById('obCur-' + seedlingId);
            if (opEl) { opEl.textContent = qty + 'টি'; opEl.style.color = 'var(--b600)'; }
            if (curEl) { curEl.textContent = d.new_balance + 'টি'; curEl.style.color = 'var(--g600)'; }
            obMap[seedlingId] = qty;
            const seed = obAllData.find(s => s.id === seedlingId);
            if (seed) seed.current_stock = d.new_balance;
            refreshOBWidgets();
        } else toast(d.error || 'সমস্যা', 1);
    } catch(e) { toast('সার্ভার সমস্যা', 1); }
}

// Widgets refresh
async function refreshOBWidgets() {
    try {
        const stats = await fetch('/api/stock/opening-balance/stats', {
            cache: 'no-store',
            headers: { Authorization: 'Bearer ' + TK }
        }).then(r => r.json());

        if (stats.success) {
            const d = stats.data;
            obMap = d.ob_map || {};
            document.getElementById('obWOpening').textContent = (d.total_opening || 0).toLocaleString() + 'টি';
            document.getElementById('obWCurrent').textContent = (d.current_stock || 0).toLocaleString() + 'টি';
            document.getElementById('obWTotal').textContent = (d.total_stock || 0).toLocaleString() + 'টি';
        }
    } catch(e) {}
}
