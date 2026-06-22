const API = "/api/superadmin";
let token = localStorage.getItem("sa_token");
let centers = [],
  allStats = [],
  currentView = "overview",
  currentDetailSlug = "",
  currentDetailData = null,
  currentDTab = "dSales";
let userRole = "director",
  assignedCenters = [];
const COLORS = [
  "#7c3aed",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const SANCTIONED = {
  A: {'উপপরিচালক':1,'উদ্যানতত্ত্ববিদ':1,'উপসহকারী কৃষি কর্মকর্তা':4,'স্টোর কিপার':1,'উচ্চমান সহকারী':1,'অফিস সহকারী':1,'কুক':1,'ড্রাইভার':1,'ট্রাক্টর ড্রাইভার':1,'ফার্মলেবার':16,'এমএলএসএস':1,'গার্ড':4},
  B: {'উদ্যানতত্ত্ববিদ':1,'উপসহকারী কৃষি কর্মকর্তা':3,'স্টোর কিপার':1,'উচ্চমান সহকারী':1,'অফিস সহকারী':1,'কুক':1,'ড্রাইভার':1,'ফার্মলেবার':8,'এমএলএসএস':1,'গার্ড':3},
  C: {'নার্সারি তত্ত্বাবধায়ক':1,'উপসহকারী কৃষি কর্মকর্তা':2,'অফিস সহকারী':1,'ফার্মলেবার':5,'এমএলএসএস':1,'গার্ড':2}
};

// ── SEARCH ──
let searchQuery = '';

function onSearch(val) {
  searchQuery = val.trim().toLowerCase();
  if (['overview','catA','catB','catC','compare','targetSummary','districtSummary'].includes(currentView)) {
    renderView(currentView);
  }
}

function filterStats(data) {
  if (!searchQuery) return data;
  return data.filter(c =>
    c.name_bn?.toLowerCase().includes(searchQuery) ||
    c.name_en?.toLowerCase().includes(searchQuery) ||
    c.district?.toLowerCase().includes(searchQuery) ||
    c.division?.toLowerCase().includes(searchQuery) ||
    c.location?.toLowerCase().includes(searchQuery) ||
    c.slug?.toLowerCase().includes(searchQuery)
  );
}

if (token) showApp();

function decodeToken(t) {
  try {
    const base64 = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

async function saLogin() {
  const email = document.getElementById("saEmail").value.trim();
  const pass = document.getElementById("saPass").value;
  document.getElementById("saErr").textContent = "";
  try {
    const r = await fetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });
    const d = await r.json();
    if (!d.success)
      return (document.getElementById("saErr").textContent = d.message);
    token = d.token;
    localStorage.setItem("sa_token", token);
    showApp();
  } catch {
    document.getElementById("saErr").textContent = "সংযোগ ব্যর্থ।";
  }
}

function showApp() {
  const payload = decodeToken(token);
  userRole = payload.role || "director";
  assignedCenters = payload.assignedCenters || [];
  document.getElementById("loginWrap").style.display = "none";
  document.getElementById("saApp").style.display = "block";

  const rLabels = {
    director: "পরিচালক",
    deputy_director: "উপপরিচালক",
    horticulturist: "উদ্যানতত্ত্ববিদ",
    nursery_supervisor: "নার্সারী তত্ত্বাবধায়ক",
  };

  const locationName = payload.name || "";
  const district = payload.district || "";
  const division = payload.division || "";
  const line1 = rLabels[userRole] || userRole;
  document.getElementById("adminName").textContent = line1;
  document.getElementById("adminAv").textContent = (rLabels[userRole] || "প")
    .charAt(0)
    .toUpperCase();

  const parts =
    userRole === "director"
      ? ["হর্টিকালচার উইং, DAE"].filter(Boolean)
      : ["হর্টিকালচার সেন্টার", locationName, district].filter(Boolean);
  document.getElementById("adminRole").textContent = parts.join(", ");

  document.getElementById("topbarAdminInfo").style.display = "block";
  document.getElementById("topbarAdminName").textContent =
    rLabels[userRole] + (locationName ? ", " + locationName : "");
  document.getElementById("topbarAdminRole").textContent =
    district + (division ? ", " + division : "");

  if (userRole === "director")
    document.getElementById("directorOnly").style.display = "block";

  const themes = {
    director: { accent: "#2d6a4f", sidebar: "#090d12" },
    deputy_director: { accent: "#1a6b4a", sidebar: "#071410" },
    horticulturist: { accent: "#1a5a8a", sidebar: "#071019" },
    nursery_supervisor: { accent: "#8a5a1a", sidebar: "#191007" },
  };
  const theme = themes[userRole] || themes.director;
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--sidebar", theme.sidebar);
  document.body.setAttribute("data-role", userRole);
  loadAll();
}

function saLogout() {
  localStorage.removeItem("sa_token");
  location.reload();
}

async function loadAll() {
  await Promise.all([loadCenters(), loadAllStats(), loadAdmins()]);
  renderView(currentView);
}

let allAdmins = [];
async function loadAdmins() {
  if (userRole !== "director") return;
  try {
    const r = await fetch(API + "/admins", {
      headers: { Authorization: "Bearer " + token },
    });
    const d = await r.json();
    if (d.success) {
      allAdmins = d.data;
      document.getElementById("badge-admins").textContent = d.data.length;
    }
  } catch {}
}

async function refreshAll() {
  await loadAll();
}

async function loadCenters() {
  try {
    const r = await fetch(API + "/tenants", {
      headers: { Authorization: "Bearer " + token },
    });
    const d = await r.json();
    if (d.success) centers = d.data;
  } catch {}
}

async function loadAllStats(force = false) {
  try {
    const url = force ? `${API}/stats-all?force=true` : API + "/stats-all";
    const r = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
    });
    const d = await r.json();
    if (d.success) {
      allStats = d.data;
      updateBadges();
    }
  } catch {}
}

function updateBadges() {
  const ok = allStats.filter((c) => c.status === "ok");
  document.getElementById("badge-overview").textContent = ok.length + " center";
  ["A", "B", "C"].forEach((cat) => {
    const n = ok.filter((c) => c.category === cat).length;
    document.getElementById("badge-cat" + cat).textContent = n;
  });
}

function toggleSidebar() {
  document
    .getElementById("saApp")
    .querySelector(".sidebar")
    .classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("open");
}

function navTo(view, btn) {
  if (window.innerWidth <= 768) {
    document
      .getElementById("saApp")
      .querySelector(".sidebar")
      .classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("open");
  }
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.remove("active");
  });
  btn.classList.add("active");
  currentView = view;
  if (view === "detail") return;
  const titles = {
    overview: "📊 Overview",
    catA: "🏛️ A Category — উপপরিচালক",
    catB: "🌿 B Category — উদ্যানতত্ত্ববিদ",
    catC: "🪴 C Category — নার্সারী তত্ত্বাবধায়ক",
    compare: "📈 তুলনামূলক রিপোর্ট",
    targetSummary: "🎯 লক্ষ্যমাত্রা সারসংক্ষেপ",
    districtSummary: "🗺️ জেলাভিত্তিক সারসংক্ষেপ",
    allCenters: "⚙️ সব Center পরিচালনা",
    adminMgmt: "👥 Admin পরিচালনা",
    notice: "📢 নোটিশ বোর্ড",
  };
  document.getElementById("topbarTitle").textContent =
    titles[view] || "Overview";
  renderView(view);
}

function renderView(view) {
  const el = document.getElementById("mainContent");
  if (view === "overview") renderOverview(el);
  else if (view === "catA") renderCategoryView(el, "A");
  else if (view === "catB") renderCategoryView(el, "B");
  else if (view === "catC") renderCategoryView(el, "C");
  else if (view === "compare") renderCompareView(el);
  else if (view === "targetSummary") renderTargetSummaryView(el);
  else if (view === "districtSummary") renderDistrictSummaryView(el);
  else if (view === "allCenters") renderAllCenters(el);
  else if (view === "adminMgmt") renderAdminMgmt(el);
  else if (view === "notice") renderNoticeBoard(el);
}

function renderOverview(el) {
  const ok = filterStats(allStats.filter((c) => c.status === "ok"));
  const totalRev = ok.reduce((s, c) => s + c.total_revenue, 0);
  const todayRev = ok.reduce((s, c) => s + c.today_revenue, 0);
  const totalProd = ok.reduce((s, c) => s + c.total_produced, 0);
  const totalStock = ok.reduce((s, c) => s + c.total_stock, 0);
  const invoices = ok.reduce((s, c) => s + c.total_invoices, 0);

  const catGroups = { A: [], B: [], C: [] };
  ok.forEach((c) => {
    const cat = c.category || "B";
    catGroups[cat]?.push(c);
  });

  el.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi green"><div class="kpi-label">মোট বিক্রয়</div><div class="kpi-value">৳${fmt(totalRev)}</div><div class="kpi-sub">${invoices} চালান</div></div>
      <div class="kpi blue"><div class="kpi-label">আজকের বিক্রয়</div><div class="kpi-value">৳${fmt(todayRev)}</div></div>
      <div class="kpi purple"><div class="kpi-label">মোট উৎপাদন</div><div class="kpi-value">${fmtN(totalProd)}</div><div class="kpi-sub">টি চারা/কলম</div></div>
      <div class="kpi amber"><div class="kpi-label">মোট স্টক</div><div class="kpi-value">${fmtN(totalStock)}</div><div class="kpi-sub">টি চারা/কলম</div></div>
      <div class="kpi teal"><div class="kpi-label">সক্রিয় Center</div><div class="kpi-value">${toBn(ok.length)}</div></div>
    </div>
    ${["A", "B", "C"].map((cat) => {
      if (!catGroups[cat]?.length) return "";
      const catNames = { A: "A Category — উপপরিচালক", B: "B Category — উদ্যানতত্ত্ববিদ", C: "C Category — নার্সারী তত্ত্বাবধায়ক" };
      return `<div class="cat-group">
        <div class="cat-group-header cat${cat}">
          <span class="cat-group-title cat${cat}">${catNames[cat]}</span>
          <span class="cat-group-count">(${catGroups[cat].length}টি center)</span>
        </div>
        <div class="center-list">${catGroups[cat].map((c) => hCard(c)).join("")}</div>
      </div>`;
    }).join("")}`;
}

function renderCategoryView(el, cat) {
  const filtered = filterStats(allStats.filter((c) => c.status === "ok" && c.category === cat));
  if (!filtered.length) {
    el.innerHTML = '<div class="empty"><i class="ti ti-building-off"></i>এই category-তে কোনো center নেই।</div>';
    return;
  }
  el.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi green"><div class="kpi-label">মোট বিক্রয়</div><div class="kpi-value">৳${fmt(filtered.reduce((s, c) => s + c.total_revenue, 0))}</div></div>
      <div class="kpi purple"><div class="kpi-label">মোট উৎপাদন</div><div class="kpi-value">${fmtN(filtered.reduce((s, c) => s + c.total_produced, 0))}</div><div class="kpi-sub">টি চারা/কলম</div></div>
      <div class="kpi amber"><div class="kpi-label">মোট স্টক</div><div class="kpi-value">${fmtN(filtered.reduce((s, c) => s + c.total_stock, 0))}</div><div class="kpi-sub">টি চারা/কলম</div></div>
      <div class="kpi teal"><div class="kpi-label">Center সংখ্যা</div><div class="kpi-value">${filtered.length}</div></div>
    </div>
    <div class="center-list">${filtered.map((c) => hCard(c)).join("")}</div>`;
}

function hCard(c) {
  return `<div class="h-card cat${c.category}" onclick="viewDetail('${c.slug}')">
    <div class="h-card-rank cat${c.category}">${c.category}</div>
    <div class="h-card-info">
      <div class="h-card-name">${c.name_bn}</div>
      <div class="h-card-sub"><i class="ti ti-map-pin" style="font-size:10px"></i> ${c.location || c.name_en}</div>
    </div>
    <div class="h-card-stats">
      <div class="h-stat"><div class="h-stat-v" style="color:var(--green)">৳${fmtK(c.total_revenue)}</div><div class="h-stat-l">বিক্রয়</div></div>
      <div class="h-stat"><div class="h-stat-v" style="color:var(--purple)">${fmtK(c.total_produced)}</div><div class="h-stat-l">উৎপাদন</div></div>
      <div class="h-stat"><div class="h-stat-v" style="color:var(--amber)">${fmtK(c.total_stock)}</div><div class="h-stat-l">স্টক</div></div>
      <div class="h-stat"><div class="h-stat-v" style="color:var(--blue)">৳${fmtK(c.today_revenue)}</div><div class="h-stat-l">আজ</div></div>
      <div class="h-stat">
        <div class="tl-dot tl-${c.traffic_light}" style="margin:0 auto 3px"></div>
        <div class="h-stat-l">${toBn(c.perf_score)}</div>
      </div>
    </div>
    <div class="h-card-actions">
      <button class="h-btn primary" onclick="event.stopPropagation();viewDetail('${c.slug}')"><i class="ti ti-eye"></i> দেখুন</button>
    </div>
  </div>`;
}

function renderAllCenters(el) {
  if (!centers.length) {
    el.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    return;
  }
  const isDir = userRole === "director";
  el.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      ${isDir ? `<button class="h-btn primary" onclick="openAddModal()"><i class="ti ti-plus"></i> নতুন Center যোগ</button>` : ""}
    </div>
    <div class="center-list">
      ${centers.map((c) => `
        <div class="h-card cat${c.category || "B"}">
          <div class="h-card-rank cat${c.category || "B"}">${c.category || "B"}</div>
          <div class="h-card-info">
            <div class="h-card-name">${c.name_bn}</div>
            <div class="h-card-sub">/${c.slug} • ${c.district || ""} • ${c.active ? "সক্রিয়" : "বন্ধ"}</div>
          </div>
          <div class="h-card-actions">
            <button class="h-btn" onclick="viewDetail('${c.slug}')"><i class="ti ti-eye"></i> দেখুন</button>
            ${isDir ? `<button class="h-btn" onclick="openEditModal(${c.id})"><i class="ti ti-edit"></i> সম্পাদনা</button>
            <button class="h-btn" onclick="toggleCenter(${c.id})" style="${c.active ? "color:var(--red)" : "color:var(--green)"}"><i class="ti ti-power"></i>${c.active ? "বন্ধ" : "চালু"}</button>` : ""}
          </div>
        </div>`).join("")}
    </div>`;
}

async function viewDetail(slug) {
  currentDetailSlug = slug;
  currentView = "detail";
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document.getElementById("topbarTitle").textContent = "Center বিস্তারিত";
  const el = document.getElementById("mainContent");
  el.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  await fetchDetailData(slug);
}

async function fetchDetailData(slug) {
  const el = document.getElementById("mainContent");
  try {
    const r = await fetch(`${API}/center/${slug}`, {
      headers: { Authorization: "Bearer " + token },
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.message || d.error);
    currentDetailData = d;
    document.getElementById("topbarTitle").textContent = d.center.name_bn + " — বিস্তারিত";
    renderDetailContent();
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
  }
}

function renderDetailContent() {
  const el = document.getElementById("mainContent");
  el.innerHTML = `
    <button class="back-btn" onclick="goBack()"><i class="ti ti-arrow-left"></i> ফিরে যান</button>
    <div class="detail-tabs">
      <button class="dtab active" onclick="showDTab('dSales',this)"><i class="ti ti-coin"></i> বিক্রয়</button>
      <button class="dtab" onclick="showDTab('dProd',this)"><i class="ti ti-plant"></i> উৎপাদন</button>
      <button class="dtab" onclick="showDTab('dStock',this)"><i class="ti ti-stack-2"></i> স্টক</button>
      <button class="dtab" onclick="showDTab('dUsers',this)"><i class="ti ti-users"></i> ব্যবহারকারী</button>
      <button class="dtab" onclick="showDTab('dTarget',this)"><i class="ti ti-target"></i> লক্ষ্যমাত্রা</button>
      <button class="dtab" onclick="showDTab('dDamage',this)"><i class="ti ti-alert-triangle"></i> ক্ষতি/নষ্ট</button>
      <button class="dtab" onclick="showDTab('dIncome',this)"><i class="ti ti-cash"></i> অন্যান্য আয়</button>
      <button class="dtab" onclick="showDTab('dEmployee',this)"><i class="ti ti-users"></i> জনবল</button>
    </div>
    <div id="detailTabContent"></div>`;
  renderDetailTab("dSales");
}

function goBack() {
  navTo("overview", document.getElementById("nav-overview"));
}

function showDTab(tab, btn) {
  currentDTab = tab;
  document.querySelectorAll(".dtab").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  if (tab === 'dEmployee') {
    renderEmployeeTab(currentDetailSlug, currentDetailData?.center?.category || 'B');
    return;
  }
  renderDetailTab(tab);
}

async function renderEmployeeTab(slug, category) {
  const el = document.getElementById("detailTabContent");
  el.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const r = await fetch(`${API}/center/${slug}/employees`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || d.message);

    const cat = d.category || 'B';
    const sanc = SANCTIONED[cat] || SANCTIONED['B'];
    const totalSanc = Object.values(sanc).reduce((s, v) => s + v, 0);
    const filledPermanent = d.permanent.filter(e => e.status === 'active').length;
    const vacant = Math.max(0, totalSanc - filledPermanent);

    const desigMap = {};
    d.permanent.forEach(e => {
      if (e.status === 'active') desigMap[e.designation] = (desigMap[e.designation] || 0) + 1;
    });

    el.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi purple">
          <div class="kpi-label">মঞ্জুরিকৃত পদ</div>
          <div class="kpi-value">${fmtN(totalSanc)}</div>
          <div class="kpi-sub">ক্যাটাগরী-${cat}</div>
        </div>
        <div class="kpi green">
          <div class="kpi-label">কর্মরত (স্থায়ী)</div>
          <div class="kpi-value">${fmtN(filledPermanent)}</div>
        </div>
        <div class="kpi red">
          <div class="kpi-label">শূন্য পদ</div>
          <div class="kpi-value">${fmtN(vacant)}</div>
        </div>
        <div class="kpi amber">
          <div class="kpi-label">সাময়িক শ্রমিক</div>
          <div class="kpi-value">${fmtN(d.temporary.filter(e => e.status === 'active').length)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head">📋 পদভিত্তিক অবস্থান <span>ক্যাটাগরী-${cat}</span></div>
        <div class="tw">
          <table><thead>
            <tr><th>পদ</th><th>মঞ্জুরিকৃত</th><th>কর্মরত</th><th>শূন্য</th><th>অবস্থা</th></tr>
          </thead><tbody>
            ${Object.entries(sanc).map(([post, sanctAmt]) => {
              const filled = desigMap[post] || 0;
              const vac = Math.max(0, sanctAmt - filled);
              const icon = vac === 0 ? '✅' : filled === 0 ? '🔴' : '⚠️';
              return `<tr>
                <td>${post}</td>
                <td style="text-align:center">${sanctAmt}</td>
                <td style="color:var(--green);font-weight:600;text-align:center">${filled}</td>
                <td style="color:${vac > 0 ? 'var(--red)' : 'var(--green)'};font-weight:600;text-align:center">${vac}</td>
                <td style="text-align:center">${icon}</td>
              </tr>`;
            }).join('')}
          </tbody></table>
        </div>
      </div>
      ${d.permanent.length ? `
      <div class="card">
        <div class="card-head">👔 স্থায়ী জনবল <span>${d.permanent.length} জন</span></div>
        <div class="tw">
          <table><thead>
            <tr><th>নাম</th><th>পদ</th><th>কর্মী আইডি</th><th>মোবাইল</th><th>অবস্থা</th></tr>
          </thead><tbody>
            ${d.permanent.map(e => `<tr>
              <td style="font-weight:600">${e.name_bn}</td>
              <td>${e.designation}</td>
              <td style="font-family:monospace;color:var(--muted)">${e.employee_id || '—'}</td>
              <td style="color:var(--muted)">${e.mobile || '—'}</td>
              <td><span class="pill ${e.status === 'active' ? 'on' : 'off'}">${e.status === 'active' ? 'কর্মরত' : 'নিষ্ক্রিয়'}</span></td>
            </tr>`).join('')}
          </tbody></table>
        </div>
      </div>` : ''}
      ${d.temporary.length ? `
      <div class="card">
        <div class="card-head">👷 সাময়িক শ্রমিক <span>${d.temporary.length} জন</span></div>
        <div class="tw">
          <table><thead>
            <tr><th>নাম</th><th>পদ</th><th>ধরন</th><th>মোবাইল</th><th>অবস্থা</th></tr>
          </thead><tbody>
            ${d.temporary.map(e => `<tr>
              <td style="font-weight:600">${e.name_bn}</td>
              <td>${e.designation || '—'}</td>
              <td><span class="pill ${e.worker_type === 'নিয়মিত' ? 'active' : 'sold'}">${e.worker_type || '—'}</span></td>
              <td style="color:var(--muted)">${e.mobile || '—'}</td>
              <td><span class="pill ${e.status === 'active' ? 'on' : 'off'}">${e.status === 'active' ? 'কর্মরত' : 'নিষ্ক্রিয়'}</span></td>
            </tr>`).join('')}
          </tbody></table>
        </div>
      </div>` : ''}
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
  }
}

function renderDetailTab(tab) {
  const d = currentDetailData;
  if (!d) return;
  const el = document.getElementById("detailTabContent");
  if (tab === "dSales") {
    const s = d.sales;
    const maxRev = Math.max(...s.monthly.map((m) => parseFloat(m.revenue)), 1);
    el.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi green"><div class="kpi-label">মোট রাজস্ব</div><div class="kpi-value">৳${fmt(s.summary.total_revenue)}</div><div class="kpi-sub">${s.summary.total_invoices} চালান</div></div>
        <div class="kpi blue"><div class="kpi-label">আজকের বিক্রয়</div><div class="kpi-value">৳${fmt(s.today.today_revenue)}</div><div class="kpi-sub">${s.today.today_invoices} চালান</div></div>
        <div class="kpi amber"><div class="kpi-label">পরিশোধিত</div><div class="kpi-value">৳${fmt(s.summary.paid_amount)}</div></div>
        <div class="kpi red"><div class="kpi-label">বকেয়া</div><div class="kpi-value">৳${fmt(s.summary.due_amount)}</div></div>
      </div>
      <div class="card"><div class="card-head">📅 মাসিক বিক্রয়</div>
        <div class="card-body">${s.monthly.map((m, i) => `<div class="bar-row"><div class="bar-label">${m.label}</div><div class="bar-track"><div class="bar-fill" style="width:${((parseFloat(m.revenue) / maxRev) * 100).toFixed(0)}%;background:${COLORS[i % COLORS.length]}">${m.invoices} চালান</div></div><div class="bar-end">৳${fmtK(m.revenue)}</div></div>`).join("") || '<div class="empty" style="padding:16px">Data নেই</div>'}</div>
      </div>
      <div class="card"><div class="card-head">🏆 সর্বাধিক বিক্রিত <span>Top 8</span></div>
        <div class="tw"><table><thead><tr><th>চারা</th><th>জাত</th><th>বিক্রিত</th><th>রাজস্ব</th><th>স্টক</th></tr></thead>
        <tbody>${d.top_seedlings.map((s) => `<tr><td>${s.name_bn}</td><td style="color:var(--muted)">${s.variety || "—"}</td><td style="color:var(--purple);font-weight:600">${fmtN(s.total_sold)}</td><td style="color:var(--green);font-weight:600">৳${fmt(s.revenue)}</td><td>${fmtN(s.current_stock)}</td></tr>`).join("") || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:16px">বিক্রয় নেই</td></tr>'}</tbody></table></div>
      </div>
      ${userRole !== "director" ? `<div class="card"><div class="card-head">🧾 সাম্প্রতিক চালান</div>
        <div class="tw"><table><thead><tr><th>চালান #</th><th>গ্রাহক</th><th>তারিখ</th><th>পরিমাণ</th><th>অবস্থা</th></tr></thead>
        <tbody>${s.recent.map((r) => `<tr><td style="font-family:monospace">${r.invoice_no}</td><td>${r.customer_name || "—"}</td><td>${r.sale_date?.toString().slice(0, 10) || "—"}</td><td style="color:var(--green);font-weight:600">৳${fmt(r.total_amount)}</td><td><span class="pill ${r.payment_status === "paid" ? "paid" : "due"}">${r.payment_status === "paid" ? "পরিশোধিত" : "বকেয়া"}</span></td></tr>`).join("") || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:16px">Data নেই</td></tr>'}</tbody></table></div>
      </div>` : ""}`;
  } else if (tab === "dProd") {
    const p = d.production;
    const maxProd = Math.max(...p.by_type.map((t) => parseInt(t.total_qty)), 1);
    el.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi purple"><div class="kpi-label">মোট উৎপাদিত</div><div class="kpi-value">${fmtN(p.summary.total_produced)}</div><div class="kpi-sub">${p.summary.total_batches} ব্যাচ</div></div>
        <div class="kpi green"><div class="kpi-label">সফল</div><div class="kpi-value">${fmtN(p.summary.total_success)}</div><div class="kpi-sub">গড় ${toBn(parseFloat(p.summary.avg_success).toFixed(1))}%</div></div>
        <div class="kpi red"><div class="kpi-label">ব্যর্থ</div><div class="kpi-value">${fmtN(p.summary.total_failed)}</div></div>
        <div class="kpi amber"><div class="kpi-label">পাওয়া যাচ্ছে</div><div class="kpi-value">${fmtN(p.summary.total_available)}</div></div>
      </div>
      <div class="card"><div class="card-head">🌱 পদ্ধতি অনুযায়ী</div>
        <div class="card-body">${p.by_type.map((t, i) => `<div class="bar-row"><div class="bar-label">${typeLabel(t.production_type)}</div><div class="bar-track"><div class="bar-fill" style="width:${((parseInt(t.total_qty) / maxProd) * 100).toFixed(0)}%;background:${COLORS[i % COLORS.length]}">${t.batches} ব্যাচ</div></div><div class="bar-end">${fmtN(t.total_qty)}</div></div>`).join("") || '<div class="empty" style="padding:16px">Data নেই</div>'}</div>
      </div>
      <div class="card"><div class="card-head">📦 সাম্প্রতিক ব্যাচ</div>
        <div class="tw"><table><thead><tr><th>ব্যাচ ID</th><th>চারা</th><th>পদ্ধতি</th><th>উৎপাদিত</th><th>পাওয়া যাচ্ছে</th><th>অবস্থা</th></tr></thead>
        <tbody>${p.recent.map((r) => `<tr><td style="font-family:monospace">${r.batch_code}</td><td>${r.seedling || "—"}</td><td>${typeLabel(r.production_type)}</td><td style="color:var(--purple);font-weight:600">${fmtN(r.produced_quantity)}</td><td style="color:var(--green)">${fmtN(r.available_quantity)}</td><td><span class="pill ${r.status === "active" ? "active" : "sold"}">${r.status === "active" ? "সক্রিয়" : "শেষ"}</span></td></tr>`).join("") || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px">Data নেই</td></tr>'}</tbody></table></div>
      </div>`;
  } else if (tab === "dStock") {
    const st = d.stock;
    el.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi amber"><div class="kpi-label">মোট স্টক</div><div class="kpi-value">${fmtN(st.summary.total_stock)}</div><div class="kpi-sub">${st.summary.total_species} প্রজাতি</div></div>
        <div class="kpi green"><div class="kpi-label">স্টক মূল্য</div><div class="kpi-value">৳${fmt(st.summary.stock_value)}</div></div>
        <div class="kpi red"><div class="kpi-label">কম স্টক</div><div class="kpi-value">${st.summary.low_stock_count}</div></div>
      </div>
      <div class="card"><div class="card-head">📂 ক্যাটাগরি অনুযায়ী</div>
        <div class="tw"><table><thead><tr><th>ক্যাটাগরি</th><th>প্রজাতি</th><th>স্টক</th></tr></thead>
        <tbody>${st.categories.map((c) => `<tr><td>${c.name_bn}</td><td>${c.seedling_count}</td><td style="color:var(--amber);font-weight:600">${fmtN(c.total_stock)}</td></tr>`).join("") || '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:16px">Data নেই</td></tr>'}</tbody></table></div>
      </div>`;
  } else if (tab === "dUsers") {
    el.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi blue"><div class="kpi-label">মোট ব্যবহারকারী</div><div class="kpi-value">${d.users.length}</div></div>
        <div class="kpi green"><div class="kpi-label">সক্রিয়</div><div class="kpi-value">${d.users.filter((u) => u.is_active).length}</div></div>
        <div class="kpi red"><div class="kpi-label">নিষ্ক্রিয়</div><div class="kpi-value">${d.users.filter((u) => !u.is_active).length}</div></div>
      </div>
      <div class="card"><div class="card-head">👥 ব্যবহারকারী তালিকা</div>
        <div class="card-body"><div class="user-grid">
          ${d.users.map((u) => `<div class="user-item"><div class="user-av" style="background:${roleColor(u.role)}">${u.name.charAt(0).toUpperCase()}</div>
          <div><div class="user-name">${u.name}</div><div class="user-email">${u.email}</div>
          <div style="margin-top:3px;display:flex;gap:4px">
            <span class="pill active">${roleLabel(u.role)}</span>
            <span class="pill ${u.is_active ? "on" : "off"}">${u.is_active ? "সক্রিয়" : "বন্ধ"}</span>
          </div></div></div>`).join("") || '<div class="empty">কেউ নেই</div>'}
        </div></div>
      </div>`;
  } else if (tab === "dTarget") {
    const months = ["","জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
    const curFY = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const fyOpts = [curFY, curFY - 1, curFY - 2];

    const renderFYHTML = (targets, prod_achieved, sales_achieved) => {
      const prodT = targets.filter((t) => t.target_type === "production");
      const salesT = targets.filter((t) => t.target_type === "sales");
      const annualProd = prodT.find((t) => parseInt(t.target_month || 0) === 0);
      const annualSales = salesT.find((t) => parseInt(t.target_month || 0) === 0);
      const tProd = annualProd ? parseInt(annualProd.target_quantity || 0) : prodT.reduce((s, t) => parseInt(t.target_month) > 0 ? s + parseInt(t.target_quantity || 0) : s, 0);
      const tSales = annualSales ? parseFloat(annualSales.target_amount || 0) : salesT.reduce((s, t) => parseInt(t.target_month) > 0 ? s + parseFloat(t.target_amount || 0) : s, 0);
      const pp = tProd > 0 ? Math.min(Math.round((prod_achieved / tProd) * 100), 100) : 0;
      const sp = tSales > 0 ? Math.min(Math.round((sales_achieved / tSales) * 100), 100) : 0;
      const pc = (p) => p >= 70 ? "var(--green)" : p >= 40 ? "var(--amber)" : "var(--red)";
      return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="card" style="border-left:3px solid var(--purple);padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
              <div>
                <div style="font-size:12px;font-weight:600;color:var(--purple)">🌱 উৎপাদন</div>
                <div style="font-size:12px;color:var(--muted);margin-top:4px">লক্ষ্য: <b style="color:var(--text)">${fmtN(tProd)}টি</b> &nbsp;|&nbsp; অর্জন: <b style="color:var(--green)">${fmtN(prod_achieved)}টি</b></div>
              </div>
              <div style="font-size:28px;font-weight:700;color:${pc(pp)};line-height:1">${toBn(pp)}%</div>
            </div>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
              <div style="height:6px;width:${pp}%;background:${pc(pp)};border-radius:3px;transition:.5s"></div>
            </div>
          </div>
          <div class="card" style="border-left:3px solid var(--green);padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
              <div>
                <div style="font-size:12px;font-weight:600;color:var(--green)">💰 বিক্রয়</div>
                <div style="font-size:12px;color:var(--muted);margin-top:4px">লক্ষ্য: <b style="color:var(--text)">৳${fmt(tSales)}</b> &nbsp;|&nbsp; অর্জন: <b style="color:var(--green)">৳${fmt(sales_achieved)}</b></div>
              </div>
              <div style="font-size:28px;font-weight:700;color:${pc(sp)};line-height:1">${toBn(sp)}%</div>
            </div>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
              <div style="height:6px;width:${sp}%;background:${pc(sp)};border-radius:3px;transition:.5s"></div>
            </div>
          </div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--muted);margin-bottom:10px">মাসিভিত্তিক লক্ষ্যমাত্রা</div>
        ${targets.length ? `<div class="tw"><table>
          <thead><tr><th>সময়কাল</th><th>ধরন</th><th>লক্ষ্য (পরিমাণ)</th><th>লক্ষ্য (৳)</th><th>মন্তব্য</th></tr></thead>
          <tbody>${targets.map((t) => `<tr>
            <td style="font-weight:500">${parseInt(t.target_month || 0) === 0 ? "অর্থবছর মোট " + t.target_year + "-" + (parseInt(t.target_year) + 1) : months[t.target_month] + " " + t.target_year}</td>
            <td><span class="pill ${t.target_type === "production" ? "active" : "paid"}">${t.target_type === "production" ? "উৎপাদন" : "বিক্রয়"}</span></td>
            <td style="color:var(--purple);font-weight:600">${fmtN(t.target_quantity)}টি</td>
            <td style="color:var(--green);font-weight:600">৳${fmt(t.target_amount)}</td>
            <td style="color:var(--muted)">${t.remarks || "—"}</td>
          </tr>`).join("")}</tbody>
        </table></div>` : '<div class="empty" style="padding:20px">এই অর্থবছরে কোনো লক্ষ্যমাত্রা নেই</div>'}`;
    };
    window._renderFYHTML = renderFYHTML;

    const lTAFull = async (fy) => {
      document.getElementById("saTargetResults").innerHTML = '<div class="lt">লোড হচ্ছে...</div>';
      try {
        const r = await fetch(`${API}/center/${currentDetailSlug}/targets?fy=${fy}&_t=${Date.now()}`, {
          headers: { Authorization: "Bearer " + token, "Cache-Control": "no-cache" },
        });
        const data = await r.json();
        if (!data.success) { document.getElementById("saTargetResults").innerHTML = `<div class="lt">${data.error || "Error"}</div>`; return; }
        document.getElementById("saTargetResults").innerHTML = window._renderFYHTML(data.targets, data.prod_achieved, data.sales_achieved);
      } catch (e) { document.getElementById("saTargetResults").innerHTML = `<div class="lt">লোড হয়নি।</div>`; }
    };
    window._lTA = lTAFull;

    const preloaded = d.fy_data;
    const initHTML = preloaded && preloaded.targets ? renderFYHTML(preloaded.targets, preloaded.prod_achieved, preloaded.sales_achieved) : '<div class="lt">লোড হচ্ছে...</div>';

    el.innerHTML = `
      <div class="card">
        <div class="card-head" style="display:flex;justify-content:space-between;align-items:center">
          <span>🎯 লক্ষ্যমাত্রা বনাম অর্জন</span>
          <select id="saFYSelect" onchange="window._lTA(parseInt(this.value))"
            style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:7px;font-size:12px;font-family:inherit;cursor:pointer">
            ${fyOpts.map((y) => `<option value="${y}"${y === curFY ? " selected" : ""}>FY ${y}-${y + 1}</option>`).join("")}
          </select>
        </div>
        <div id="saTargetResults">${initHTML}</div>
      </div>`;

    if (!preloaded || !preloaded.targets) lTAFull(curFY);
  } else if (tab === "dDamage") {
    const dm = d.damages;
    el.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:16px">
        <div class="kpi red"><div class="kpi-label">মোট ক্ষতিগ্রস্ত</div><div class="kpi-value">${fmtN(dm.total_damaged)}</div></div>
        <div class="kpi amber"><div class="kpi-label">মোট রিপোর্ট</div><div class="kpi-value">${dm.total_reports}</div></div>
      </div>
      ${dm.by_reason.length ? `<div class="card">
        <div class="card-head">📋 কারণ অনুযায়ী ক্ষতির বিবরণ</div>
        <div class="tw"><table><thead><tr><th>কারণ</th><th>মোট ক্ষতিগ্রস্ত</th><th>রিপোর্ট সংখ্যা</th></tr></thead>
        <tbody>${dm.by_reason.map((r) => `<tr><td>${r.reason || "অজানা"}</td><td style="color:var(--red);font-weight:600">${fmtN(r.total_damaged)}</td><td style="color:var(--amber)">${r.count}</td></tr>`).join("")}</tbody></table></div>
      </div>` : '<div class="empty"><i class="ti ti-plant-off"></i>কোনো ক্ষতির তথ্য নেই</div>'}`;
  } else if (tab === "dIncome") {
    const oi = d.other_income;
    el.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:16px">
        <div class="kpi teal"><div class="kpi-label">মোট অন্যান্য আয়</div><div class="kpi-value">৳${fmt(oi.total)}</div></div>
        <div class="kpi blue"><div class="kpi-label">আয়ের ধরন</div><div class="kpi-value">${oi.breakdown.length}</div></div>
      </div>
      ${oi.breakdown.length ? `<div class="card">
        <div class="card-head">💰 আয়ের বিবরণ</div>
        <div class="tw"><table><thead><tr><th>আয়ের ধরন</th><th>মোট আয়</th><th>সংখ্যা</th></tr></thead>
        <tbody>${oi.breakdown.map((r) => `<tr><td>${r.income_type || "অজানা"}</td><td style="color:var(--teal);font-weight:600">৳${fmt(r.total)}</td><td style="color:var(--muted)">${r.count}</td></tr>`).join("")}</tbody></table></div>
      </div>` : '<div class="empty"><i class="ti ti-cash-off"></i>কোনো অন্যান্য আয় নেই</div>'}`;
  }
}

function renderDistrictSummaryView(el) {
  const ok = filterStats(allStats.filter((c) => c.status === "ok"));
  if (!ok.length) { el.innerHTML = '<div class="empty">Data নেই।</div>'; return; }
  const byDistrict = {}, byDivision = {};
  ok.forEach((c) => {
    const d = c.district || "অজানা", dv = c.division || "অজানা";
    if (!byDistrict[d]) byDistrict[d] = { centers: [], division: dv };
    byDistrict[d].centers.push(c);
    if (!byDivision[dv]) byDivision[dv] = { centers: [] };
    byDivision[dv].centers.push(c);
  });
  const districtCards = Object.entries(byDistrict).sort((a, b) => b[1].centers.length - a[1].centers.length).map(([dist, data]) => {
    const cs = data.centers;
    const rev = cs.reduce((s, c) => s + c.total_revenue, 0);
    const prod = cs.reduce((s, c) => s + c.total_produced, 0);
    const stock = cs.reduce((s, c) => s + c.total_stock, 0);
    const catA = cs.filter((c) => c.category === "A").length;
    const catB = cs.filter((c) => c.category === "B").length;
    const catC = cs.filter((c) => c.category === "C").length;
    const avgScore = Math.round(cs.reduce((s, c) => s + c.perf_score, 0) / cs.length);
    return `<div class="card" style="margin-bottom:14px">
      <div class="card-head" style="border-left:3px solid var(--accent)">
        <div><span style="font-size:16px;font-weight:700">${dist}</span><span style="font-size:12px;color:var(--muted);margin-left:8px">${data.division}</span></div>
        <div style="display:flex;gap:8px;align-items:center">
          ${catA ? `<span style="font-size:11px;padding:2px 8px;border-radius:5px;background:#1e1b4b;color:#a5b4fc">A×${catA}</span>` : ""}
          ${catB ? `<span style="font-size:11px;padding:2px 8px;border-radius:5px;background:#052e16;color:#4ade80">B×${catB}</span>` : ""}
          ${catC ? `<span style="font-size:11px;padding:2px 8px;border-radius:5px;background:#431407;color:#fb923c">C×${catC}</span>` : ""}
          <span style="font-size:12px;color:var(--muted)">${cs.length}টি center</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border)">
        <div style="background:var(--card);padding:14px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--green)">৳${fmtK(rev)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">মোট বিক্রয়</div></div>
        <div style="background:var(--card);padding:14px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--purple)">${fmtN(prod)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">মোট উৎপাদন</div></div>
        <div style="background:var(--card);padding:14px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--amber)">${fmtN(stock)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">মোট স্টক</div></div>
        <div style="background:var(--card);padding:14px;text-align:center"><div style="font-size:18px;font-weight:700;color:${scoreColor(avgScore)}">${toBn(avgScore)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">গড় Score</div></div>
      </div>
      <div style="padding:12px 16px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Center সমূহ:</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${cs.map((c) => `<div onclick="viewDetail('${c.slug}')" style="cursor:pointer;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:6px 10px;display:flex;align-items:center;gap:6px;transition:.15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;background:${c.category === "A" ? "#1e1b4b" : c.category === "B" ? "#052e16" : "#431407"};color:${c.category === "A" ? "#a5b4fc" : c.category === "B" ? "#4ade80" : "#fb923c"}">${c.category}</span>
            <span style="font-size:12px;font-weight:500">${c.name_bn.replace("হর্টিকালচার সেন্টার, ", "")}</span>
            <div class="tl-dot tl-${c.traffic_light}"></div>
          </div>`).join("")}
        </div>
      </div>
    </div>`;
  }).join("");
  const divisionSummary = Object.entries(byDivision).sort((a, b) => b[1].centers.length - a[1].centers.length).map(([div, data]) => {
    const cs = data.centers;
    const rev = cs.reduce((s, c) => s + c.total_revenue, 0);
    const prod = cs.reduce((s, c) => s + c.total_produced, 0);
    return `<tr><td style="font-weight:600">${div}</td><td style="color:var(--muted)">${[...new Set(cs.map((c) => c.district))].join(", ")}</td><td style="font-weight:700">${cs.length}</td><td style="color:var(--green);font-weight:600">৳${fmtK(rev)}</td><td style="color:var(--purple);font-weight:600">${fmtN(prod)}</td></tr>`;
  }).join("");
  el.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button id="btn-district" onclick="window._dView('district')" style="padding:7px 16px;border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit;border:none;background:var(--accent);color:#fff">🗺️ জেলাভিত্তিক</button>
      <button id="btn-division" onclick="window._dView('division')" style="padding:7px 16px;border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit;border:1px solid var(--border);background:var(--card);color:var(--muted)">🏔️ বিভাগভিত্তিক</button>
    </div>
    <div id="view-district">${districtCards}</div>
    <div id="view-division" style="display:none">
      <div class="card"><div class="card-head">🏔️ বিভাগভিত্তিক সারসংক্ষেপ</div>
        <div class="tw"><table><thead><tr><th>বিভাগ</th><th>জেলাসমূহ</th><th>Center সংখ্যা</th><th style="color:var(--green)">মোট বিক্রয়</th><th style="color:var(--purple)">মোট উৎপাদন</th></tr></thead>
        <tbody>${divisionSummary}</tbody></table></div>
      </div>
    </div>`;
  window._dView = (type) => {
    document.getElementById("view-district").style.display = type === "district" ? "block" : "none";
    document.getElementById("view-division").style.display = type === "division" ? "block" : "none";
    document.getElementById("btn-district").style.cssText = type === "district" ? "padding:7px 16px;border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit;border:none;background:var(--accent);color:#fff" : "padding:7px 16px;border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit;border:1px solid var(--border);background:var(--card);color:var(--muted)";
    document.getElementById("btn-division").style.cssText = type === "division" ? "padding:7px 16px;border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit;border:none;background:var(--accent);color:#fff" : "padding:7px 16px;border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit;border:1px solid var(--border);background:var(--card);color:var(--muted)";
  };
}

function renderTargetSummaryView(el) {
  const ok = filterStats(allStats.filter((c) => c.status === "ok"));
  if (!ok.length) { el.innerHTML = '<div class="empty">Data নেই।</div>'; return; }
  const curFY = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const months = ["","জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  const curMonth = new Date().getMonth() + 1;
  const totalAnnual = ok.reduce((s, c) => s + (c.annual_prod_target || 0), 0);
  const totalMonthlyTarget = ok.reduce((s, c) => s + (c.monthly_prod_target || 0), 0);
  const totalMonthlyAchieved = ok.reduce((s, c) => s + (c.monthly_prod_achieved || 0), 0);
  const overallPct = totalMonthlyTarget > 0 ? Math.round((totalMonthlyAchieved / totalMonthlyTarget) * 100) : 0;
  const centersOnTrack = ok.filter((c) => c.monthly_prod_target > 0 && c.monthly_prod_achieved / c.monthly_prod_target >= 0.7).length;
  const setTargetBtn = userRole === 'director' ? `<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="h-btn primary" onclick="openSetTargetModal()"><i class="ti ti-target"></i> লক্ষ্যমাত্রা নির্ধারণ</button></div>` : '';
  el.innerHTML = `
    ${setTargetBtn}
    <div class="kpi-grid" style="margin-bottom:16px">
      <div class="kpi purple"><div class="kpi-label">অর্থবছরের মোট লক্ষ্যমাত্রা</div><div class="kpi-value">${fmtN(totalAnnual)}টি</div><div class="kpi-sub">FY ${curFY}-${curFY + 1}</div></div>
      <div class="kpi blue"><div class="kpi-label">চলতি মাসের লক্ষ্যমাত্রা</div><div class="kpi-value">${fmtN(totalMonthlyTarget)}টি</div><div class="kpi-sub">${months[curMonth]}</div></div>
      <div class="kpi ${overallPct >= 70 ? "green" : overallPct >= 40 ? "amber" : "red"}"><div class="kpi-label">চলতি মাসের অর্জন</div><div class="kpi-value">${fmtN(totalMonthlyAchieved)}টি</div><div class="kpi-sub">${toBn(overallPct)}% অগ্রগতি</div></div>
      <div class="kpi teal"><div class="kpi-label">লক্ষ্যমাত্রা অনুযায়ী (≥70%)</div><div class="kpi-value">${centersOnTrack}</div><div class="kpi-sub">${ok.length}টি center-এর মধ্যে</div></div>
    </div>
    <div class="card"><div class="card-head">📋 প্রতিটি Center-এর লক্ষ্যমাত্রা অর্জন <span>FY ${curFY}-${curFY + 1} | ${months[curMonth]}</span></div>
      <div class="tw"><table><thead><tr><th>Center</th><th>Cat</th><th style="color:var(--purple)">অর্থবছরের লক্ষ্যমাত্রা</th><th style="color:var(--blue)">চলতি মাসের লক্ষ্যমাত্রা</th><th style="color:var(--green)">চলতি মাসের অর্জন</th><th>অগ্রগতি</th><th>অবস্থা</th></tr></thead>
      <tbody>${[...ok].sort((a, b) => { const ap = a.monthly_prod_target > 0 ? a.monthly_prod_achieved / a.monthly_prod_target : 0; const bp = b.monthly_prod_target > 0 ? b.monthly_prod_achieved / b.monthly_prod_target : 0; return bp - ap; }).map((c) => {
        const pct = c.monthly_prod_target > 0 ? Math.min(Math.round((c.monthly_prod_achieved / c.monthly_prod_target) * 100), 200) : null;
        const col = pct === null ? "var(--muted)" : pct >= 70 ? "var(--green)" : pct >= 40 ? "var(--amber)" : "var(--red)";
        return `<tr>
          <td><div style="font-weight:600;font-size:15px;cursor:pointer" onclick="viewDetail('${c.slug}')">${c.name_bn}</div><div style="font-size:11px;color:var(--muted)">${c.district || ""}</div></td>
          <td><span style="font-size:11px;padding:2px 6px;border-radius:5px;font-weight:700;background:${c.category === "A" ? "#1e1b4b" : c.category === "B" ? "#052e16" : "#431407"};color:${c.category === "A" ? "#a5b4fc" : c.category === "B" ? "#4ade80" : "#fb923c"}">${c.category}</span></td>
          <td style="color:var(--purple);font-weight:600">${c.annual_prod_target > 0 ? fmtN(c.annual_prod_target) + "টি" : '<span style="color:var(--muted);font-style:italic">নেই</span>'}</td>
          <td style="color:var(--blue);font-weight:600">${c.monthly_prod_target > 0 ? fmtN(c.monthly_prod_target) + "টি" : '<span style="color:var(--muted)">—</span>'}</td>
          <td style="color:var(--green);font-weight:600">${fmtN(c.monthly_prod_achieved)}টি</td>
          <td style="min-width:130px">${pct !== null ? `<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--border);border-radius:3px"><div style="height:6px;width:${Math.min(pct, 100)}%;background:${col};border-radius:3px"></div></div><span style="font-size:15px;font-weight:700;color:${col};min-width:36px">${toBn(pct)}%</span></div>` : '<span style="font-size:13px;color:var(--muted);font-style:italic">লক্ষ্যমাত্রা নেই</span>'}</td>
          <td><span class="pill ${c.traffic_light === "green" ? "on" : c.traffic_light === "yellow" ? "paid" : "due"}">${c.traffic_light === "green" ? "ভালো" : c.traffic_light === "yellow" ? "মাঝারি" : "দুর্বল"}</span></td>
        </tr>`;
      }).join("")}</tbody></table></div>
    </div>`;
}

function renderCompareView(el) {
  const ok = filterStats(allStats.filter((c) => c.status === "ok"));
  if (!ok.length) { el.innerHTML = '<div class="empty"><i class="ti ti-chart-off"></i>Data নেই।</div>'; return; }
  const districts = [...new Set(ok.map((c) => c.district).filter(Boolean))].sort();
  const divisions = [...new Set(ok.map((c) => c.division).filter(Boolean))].sort();
  const applyFilter = () => {
    const cat = document.getElementById("fcCat").value;
    const dist = document.getElementById("fcDist").value;
    const div = document.getElementById("fcDiv").value;
    let filtered = ok;
    if (cat) filtered = filtered.filter((c) => c.category === cat);
    if (dist) filtered = filtered.filter((c) => c.district === dist);
    if (div) filtered = filtered.filter((c) => c.division === div);
    renderCompareTable(filtered);
  };
  window._applyCompareFilter = applyFilter;
  el.innerHTML = `
    <div class="card" style="margin-bottom:14px;padding:14px 16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <span style="font-size:13px;color:var(--muted);font-weight:600">ফিল্টার:</span>
        <select id="fcCat" onchange="window._applyCompareFilter()" style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:7px;font-size:13px;font-family:inherit;cursor:pointer">
          <option value="">সব Category</option><option value="A">A — উপপরিচালক</option><option value="B">B — উদ্যানতত্ত্ববিদ</option><option value="C">C — নার্সারী</option>
        </select>
        <select id="fcDist" onchange="window._applyCompareFilter()" style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:7px;font-size:13px;font-family:inherit;cursor:pointer">
          <option value="">সব জেলা</option>${districts.map((d) => `<option value="${d}">${d}</option>`).join("")}
        </select>
        <select id="fcDiv" onchange="window._applyCompareFilter()" style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:7px;font-size:13px;font-family:inherit;cursor:pointer">
          <option value="">সব বিভাগ</option>${divisions.map((d) => `<option value="${d}">${d}</option>`).join("")}
        </select>
        <button onclick="document.getElementById('fcCat').value='';document.getElementById('fcDist').value='';document.getElementById('fcDiv').value='';window._applyCompareFilter()" style="background:var(--card);border:1px solid var(--border);color:var(--muted);padding:6px 12px;border-radius:7px;font-size:12px;cursor:pointer">✕ Reset</button>
        <span id="compareCount" style="font-size:12px;color:var(--muted);margin-left:auto">${ok.length}টি center</span>
        <button onclick="window._exportCSV()" style="background:var(--accent);border:none;color:#fff;padding:6px 14px;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px"><i class="ti ti-file-spreadsheet"></i> Excel</button>
        <button onclick="window._exportPDF()" style="background:#c084fc22;border:1px solid #c084fc44;color:#c084fc;padding:6px 14px;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px"><i class="ti ti-file-type-pdf"></i> PDF</button>
      </div>
    </div>
    <div id="compareResults"></div>`;
  renderCompareTable(ok);
}

function renderCompareTable(data) {
  const el = document.getElementById("compareResults");
  document.getElementById("compareCount").textContent = data.length + "টি center";
  window._rankData = data;
  if (!data.length) { el.innerHTML = '<div class="empty">এই ফিল্টারে কোনো center নেই।</div>'; return; }
  const ranked = [...data].sort((a, b) => b.perf_score - a.perf_score);
  el.innerHTML = `
    <div class="card" style="margin-bottom:14px">
      <div class="card-head">🏆 Performance Leaderboard <span>Score অনুযায়ী rank</span></div>
      <div style="padding:12px">
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;min-width:0">
        ${ranked.map((c, i) => `
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:.15s" onclick="viewDetail('${c.slug}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;background:${i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#334155"};color:${i < 3 ? "#000" : "#94a3b8"}">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1)}</div>
          <div class="score-ring"><svg width="52" height="52" viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" fill="none" stroke="#1e293b" stroke-width="6"/><circle cx="30" cy="30" r="25" fill="none" stroke="${scoreColor(c.perf_score)}" stroke-width="6" stroke-dasharray="${((c.perf_score / 100) * 157).toFixed(1)} 157" stroke-linecap="round" transform="rotate(-90 30 30)"/></svg><div class="score-text"><div class="score-num" style="color:${scoreColor(c.perf_score)};font-size:13px">${toBn(c.perf_score)}</div><div class="score-lbl" style="font-size:9px">/ ১০০</div></div></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name_bn}</div>
            <div style="font-size:13px;color:var(--muted);margin-top:2px">${c.district || ""} • <span style="color:${c.category === "A" ? "var(--catA)" : c.category === "B" ? "var(--catB)" : "var(--catC)"}">${c.category}</span></div>
          </div>
          <div style="display:flex;gap:14px;flex-shrink:0">
            <div style="text-align:center"><div style="font-size:14px;color:var(--green);font-weight:600">৳${fmtK(c.total_revenue)}</div><div style="font-size:12px;color:var(--muted);margin-top:1px">বিক্রয়</div></div>
            <div style="text-align:center"><div class="${c.growth_rate >= 0 ? "growth-up" : "growth-dn"}" style="font-size:14px">${c.growth_rate >= 0 ? "▲" : "▼"}${toBn(Math.abs(c.growth_rate).toFixed(1))}%</div><div style="font-size:12px;color:var(--muted);margin-top:1px">প্রবৃদ্ধি</div></div>
            <div style="text-align:center"><div class="tl-dot tl-${c.traffic_light}" style="margin:0 auto 2px"></div><div style="font-size:12px;color:var(--muted)">${tlLabel(c.traffic_light)}</div></div>
          </div>
        </div>`).join("")}
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-head">🎯 লক্ষ্যমাত্রা অর্জন <span>FY ${new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1}-${new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear()}</span></div>
      <div class="tw"><table><thead><tr><th>Center</th><th>Cat</th><th style="color:var(--purple)">অর্থবছরের লক্ষ্যমাত্রা</th><th style="color:var(--blue)">চলতি মাসের লক্ষ্যমাত্রা</th><th style="color:var(--green)">চলতি মাসের অর্জন</th><th>অগ্রগতি</th></tr></thead>
      <tbody>${[...data].sort((a, b) => { const ap = a.monthly_prod_target > 0 ? a.monthly_prod_achieved / a.monthly_prod_target : 0; const bp = b.monthly_prod_target > 0 ? b.monthly_prod_achieved / b.monthly_prod_target : 0; return bp - ap; }).map((c) => {
        const pct = c.monthly_prod_target > 0 ? Math.min(Math.round((c.monthly_prod_achieved / c.monthly_prod_target) * 100), 200) : null;
        const color = pct === null ? "var(--muted)" : pct >= 70 ? "var(--green)" : pct >= 40 ? "var(--amber)" : "var(--red)";
        return `<tr>
          <td><div style="font-weight:600;font-size:15px">${c.name_bn}</div><div style="font-size:13px;color:var(--muted)">${c.district || ""}</div></td>
          <td><span style="font-size:11px;padding:2px 6px;border-radius:5px;font-weight:700;background:${c.category === "A" ? "#1e1b4b" : c.category === "B" ? "#052e16" : "#431407"};color:${c.category === "A" ? "#a5b4fc" : c.category === "B" ? "#4ade80" : "#fb923c"}">${c.category}</span></td>
          <td style="color:var(--purple);font-weight:600">${c.annual_prod_target > 0 ? fmtN(c.annual_prod_target) + "টি" : '<span style="color:var(--muted);font-style:italic">নির্ধারিত নেই</span>'}</td>
          <td style="color:var(--blue);font-weight:600">${c.monthly_prod_target > 0 ? fmtN(c.monthly_prod_target) + "টি" : '<span style="color:var(--muted);font-style:italic">—</span>'}</td>
          <td style="color:var(--green);font-weight:600">${fmtN(c.monthly_prod_achieved)}টি</td>
          <td style="min-width:140px">${pct !== null ? `<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--border);border-radius:3px"><div style="height:6px;width:${Math.min(pct, 100)}%;background:${color};border-radius:3px"></div></div><span style="font-size:15px;font-weight:700;color:${color};min-width:36px">${toBn(pct)}%</span></div>` : '<span style="font-size:13px;color:var(--muted);font-style:italic">লক্ষ্যমাত্রা নেই</span>'}</td>
        </tr>`;
      }).join("")}</tbody></table></div>
    </div>
    <div class="card">
      <div class="card-head">🏅 র‍্যাংকিং টেবিল
        <div style="display:flex;gap:6px">
          ${["sales", "production", "stock"].map((t) => `<button onclick="window._sortRanking('${t}',this)" id="rankBtn-${t}" style="padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;border:1px solid var(--border);background:${t === "sales" ? "var(--accent)" : "var(--card)"};color:${t === "sales" ? "#fff" : "var(--muted)"}">${t === "sales" ? "বিক্রয়" : t === "production" ? "উৎপাদন" : "স্টক"}</button>`).join("")}
        </div>
      </div>
      <div id="rankingTableBody">${rankTableHTML([...data].sort((a, b) => b.total_revenue - a.total_revenue), "sales")}</div>
    </div>`;
}

function rankTableHTML(sorted, type) {
  const best = sorted[0], worst = sorted[sorted.length - 1];
  return `<div class="tw"><table><thead><tr><th>#</th><th>Center</th><th>জেলা</th><th>Cat</th><th style="color:var(--green)">বিক্রয়</th><th style="color:var(--purple)">উৎপাদন</th><th style="color:var(--amber)">স্টক</th><th>অবস্থা</th></tr></thead>
    <tbody>${sorted.map((c, i) => `<tr style="${c === best ? "background:#0a2a1a" : c === worst ? "background:#2a0a0a" : ""}">
      <td style="font-weight:700;color:${i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "var(--muted)"}">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
      <td><div style="font-weight:600;font-size:15px">${c.name_bn}</div></td>
      <td style="color:var(--muted);font-size:13px">${c.district || "—"}</td>
      <td><span style="font-size:11px;padding:2px 6px;border-radius:5px;font-weight:700;background:${c.category === "A" ? "#1e1b4b" : c.category === "B" ? "#052e16" : "#431407"};color:${c.category === "A" ? "#a5b4fc" : c.category === "B" ? "#4ade80" : "#fb923c"}">${c.category}</span></td>
      <td style="font-weight:700;color:${type === "sales" ? "var(--green)" : "var(--text)"}">৳${fmtK(c.total_revenue)}</td>
      <td style="font-weight:700;color:${type === "production" ? "var(--purple)" : "var(--text)"}">${fmtN(c.total_produced)}</td>
      <td style="font-weight:700;color:${type === "stock" ? "var(--amber)" : "var(--text)"}">${fmtN(c.total_stock)}</td>
      <td><span style="font-size:11px;padding:2px 7px;border-radius:10px;background:${c.traffic_light === "green" ? "#064e3b" : c.traffic_light === "yellow" ? "#451a03" : "#450a0a"};color:${c.traffic_light === "green" ? "#4ade80" : c.traffic_light === "yellow" ? "#fbbf24" : "#f87171"}">${c.traffic_light === "green" ? "ভালো" : c.traffic_light === "yellow" ? "মাঝারি" : "দুর্বল"}</span></td>
    </tr>`).join("")}</tbody></table>
    <div style="display:flex;gap:16px;padding:12px 16px;border-top:1px solid var(--border);font-size:12px">
      <span>🟢 <b style="color:#4ade80">${best?.name_bn}</b> — সর্বোচ্চ</span>
      <span>🔴 <b style="color:#f87171">${worst?.name_bn}</b> — সর্বনিম্ন</span>
    </div></div>`;
}

window._rankData = null;
window._sortRanking = (type, btn) => {
  const data = window._rankData;
  if (!data) return;
  const sorted = type === "sales" ? [...data].sort((a, b) => b.total_revenue - a.total_revenue) : type === "production" ? [...data].sort((a, b) => b.total_produced - a.total_produced) : [...data].sort((a, b) => b.total_stock - a.total_stock);
  document.getElementById("rankingTableBody").innerHTML = rankTableHTML(sorted, type);
  document.querySelectorAll("[id^=rankBtn-]").forEach((b) => { b.style.background = "var(--card)"; b.style.color = "var(--muted)"; });
  btn.style.background = "var(--accent)";
  btn.style.color = "#fff";
};

window._exportCSV = () => {
  const data = window._rankData;
  if (!data || !data.length) { showToast("কোনো data নেই।"); return; }
  const headers = ["Center","Category","জেলা","বিভাগ","মোট বিক্রয় (৳)","চলতি মাস (৳)","গত মাস (৳)","প্রবৃদ্ধি (%)","মোট উৎপাদন","মোট স্টক","লক্ষ্য অর্জন (%)","Performance Score","অবস্থা"];
  const rows = data.map((c) => [c.name_bn,c.category,c.district||"",c.division||"",c.total_revenue.toFixed(0),c.current_month_rev.toFixed(0),c.last_month_rev.toFixed(0),c.growth_rate.toFixed(1),c.total_produced,c.total_stock,c.target_achieved !== null ? c.target_achieved.toFixed(1) : "N/A",c.perf_score,c.traffic_light === "green" ? "ভালো" : c.traffic_light === "yellow" ? "মাঝারি" : "দুর্বল"]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `HortNet-BD_Report_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast("Excel (CSV) download হচ্ছে...");
};

window._exportPDF = () => {
  const data = window._rankData;
  if (!data || !data.length) { showToast("কোনো data নেই।"); return; }
  const rows = data.map((c, i) => `<tr><td>${i + 1}</td><td><b>${c.name_bn}</b></td><td>${c.category}</td><td>${c.district || "—"}</td><td>৳${c.total_revenue.toLocaleString()}</td><td>${c.growth_rate >= 0 ? "▲" : "▼"}${toBn(Math.abs(c.growth_rate).toFixed(1))}%</td><td>${c.total_produced.toLocaleString()}</td><td>${c.total_stock.toLocaleString()}</td><td>${c.target_achieved !== null ? toBn(c.target_achieved.toFixed(1)) + "%" : "—"}</td><td><b>${toBn(c.perf_score)}</b>/১০০</td><td>${c.traffic_light === "green" ? "✓ ভালো" : c.traffic_light === "yellow" ? "~ মাঝারি" : "✗ দুর্বল"}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HortNet-BD তুলনামূলক রিপোর্ট</title><style>@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Hind Siliguri',sans-serif;font-size:12px;color:#1a1a1a;padding:20px}h1{font-size:18px;color:#1a4731;margin-bottom:4px}.sub{color:#666;font-size:11px;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1a4731;color:#fff;padding:8px;text-align:left;font-size:11px}td{padding:7px 8px;border-bottom:1px solid #e5e7eb;font-size:11px}tr:nth-child(even) td{background:#f9fafb}.footer{margin-top:16px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px}</style></head><body>
    <h1>🌿 HortNet-BD — তুলনামূলক রিপোর্ট</h1>
    <div class="sub">তৈরির তারিখ: ${new Date().toLocaleDateString("bn-BD")} | মোট center: ${data.length}টি</div>
    <table><thead><tr><th>#</th><th>Center</th><th>Cat</th><th>জেলা</th><th>মোট বিক্রয়</th><th>প্রবৃদ্ধি</th><th>উৎপাদন</th><th>স্টক</th><th>লক্ষ্য %</th><th>Score</th><th>অবস্থা</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer">কৃষি সম্প্রসারণ অধিদপ্তর — হর্টিকালচার উইং | HortNet-BD Management System</div>
  </body></html>`;
  const win = window.open("", "_blank");
  win.document.write(html); win.document.close();
  setTimeout(() => win.print(), 500);
};

function openAddModal() {
  document.getElementById("editId").value = "";
  document.getElementById("modalTitle").textContent = "নতুন Center";
  ["fSlug","fNameBn","fNameEn","fLocation","fDbUrl","fDistrict","fDivision"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("fSlug").disabled = false;
  document.getElementById("fCategory").value = "B";
  document.getElementById("centerModal").classList.add("open");
}
function openEditModal(id) {
  const c = centers.find((x) => x.id === id);
  if (!c) return;
  document.getElementById("editId").value = c.id;
  document.getElementById("modalTitle").textContent = "Center সম্পাদনা";
  document.getElementById("fSlug").value = c.slug;
  document.getElementById("fSlug").disabled = true;
  document.getElementById("fNameBn").value = c.name_bn;
  document.getElementById("fNameEn").value = c.name_en;
  document.getElementById("fLocation").value = c.location || "";
  document.getElementById("fDistrict").value = c.district || "";
  document.getElementById("fDivision").value = c.division || "";
  document.getElementById("fCategory").value = c.category || "B";
  document.getElementById("fDbUrl").value = "";
  document.getElementById("centerModal").classList.add("open");
}
function closeModal() { document.getElementById("centerModal").classList.remove("open"); }

async function saveCenter() {
  const id = document.getElementById("editId").value;
  const data = {
    name_bn: document.getElementById("fNameBn").value.trim(),
    name_en: document.getElementById("fNameEn").value.trim(),
    location: document.getElementById("fLocation").value.trim(),
    district: document.getElementById("fDistrict").value.trim(),
    division: document.getElementById("fDivision").value.trim(),
    category: document.getElementById("fCategory").value,
    db_url: document.getElementById("fDbUrl").value.trim(),
    currency: "BDT",
  };
  if (!data.name_bn || !data.name_en) return showToast("নাম দিন।");
  try {
    let res;
    if (id) {
      const cur = centers.find((c) => c.id == id);
      res = await fetch(`${API}/tenants/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ ...data, db_url: data.db_url || cur?.db_url || "", active: cur?.active ?? true }) });
    } else {
      if (!data.db_url || !document.getElementById("fSlug").value.trim()) return showToast("Slug ও DB URL দিন।");
      res = await fetch(`${API}/tenants`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ slug: document.getElementById("fSlug").value.trim().toLowerCase(), ...data }) });
    }
    const d = await res.json();
    if (!d.success) return showToast(d.message || d.error);
    showToast(d.message);
    closeModal();
    await loadCenters();
    await loadAllStats(true);
    updateBadges();
    renderView(currentView);
  } catch { showToast("সমস্যা হয়েছে।"); }
}

async function toggleCenter(id) {
  try {
    const r = await fetch(`${API}/tenants/${id}/toggle`, { method: "POST", headers: { Authorization: "Bearer " + token } });
    const d = await r.json();
    showToast(d.message);
    await loadAll();
    renderView(currentView);
  } catch {}
}

function renderAdminMgmt(el) {
  const roleLabels = { director:"পরিচালক", deputy_director:"উপপরিচালক", horticulturist:"উদ্যানতত্ত্ববিদ", nursery_supervisor:"নার্সারী তত্ত্বাবধায়ক" };
  const roleColors = { director:"#7c3aed", deputy_director:"#059669", horticulturist:"#0284c7", nursery_supervisor:"#d97706" };
  el.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="h-btn primary" onclick="openAdminModal()"><i class="ti ti-user-plus"></i> নতুন Admin তৈরি</button>
    </div>
    ${allAdmins.length === 0 ? '<div class="empty"><i class="ti ti-users"></i>কোনো Admin নেই।</div>' : `<div class="center-list">
      ${allAdmins.map((a) => `
        <div class="h-card" style="border-left:4px solid ${roleColors[a.role] || "#7c3aed"}">
          <div style="width:44px;height:44px;border-radius:10px;background:${roleColors[a.role] || "#7c3aed"}22;border:1px solid ${roleColors[a.role] || "#7c3aed"}44;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:${roleColors[a.role] || "#7c3aed"};flex-shrink:0">${a.name.charAt(0).toUpperCase()}</div>
          <div class="h-card-info">
            <div class="h-card-name">${roleLabels[a.role] || a.role}${a.name ? ", " + a.name : ""}</div>
            <div class="h-card-sub">${["হর্টিকালচার সেন্টার", a.name, a.district, a.division].filter(Boolean).join(", ")}</div>
            <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">${a.assigned_centers.map((slug) => `<span style="background:#1e293b;border:1px solid #334155;padding:2px 8px;border-radius:6px;font-size:10px;color:#94a3b8">${slug}</span>`).join("")}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0"><span class="pill ${a.is_active ? "on" : "off"}">${a.is_active ? "সক্রিয়" : "বন্ধ"}</span></div>
          <div class="h-card-actions">
            <button class="h-btn" onclick="openAdminModal(${a.id})"><i class="ti ti-edit"></i> সম্পাদনা</button>
            <button class="h-btn" onclick="openAssignModal(${a.id})" style="color:var(--accent)"><i class="ti ti-link"></i> Center Assign</button>
            ${a.role !== "director" ? `<button class="h-btn" onclick="deleteAdmin(${a.id},'${a.name}')" style="color:var(--red)"><i class="ti ti-trash"></i></button>` : ""}
          </div>
        </div>`).join("")}
    </div>`}
    <div class="modal" id="adminModal">
      <div class="modal-box">
        <div class="modal-hdr"><h3 id="adminModalTitle">নতুন Admin তৈরি</h3><button class="close-btn" onclick="closeAdminModal()"><i class="ti ti-x"></i></button></div>
        <input type="hidden" id="adminEditId"/>
        <div class="fg-row">
          <div class="fg"><label>স্থানের নাম*</label><input id="aLocation" placeholder="পাচগাছিয়া"/></div>
          <div class="fg"><label>পদবী*</label><select id="aRole"><option value="deputy_director">উপপরিচালক</option><option value="horticulturist">উদ্যানতত্ত্ববিদ</option><option value="nursery_supervisor">নার্সারী তত্ত্বাবধায়ক</option></select></div>
        </div>
        <div class="fg"><label>ইমেইল*</label><input id="aEmail" type="email" placeholder="dd.feni@horticulture.bd"/></div>
        <div class="fg"><label>পাসওয়ার্ড* <span id="passHint" style="color:var(--muted);font-weight:400">(নতুন তৈরিতে আবশ্যক)</span></label><input id="aPassword" type="password" placeholder="••••••••"/></div>
        <div class="fg-row">
          <div class="fg"><label>জেলা</label><input id="aDistrict" placeholder="ফেনী"/></div>
          <div class="fg"><label>বিভাগ</label><input id="aDivision" placeholder="চট্টগ্রাম"/></div>
        </div>
        <div class="fg"><label>ফোন</label><input id="aPhone" placeholder="01700000000"/></div>
        <div class="fg" id="aStatusFg" style="display:none"><label>অবস্থা</label><select id="aIsActive"><option value="true">সক্রিয়</option><option value="false">বন্ধ</option></select></div>
        <div class="modal-footer"><button class="btn-cancel" onclick="closeAdminModal()">বাতিল</button><button class="btn-save" onclick="saveAdmin()">সংরক্ষণ</button></div>
      </div>
    </div>
    <div class="modal" id="assignModal">
      <div class="modal-box">
        <div class="modal-hdr"><h3>Center Assign করুন</h3><button class="close-btn" onclick="closeAssignModal()"><i class="ti ti-x"></i></button></div>
        <input type="hidden" id="assignAdminId"/>
        <p style="font-size:13px;color:var(--muted);margin-bottom:14px">যে center গুলো এই admin দেখবেন সেগুলো select করুন</p>
        <div id="centerCheckboxes" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto"></div>
        <div class="modal-footer"><button class="btn-cancel" onclick="closeAssignModal()">বাতিল</button><button class="btn-save" onclick="saveAssignments()">সংরক্ষণ</button></div>
      </div>
    </div>`;
}

function openAdminModal(id) {
  document.getElementById("adminModal").classList.add("open");
  if (id) {
    const a = allAdmins.find((x) => x.id === id);
    if (!a) return;
    document.getElementById("adminModalTitle").textContent = "Admin সম্পাদনা";
    document.getElementById("adminEditId").value = a.id;
    const nameParts = a.name.split(", ");
    document.getElementById("aLocation").value = nameParts.length > 1 ? nameParts.slice(1).join(", ") : a.name;
    document.getElementById("aEmail").value = a.email;
    document.getElementById("aRole").value = a.role;
    document.getElementById("aDistrict").value = a.district || "";
    document.getElementById("aDivision").value = a.division || "";
    document.getElementById("aPhone").value = a.phone || "";
    document.getElementById("aPassword").value = "";
    document.getElementById("aPassword").placeholder = "খালি রাখলে পরিবর্তন হবে না";
    document.getElementById("passHint").textContent = "(খালি রাখলে পরিবর্তন হবে না)";
    document.getElementById("aIsActive").value = a.is_active ? "true" : "false";
    document.getElementById("aStatusFg").style.display = "block";
  } else {
    document.getElementById("adminModalTitle").textContent = "নতুন Admin তৈরি";
    document.getElementById("adminEditId").value = "";
    ["aLocation","aEmail","aPassword","aDistrict","aDivision","aPhone"].forEach((id) => (document.getElementById(id).value = ""));
    document.getElementById("aPassword").placeholder = "••••••••";
    document.getElementById("passHint").textContent = "(আবশ্যক)";
    document.getElementById("aRole").value = "deputy_director";
    document.getElementById("aStatusFg").style.display = "none";
  }
}
function closeAdminModal() { document.getElementById("adminModal").classList.remove("open"); }

async function saveAdmin() {
  const id = document.getElementById("adminEditId").value;
  const role = document.getElementById("aRole").value;
  const location = document.getElementById("aLocation").value.trim();
  const name = location;
  const data = { name, email: document.getElementById("aEmail").value.trim(), role, district: document.getElementById("aDistrict").value.trim(), division: document.getElementById("aDivision").value.trim(), phone: document.getElementById("aPhone").value.trim(), password: document.getElementById("aPassword").value, is_active: id ? document.getElementById("aIsActive").value === "true" : true };
  if (!location || !data.email || !data.role) return showToast("স্থানের নাম, ইমেইল ও পদবী দিন।");
  if (!id && !data.password) return showToast("নতুন admin-এর জন্য পাসওয়ার্ড দিন।");
  try {
    const url = id ? `${API}/admins/${id}` : `${API}/admins`;
    const r = await fetch(url, { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(data) });
    const d = await r.json();
    if (!d.success) return showToast(d.message || d.error);
    showToast(d.message); closeAdminModal(); await loadAdmins(); renderView("adminMgmt");
  } catch { showToast("সমস্যা হয়েছে।"); }
}

async function deleteAdmin(id, name) {
  if (!confirm(`"${name}" মুছে ফেলবেন?`)) return;
  try {
    const r = await fetch(`${API}/admins/${id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
    const d = await r.json(); showToast(d.message); await loadAdmins(); renderView("adminMgmt");
  } catch {}
}

function openAssignModal(adminId) {
  document.getElementById("assignAdminId").value = adminId;
  const admin = allAdmins.find((a) => a.id === adminId);
  const assigned = admin?.assigned_centers || [];
  document.getElementById("centerCheckboxes").innerHTML = centers.map((c) => `
    <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#0f172a;border-radius:8px;cursor:pointer">
      <input type="checkbox" value="${c.slug}" ${assigned.includes(c.slug) ? "checked" : ""} style="width:16px;height:16px;accent-color:var(--accent)"/>
      <div><div style="font-size:15px;font-weight:600">${c.name_bn}</div><div style="font-size:13px;color:var(--muted)">${c.slug} • ${c.category} Category • ${c.district || ""}</div></div>
    </label>`).join("");
  document.getElementById("assignModal").classList.add("open");
}
function closeAssignModal() { document.getElementById("assignModal").classList.remove("open"); }

async function saveAssignments() {
  const adminId = document.getElementById("assignAdminId").value;
  const assigned_centers = [...document.getElementById("centerCheckboxes").querySelectorAll("input[type=checkbox]:checked")].map((cb) => cb.value);
  try {
    const r = await fetch(`${API}/admins/${adminId}/assignments`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ assigned_centers }) });
    const d = await r.json();
    if (!d.success) return showToast(d.message || d.error);
    showToast(d.message); closeAssignModal(); await loadAdmins(); renderView("adminMgmt");
  } catch { showToast("সমস্যা হয়েছে।"); }
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}
function toBn(n) { return String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]); }
function fmt(n) { return toBn(parseInt(parseFloat(n || 0)).toLocaleString("en-IN")); }
function fmtN(n) { return toBn(parseInt(n || 0).toLocaleString("en-IN")); }
function fmtK(n) {
  const v = parseFloat(n || 0);
  if (v >= 10000000) return toBn((v / 10000000).toFixed(1)) + " কোটি";
  if (v >= 100000) return toBn((v / 100000).toFixed(1)) + " লাখ";
  if (v >= 1000) return toBn((v / 1000).toFixed(1)) + " হাজার";
  return toBn(Math.round(v));
}
function scoreColor(s) { return s >= 70 ? "#4ade80" : s >= 45 ? "#fbbf24" : "#f87171"; }
function tlLabel(t) { return t === "green" ? "ভালো" : t === "yellow" ? "সতর্ক" : "সমস্যা"; }
function typeLabel(t) { return {seed:"বীজ",cutting:"কাটিং",layering:"লেয়ারিং",grafting:"গ্রাফটিং",budding:"বাডিং",tissue_culture:"টিস্যু কালচার",purchase:"ক্রয়"}[t] || t; }
function roleLabel(r) { return {admin:"Admin",manager:"Manager",production_officer:"Production",sales_operator:"Sales",viewer:"Viewer"}[r] || r; }
function roleColor(r) { return {admin:"#7c3aed",manager:"#0ea5e9",production_officer:"#10b981",sales_operator:"#f59e0b",viewer:"#64748b"}[r] || "#64748b"; }


// ══════════════════════════════════════════════
// লক্ষ্যমাত্রা নির্ধারণ — Super Admin থেকে
// ══════════════════════════════════════════════

function openSetTargetModal() {
  const sel = document.getElementById('tgCenter');
  if (sel) {
    sel.innerHTML = centers.map(c =>
      `<option value="${c.slug}">${c.name_bn}</option>`
    ).join('');
  }
  const now = new Date();
  const curFY = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const fySel = document.getElementById('tgFY2');
  if (fySel) {
    fySel.innerHTML = [curFY, curFY-1, curFY-2].map(y =>
      `<option value="${y}">FY ${toBn(y)}-${toBn(y+1)}</option>`
    ).join('');
  }
  ['tgQty2','tgAmt2','tgNotes2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const t2 = document.getElementById('tgType2');
  const p2 = document.getElementById('tgPeriod2');
  if (t2) t2.value = 'production';
  if (p2) { p2.value = 'annual'; toggleTgPeriod2(); }
  document.getElementById('mSetTarget').classList.add('open');
}

function toggleTgPeriod2() {
  const period = document.getElementById('tgPeriod2')?.value;
  const box = document.getElementById('tgMonthBox2');
  if (box) box.style.display = period === 'monthly' ? 'block' : 'none';
}

async function saveSetTarget() {
  const slug  = document.getElementById('tgCenter')?.value;
  const type  = document.getElementById('tgType2')?.value;
  const period= document.getElementById('tgPeriod2')?.value;
  const fy    = +document.getElementById('tgFY2')?.value;
  const month = period === 'annual' ? 0 : +document.getElementById('tgMonth2')?.value;
  const year  = period === 'annual' ? fy : (month >= 7 ? fy : fy + 1);
  const qty   = +document.getElementById('tgQty2')?.value || 0;
  const amt   = +document.getElementById('tgAmt2')?.value || 0;
  const notes = document.getElementById('tgNotes2')?.value || '';

  if (!slug) return showToast('সেন্টার বেছে নিন।');
  if (!qty && !amt) return showToast('পরিমাণ বা বিক্রয়ের লক্ষ্য দিন।');

  const centerName = centers.find(c => c.slug === slug)?.name_bn || slug;
  const btn = document.querySelector('#mSetTarget .btn-save');
  if (btn) { btn.textContent = 'সংরক্ষণ হচ্ছে...'; btn.disabled = true; }

  try {
    const r = await fetch(`${API}/center/${slug}/set-target`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        target_type: type,
        target_month: month,
        target_year: year,
        target_quantity: qty,
        target_amount: amt,
        notes
      })
    });
    const d = await r.json();
    if (d.success) {
      showToast(d.message || `✅ ${centerName}-এর লক্ষ্যমাত্রা নির্ধারণ হয়েছে`);
      document.getElementById('mSetTarget').classList.remove('open');
      await loadAllStats(true);
      renderView(currentView);
    } else {
      showToast(d.message || d.error || 'সমস্যা হয়েছে।');
    }
  } catch {
    showToast('সংযোগ সমস্যা।');
  } finally {
    if (btn) { btn.textContent = 'সংরক্ষণ করুন'; btn.disabled = false; }
  }
}

// ══════════════════════════════════════
// নোটিশ বোর্ড
// ══════════════════════════════════════

async function renderNoticeBoard(el) {
  const isDir = userRole === "director";
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="font-size:17px;font-weight:700">📢 নোটিশ বোর্ড</div>
      ${isDir ? `<button class="h-btn primary" onclick="openNoticeModal()"><i class="ti ti-plus"></i> নতুন নোটিশ</button>` : ""}
    </div>
    <div id="noticeList"><div class="loading-center"><div class="spinner"></div></div></div>`;
  await loadNotices();
}

async function loadNotices() {
  const el = document.getElementById("noticeList");
  if (!el) return;
  try {
    const r = await fetch(`${API}/notices`, {
      headers: { Authorization: "Bearer " + token },
    });
    const d = await r.json();

    if (!d.success || !d.data.length) {
      el.innerHTML = `<div class="empty"><i class="ti ti-speakerphone"></i>কোনো নোটিশ নেই</div>`;
      return;
    }

    const priColor = { urgent: "var(--red)", important: "var(--amber)", normal: "var(--blue)" };
    const priLabel = { urgent: "🔴 জরুরি", important: "🟡 গুরুত্বপূর্ণ", normal: "🔵 সাধারণ" };
    const priBg    = { urgent: "#2a0a0a", important: "#2a1a00", normal: "#0a1a2a" };
    const priBd    = { urgent: "#5a1a14", important: "#5a3a00", normal: "#1a3a5a" };

    el.innerHTML = d.data.map((n) => `
      <div class="card" style="margin-bottom:12px;border-left:4px solid ${priColor[n.priority] || priColor.normal}">
        <div class="card-head">
          <div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${priLabel[n.priority] || priLabel.normal}</div>
            <div style="font-size:17px;font-weight:700">${n.title}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
            <span style="font-size:12px;color:var(--muted)">${fmtNoticeDate(n.created_at)}</span>
            ${userRole === "director" ? `<button class="h-btn" onclick="deleteNotice(${n.id})" style="color:var(--red);padding:6px 10px"><i class="ti ti-trash"></i></button>` : ""}
          </div>
        </div>
        <div class="card-body">
          <div style="font-size:15px;line-height:1.8;color:var(--text);white-space:pre-line">${n.content}</div>
          ${n.expires_at ? `<div style="margin-top:12px;font-size:12px;color:var(--muted);display:flex;align-items:center;gap:4px"><i class="ti ti-calendar" style="font-size:13px"></i> মেয়াদ: ${fmtNoticeDate(n.expires_at)}</div>` : ""}
          <div style="margin-top:6px;font-size:12px;color:var(--muted)"><i class="ti ti-user" style="font-size:12px"></i> প্রকাশক: ${n.created_by || "—"}</div>
        </div>
      </div>`).join("");
  } catch {
    el.innerHTML = `<div class="empty"><i class="ti ti-wifi-off"></i>লোড হয়নি</div>`;
  }
}

function openNoticeModal() {
  ["nTitle", "nContent"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("nPriority").value = "normal";
  document.getElementById("nExpiry").value = "";
  document.getElementById("mNotice").classList.add("open");
}

async function saveNotice() {
  const title   = document.getElementById("nTitle").value.trim();
  const content = document.getElementById("nContent").value.trim();
  const priority= document.getElementById("nPriority").value;
  const expiry  = document.getElementById("nExpiry").value;

  if (!title || !content) return showToast("শিরোনাম ও বিষয়বস্তু দিন।");

  const btn = document.querySelector("#mNotice .btn-save");
  if (btn) { btn.textContent = "প্রকাশ হচ্ছে..."; btn.disabled = true; }

  try {
    const r = await fetch(`${API}/notices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ title, content, priority, expires_at: expiry || null }),
    });
    const d = await r.json();
    if (d.success) {
      showToast(d.message);
      document.getElementById("mNotice").classList.remove("open");
      await loadNotices();
    } else showToast(d.message || "সমস্যা হয়েছে।");
  } catch { showToast("সংযোগ সমস্যা।"); }
  finally { if (btn) { btn.textContent = "প্রকাশ করুন"; btn.disabled = false; } }
}

async function deleteNotice(id) {
  if (!confirm("এই নোটিশ মুছে ফেলবেন?")) return;
  try {
    const r = await fetch(`${API}/notices/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });
    const d = await r.json();
    if (d.success) { showToast(d.message); await loadNotices(); }
    else showToast(d.message || "সমস্যা।");
  } catch { showToast("সংযোগ সমস্যা।"); }
}

function fmtNoticeDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    const day   = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year  = dt.getFullYear();
    return toBn(`${day}/${month}/${year}`);
  } catch { return d; }
}
