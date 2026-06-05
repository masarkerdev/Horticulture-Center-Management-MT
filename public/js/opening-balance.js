// ============================================================
// OPENING BALANCE — প্রারম্ভিক স্টক এন্ট্রি
// ============================================================

let obAllData = [];
let _obReady = false;
let obMap = {};

function injectOBPage() {
  if (!document.getElementById("nav-ob")) {
    const stkNav = document.querySelector('.sb .ni[onclick*="stk"]');
    const ni = document.createElement("div");
    ni.className = "ni";
    ni.id = "nav-ob";
    ni.setAttribute("onclick", "go('ob', this)");
    ni.innerHTML = `<i class="ti ti-database-import" style="font-size:16px"></i> প্রারম্ভিক স্টক`;
    ni.style.display = "flex";
    if (stkNav) stkNav.parentNode.insertBefore(ni, stkNav.nextSibling);
    else document.querySelector(".sb")?.appendChild(ni);
  }

  if (!document.getElementById("pg-ob")) {
    const pg = document.createElement("div");
    pg.className = "pg";
    pg.id = "pg-ob";
    pg.innerHTML = `
        <div style="max-width:100%">
          <!-- 4 Widgets in one row -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px" id="obWidgets">
            <div class="sc">
              <div class="si" style="background:var(--b50)">
                <i class="ti ti-database-import" style="color:var(--b600);font-size:18px"></i>
              </div>
              <div class="sl">মোট প্রারম্ভিক স্টক</div>
              <div class="sv" id="obWOpening" style="color:var(--b600)">—</div>
              <div class="ss2">App চালু পূর্বের এন্ট্রি</div>
            </div>
            <div class="sc">
              <div class="si" style="background:var(--a50)">
                <i class="ti ti-history" style="color:var(--a400);font-size:18px"></i>
              </div>
              <div class="sl">পূর্ববর্তী অর্থবছর</div>
              <div class="sv" id="obWPrevFY" style="color:var(--a400)">—</div>
              <div class="ss2" id="obWPrevFYLabel">আগের FY নেট স্টক</div>
            </div>
            <div class="sc">
              <div class="si" style="background:var(--g50)">
                <i class="ti ti-plant" style="color:var(--g600);font-size:18px"></i>
              </div>
              <div class="sl">চলতি অর্থবছর</div>
              <div class="sv" id="obWCurFY" style="color:var(--g600)">—</div>
              <div class="ss2" id="obWCurFYLabel">চলতি FY নেট স্টক</div>
            </div>
            <div class="sc">
              <div class="si" style="background:var(--t50)">
                <i class="ti ti-stack-2" style="color:var(--t600);font-size:18px"></i>
              </div>
              <div class="sl">মোট স্টক</div>
              <div class="sv" id="obWTotal" style="color:var(--t600)">—</div>
              <div class="ss2">সব মিলিয়ে বর্তমান</div>
            </div>
          </div>

          <!-- Info -->
          <div style="background:var(--a50);border:1px solid #e5c97e;border-radius:10px;
                      padding:12px 16px;margin-bottom:16px;display:flex;gap:10px">
            <i class="ti ti-info-circle" style="color:var(--a400);font-size:18px;flex-shrink:0;margin-top:1px"></i>
            <div style="font-size:13px">
              <strong>প্রারম্ভিক স্টক এন্ট্রি</strong> —
              <span style="color:var(--tm)">App চালু করার আগের stock এখানে যোগ করুন।
              প্রতিটি চারার পাশে পরিমাণ লিখে সেইভ বাটন চাপুন। ভুল এন্ট্রি সংশোধন করতে এডিট বাটন ব্যবহার করুন।</span>
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
        </div>

        <!-- Edit Modal -->
        <div class="mo" id="mOBEdit">
          <div class="md" style="max-width:420px">
            <div class="mh">
              <h3>✏️ প্রারম্ভিক স্টক সম্পাদনা</h3>
              <button class="mx" onclick="cM('mOBEdit')"><i class="ti ti-x"></i></button>
            </div>
            <div style="margin-bottom:16px">
              <div style="font-size:13px;color:var(--tm);margin-bottom:6px">চারার নাম</div>
              <div id="obEditName" style="font-size:15px;font-weight:600"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
              <div style="background:var(--b50);border-radius:8px;padding:12px;text-align:center">
                <div style="font-size:11px;color:var(--tm);margin-bottom:4px">বর্তমান প্রারম্ভিক স্টক</div>
                <div id="obEditCurrent" style="font-size:20px;font-weight:700;color:var(--b600)">—</div>
              </div>
              <div style="background:var(--g50);border-radius:8px;padding:12px;text-align:center">
                <div style="font-size:11px;color:var(--tm);margin-bottom:4px">মোট বর্তমান স্টক</div>
                <div id="obEditTotal" style="font-size:20px;font-weight:700;color:var(--g600)">—</div>
              </div>
            </div>
            <div class="fg">
              <label>নতুন প্রারম্ভিক স্টক (মোট পরিমাণ) <span style="color:var(--tm);font-size:11px">— ০ দিলে সম্পূর্ণ বাদ যাবে</span></label>
              <input type="number" id="obEditQty" class="fc" min="0" placeholder="নতুন পরিমাণ দিন"
                style="font-size:16px;text-align:center"
                onkeydown="if(event.key==='Enter') saveOBEdit()">
            </div>
            <input type="hidden" id="obEditId">
            <input type="hidden" id="obEditOldQty">
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
              <button class="btn" onclick="cM('mOBEdit')">বাতিল</button>
              <button class="btn btnp" onclick="saveOBEdit()">
                <i class="ti ti-device-floppy"></i> সংরক্ষণ
              </button>
            </div>
          </div>
        </div>`;
    document.querySelector(".ct")?.appendChild(pg);
  }

  if (typeof tls !== "undefined") tls["ob"] = "📦 প্রারম্ভিক স্টক";
  if (typeof lrs !== "undefined") lrs["ob"] = lOB;
  _obReady = true;
}

// Poll
const _obTimer = setInterval(() => {
  const app = document.getElementById("app");
  if (!app || !app.classList.contains("active")) return;
  injectOBPage();
  const nav = document.getElementById("nav-ob");
  if (nav && typeof ME !== "undefined" && ME.role === "admin")
    nav.style.display = "flex";
  if (_obReady) clearInterval(_obTimer);
}, 300);

// Stats update
function updateOBWidgets(d) {
  obMap = d.ob_map || {};
  document.getElementById("obWOpening").textContent =
    (d.total_opening || 0).toLocaleString() + "টি";
  document.getElementById("obWPrevFY").textContent =
    (d.prev_fy_stock || 0).toLocaleString() + "টি";
  document.getElementById("obWCurFY").textContent =
    (d.cur_fy_stock || 0).toLocaleString() + "টি";
  document.getElementById("obWTotal").textContent =
    (d.total_stock || 0).toLocaleString() + "টি";
  if (d.fy) {
    const parts = d.fy.split("-");
    const el1 = document.getElementById("obWPrevFYLabel");
    const el2 = document.getElementById("obWCurFYLabel");
    if (el1) el1.textContent = `FY ${parseInt(parts[0]) - 1}-${parts[0]}`;
    if (el2) el2.textContent = `FY ${d.fy}`;
  }
}

async function fetchOBStats() {
  const r = await fetch("/api/stock/opening-balance/stats", {
    cache: "no-store",
    headers: { Authorization: "Bearer " + TK },
  });
  const d = await r.json();
  if (d.success) updateOBWidgets(d.data);
  return d;
}

// Load page
async function lOB() {
  try {
    await fetchOBStats();
    const el = document.getElementById("obList");
    el.innerHTML = '<div class="lt">লোড হচ্ছে...</div>';
    const d = await fetch("/api/seedlings?limit=200", {
      cache: "no-store",
      headers: { Authorization: "Bearer " + TK },
    }).then((r) => r.json());
    obAllData = d.data || [];
    renderOBTable(obAllData);
  } catch (e) {
    document.getElementById("obList").innerHTML =
      '<div class="lt">লোড সমস্যা</div>';
  }
}

function filterOB() {
  const s = (document.getElementById("obSearch")?.value || "").toLowerCase();
  renderOBTable(
    s
      ? obAllData.filter(
          (x) =>
            (x.name_bn || "").toLowerCase().includes(s) ||
            (x.variety || "").toLowerCase().includes(s),
        )
      : obAllData,
  );
}

function renderOBTable(data) {
  const el = document.getElementById("obList");
  if (!data.length) {
    el.innerHTML = '<div class="lt">কোনো চারা নেই</div>';
    return;
  }
  el.innerHTML = `<div class="tw"><table>
      <thead><tr>
        <th>চারার নাম</th>
        <th>জাত</th>
        <th style="text-align:center;color:var(--b600)">প্রারম্ভিক স্টক</th>
        <th style="text-align:center">বর্তমান স্টক</th>
        <th style="text-align:center;color:var(--g600)">যোগ করুন</th>
        <th style="text-align:center">কার্যক্রম</th>
      </tr></thead>
      <tbody>
        ${data
          .map((s) => {
            const obQty = obMap[s.id] || 0;
            return `<tr id="obRow-${s.id}">
            <td><strong>${s.name_bn}</strong></td>
            <td style="color:var(--tm);font-size:12px">${s.variety || "—"}</td>
            <td style="text-align:center">
              <span id="obOp-${s.id}" style="font-weight:600;
                color:${obQty > 0 ? "var(--b600)" : "var(--tm)"}">
                ${obQty > 0 ? obQty.toLocaleString() + "টি" : "—"}
              </span>
            </td>
            <td style="text-align:center">
              <span id="obCur-${s.id}" style="font-weight:600;
                color:${s.current_stock > 0 ? "var(--g600)" : "var(--tm)"}">
                ${s.current_stock.toLocaleString()}টি
              </span>
            </td>
            <td style="text-align:center;padding:6px 8px">
              <input type="number" id="obQty-${s.id}"
                placeholder="পরিমাণ" min="1" class="fc"
                style="width:110px;min-height:36px;text-align:center;font-size:14px"
                onkeydown="if(event.key==='Enter') saveOBRow(${s.id},'${s.name_bn}')">
            </td>
            <td style="text-align:center">
              <div style="display:flex;gap:4px;justify-content:center">
                <button class="btn btns btnp" onclick="saveOBRow(${s.id},'${s.name_bn}')"
                  id="obBtn-${s.id}" title="যোগ করুন">
                  <i class="ti ti-device-floppy"></i> সেইভ
                </button>
                <button class="btn btns btne" onclick="openOBEdit(${s.id},'${s.name_bn}',${obQty},${s.current_stock})"
                  title="সম্পাদনা">
                  <i class="ti ti-edit"></i>
                </button>
              </div>
            </td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table></div>`;
}

// Per-row save
async function saveOBRow(seedlingId, name) {
  const input = document.getElementById("obQty-" + seedlingId);
  const btn = document.getElementById("obBtn-" + seedlingId);
  const qty = parseInt(input?.value || 0);

  if (!qty || qty <= 0) {
    toast("কমপক্ষে ১ দিন", 1);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i>';
  try {
    const r = await fetch("/api/stock/opening-balance", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + TK,
      },
      body: JSON.stringify({
        entries: [{ seedling_id: seedlingId, quantity: qty }],
      }),
    });
    const d = await r.json();
    if (d.success) {
      toast(name + " — " + qty + "টি যোগ হয়েছে ✅");
      input.value = "";
      const updated = d.data?.[0];
      if (updated) {
        const opEl = document.getElementById("obOp-" + seedlingId);
        const curEl = document.getElementById("obCur-" + seedlingId);
        const newOb = (obMap[seedlingId] || 0) + qty;
        obMap[seedlingId] = newOb;
        if (opEl) {
          opEl.textContent = newOb.toLocaleString() + "টি";
          opEl.style.color = "var(--b600)";
        }
        if (curEl) {
          curEl.textContent = updated.total.toLocaleString() + "টি";
          curEl.style.color = "var(--g600)";
        }
        const seed = obAllData.find((s) => s.id === seedlingId);
        if (seed) seed.current_stock = updated.total;
      }
      const row = document.getElementById("obRow-" + seedlingId);
      if (row) {
        row.style.background = "var(--g50)";
        setTimeout(() => (row.style.background = ""), 2000);
      }
      fetchOBStats();
    } else toast(d.error || "সমস্যা", 1);
  } catch (e) {
    toast("সার্ভার সমস্যা", 1);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-device-floppy"></i> সেইভ';
  }
}

// Open Edit Modal
function openOBEdit(seedlingId, name, currentOb, totalStock) {
  document.getElementById("obEditId").value = seedlingId;
  document.getElementById("obEditOldQty").value = currentOb;
  document.getElementById("obEditName").textContent = name;
  document.getElementById("obEditCurrent").textContent =
    currentOb.toLocaleString() + "টি";
  document.getElementById("obEditTotal").textContent =
    totalStock.toLocaleString() + "টি";
  document.getElementById("obEditQty").value = currentOb;
  document.getElementById("mOBEdit").classList.add("open");
  setTimeout(() => document.getElementById("obEditQty").focus(), 100);
}

// Save Edit — proper opening balance update
async function saveOBEdit() {
  const seedlingId = parseInt(document.getElementById("obEditId").value);
  const newQty = parseInt(document.getElementById("obEditQty").value);
  const name = document.getElementById("obEditName").textContent;

  if (isNaN(newQty) || newQty < 0) {
    toast("সঠিক পরিমাণ দিন (০ বা তার বেশি)", 1);
    return;
  }

  const oldQty = parseInt(document.getElementById("obEditOldQty").value || 0);
  if (newQty === oldQty) {
    document.getElementById("mOBEdit").classList.remove("open");
    return;
  }

  try {
    const r = await fetch("/api/stock/opening-balance/" + seedlingId, {
      method: "PUT",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + TK,
      },
      body: JSON.stringify({ new_qty: newQty }),
    });
    const d = await r.json();
    if (d.success) {
      toast(`"${name}" আপডেট হয়েছে ✅`);
      document.getElementById("mOBEdit").classList.remove("open");
      // UI update
      obMap[seedlingId] = newQty;
      const opEl = document.getElementById("obOp-" + seedlingId);
      const curEl = document.getElementById("obCur-" + seedlingId);
      if (opEl) {
        opEl.textContent = newQty > 0 ? newQty.toLocaleString() + "টি" : "—";
        opEl.style.color = newQty > 0 ? "var(--b600)" : "var(--tm)";
      }
      if (curEl) {
        curEl.textContent = d.new_balance.toLocaleString() + "টি";
        curEl.style.color = "var(--g600)";
      }
      const seed = obAllData.find((s) => s.id === seedlingId);
      if (seed) seed.current_stock = d.new_balance;
      fetchOBStats();
    } else toast(d.error || "সমস্যা", 1);
  } catch (e) {
    toast("সার্ভার সমস্যা", 1);
  }
}
