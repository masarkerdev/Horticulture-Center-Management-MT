// ===== AUTO GENERATE FISCAL YEAR DROPDOWN =====
function genFYOptions() {
  // বাংলাদেশ Fiscal Year: জুলাই-জুন
  // বর্তমান মাস জুলাই বা পরে হলে current FY = এই বছর
  const now = new Date();
  const currentFY =
    now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;

  let options = "";
  for (let y = currentFY; y >= currentFY - 4; y--) {
    const bn1 = toBn(y);
    const bn2 = toBn(y + 1);
    options += `<option value="${y}">FY ${bn1}-${bn2}</option>`;
  }

  // সব FY dropdown-এ একসাথে যোগ করুন
  ["fySelect", "targetFY", "tgFY"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = options;
  });
}

// Page load-এ FY dropdown generate করুন
genFYOptions();

const API = "/api";
let TK = sessionStorage.getItem("hc_tk") || "";
let ME = JSON.parse(sessionStorage.getItem("hc_me") || "{}");
let sPage = 1,
  sTotal = 0;
const MN = {
  seed: "বীজ",
  cutting: "কাটিং",
  layering: "লেয়ারিং",
  grafting: "গ্রাফটিং / জোড়কলম",
  budding: "বাডিং",
  tissue_culture: "টিস্যু কালচার",
  purchase: "ক্রয়",
};
const RN = {
  admin: "Admin",
  manager: "Manager",
  production_officer: "Prod.Officer",
  sales_operator: "Sales Operator",
  viewer: "Viewer",
};
const PN = { cash: "নগদ", bkash: "বিকাশ", bank: "ব্যাংক", cheque: "চেক" };
const SN = { paid: "পরিশোধিত", pending: "বকেয়া", partial: "আংশিক" };
const DN = {
  disease: "রোগ",
  drought: "খরা",
  flood: "বন্যা",
  pest: "পোকা",
  cold: "ঠান্ডা",
  other: "অন্যান্য",
};
const HN = { excellent: "চমৎকার", good: "ভালো", weak: "দুর্বল" };

// ===== DATE FORMAT HELPER =====
function fmtDateInput(d) {
  // Convert any date string to YYYY-MM-DD for input[type=date]
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toISOString().split("T")[0];
  } catch (e) {
    return d;
  }
}

// ✅ নতুন — DD/MM/YYYY বাংলা ফরমেট (সব table-এ ব্যবহার হবে)
function fmtDMY(d) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return toBn(`${day}/${month}/${year}`);
  } catch (e) {
    return d;
  }
}

// ===== বাংলা সংখ্যা HELPER =====
function toBn(n) {
  if (n === null || n === undefined) return "০";
  return String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
}
function toBnMoney(n) {
  if (n === null || n === undefined) return "৳০";
  const num = parseFloat(n) || 0;
  const formatted = num.toLocaleString("en-IN");
  return "৳" + toBn(formatted);
}
function toBnNum(n) {
  if (n === null || n === undefined) return "০";
  const formatted = parseInt(n).toLocaleString("en-IN");
  return toBn(formatted);
}

async function api(u, o = {}) {
  const r = await fetch(API + u, {
    ...o,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + TK,
      ...(o.headers || {}),
    },
  });
  return r.json();
}
function toast(m, e = 0) {
  const t = document.getElementById("toast");
  t.textContent = m;
  t.className = "toast" + (e ? " err" : "");
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 3000);
}
function oM(id) {
  document.getElementById(id).classList.add("open");
  if (["mProd", "mSale", "mDmg", "mMoth"].includes(id)) loadDD();
}
function cM(id) {
  document.getElementById(id).classList.remove("open");
}
document.querySelectorAll(".mo").forEach((m) =>
  m.addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("open");
  }),
);

// LOGIN
function login() {
  const e = document.getElementById("le").value;
  const p = document.getElementById("lp2").value;
  const er = document.getElementById("lerr");
  const btn = document.querySelector("#loginStep1 .lbtn");
  er.style.display = "none";
  if (!e || !p) {
    er.textContent = "ইমেইল ও পাসওয়ার্ড দিন।";
    er.style.display = "block";
    return;
  }
  btn.textContent = "যাচাই হচ্ছে...";
  btn.disabled = true;
  const tryLogin = (attempt) => {
    fetch(API + "/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e, password: p }),
    })
      .then((r) => r.json())
      .then((d) => {
        btn.textContent = "লগইন করুন";
        btn.disabled = false;
        if (d.success) {
          document.getElementById("loginStep1").style.display = "none";
          document.getElementById("loginStep2").style.display = "block";
          document.getElementById("otpInput").focus();
          startOtpTimer();
        } else {
          er.textContent = d.message || "ইমেইল বা পাসওয়ার্ড ভুল।";
          er.style.display = "block";
        }
      })
      .catch(() => {
        if (attempt < 3) {
          btn.textContent = `আবার চেষ্টা (${attempt}/3)...`;
          setTimeout(() => tryLogin(attempt + 1), 3000);
        } else {
          btn.textContent = "লগইন করুন";
          btn.disabled = false;
          er.textContent = "সংযোগ সমস্যা।";
          er.style.display = "block";
        }
      });
  };
  tryLogin(1);
}
let otpTimerInterval = null;
function startOtpTimer() {
  let secs = 300;
  clearInterval(otpTimerInterval);
  otpTimerInterval = setInterval(() => {
    secs--;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const el = document.getElementById("otpTimer");
    if (el) el.textContent = `⏱ বাকি সময়: ${m}:${s < 10 ? "0" + s : s}`;
    if (secs <= 0) {
      clearInterval(otpTimerInterval);
      if (el) el.textContent = "⌛ OTP মেয়াদ শেষ। আবার Login করুন।";
    }
  }, 1000);
}
function verifyOtp() {
  const e = document.getElementById("le").value;
  const otp = document.getElementById("otpInput").value.trim();
  const er = document.getElementById("lerr");
  er.style.display = "none";
  if (otp.length !== 6) {
    er.textContent = "৬ সংখ্যার OTP দিন।";
    er.style.display = "block";
    return;
  }
  fetch(API + "/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: e, otp }),
  })
    .then((r) => r.json())
    .then((d) => {
      if (d.success) {
        clearInterval(otpTimerInterval);
        TK = d.token;
        ME = d.user;
        sessionStorage.setItem("hc_tk", TK);
        sessionStorage.setItem("hc_me", JSON.stringify(ME));
        showApp();
      } else {
        er.textContent = d.message || "OTP ভুল।";
        er.style.display = "block";
      }
    })
    .catch(() => {
      er.textContent = "সংযোগ সমস্যা।";
      er.style.display = "block";
    });
}
function backToLogin() {
  clearInterval(otpTimerInterval);
  document.getElementById("loginStep2").style.display = "none";
  document.getElementById("loginStep1").style.display = "block";
  document.getElementById("otpInput").value = "";
  document.getElementById("lerr").style.display = "none";
}
function showApp() {
  document.getElementById("lp").style.display = "none";
  document.getElementById("app").classList.add("active");
  const n = ME.name || "User",
    i = n
      .split(" ")
      .map((x) => x[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  document.getElementById("unn").textContent = n;
  document.getElementById("url").textContent = ME.role || "";
  ["uav", "tav"].forEach((id) => (document.getElementById(id).textContent = i));
  applyRoleSidebar(); // ✅ Role অনুযায়ী sidebar সাজান
  lDash();
  lNotices();
  startAutoRefresh();
  startInactivityWatch();
  if (ME.role === "admin") checkAdminNotif();
}

// ===== Role-based Sidebar =====
function applyRoleSidebar() {
  const role = ME.role || "viewer";

  // সব nav item-এর access নির্ধারণ করুন
  const access = {
    admin: [
      "dash",
      "seed",
      "prod",
      "moth",
      "batch",
      "stk",
      "dmg",
      "sale",
      "cust",
      "income",
      "rep",
      "usr",
      "cfg",
      "bin",
    ],
    manager: [
      "dash",
      "seed",
      "prod",
      "moth",
      "batch",
      "stk",
      "dmg",
      "sale",
      "cust",
      "income",
      "rep",
      "usr",
      "cfg",
    ],
    production_officer: [
      "dash",
      "seed",
      "prod",
      "moth",
      "batch",
      "stk",
      "dmg",
      "rep",
      "cfg",
    ],
    sales_operator: ["dash", "sale", "cust", "income", "stk", "rep", "cfg"],
    viewer: ["dash", "rep", "cfg"],
  };

  const allowed = access[role] || ["dash"];

  // প্রতিটি nav item চেক করুন
  document.querySelectorAll(".ni").forEach((ni) => {
    const fn = ni.getAttribute("onclick") || "";
    const match = fn.match(/go\('(\w+)'/);
    if (match) {
      const pageId = match[1];
      if (allowed.includes(pageId)) {
        ni.style.display = "flex"; // দেখাবে
      } else {
        ni.style.display = "none"; // লুকাবে
      }
    }
  });

  // Section headers লুকান যদি সব item লুকানো থাকে
  document.querySelectorAll(".ss").forEach((sec) => {
    let next = sec.nextElementSibling;
    let hasVisible = false;
    while (next && !next.classList.contains("ss")) {
      if (next.classList.contains("ni") && next.style.display !== "none") {
        hasVisible = true;
        break;
      }
      next = next.nextElementSibling;
    }
    sec.style.display = hasVisible ? "block" : "none";
  });

  // Topbar বাটন লুকান role অনুযায়ী
  const prodBtn = document.querySelector('.tb .btn[onclick*="mProd"]');
  const saleBtn = document.querySelector('.tb .btn[onclick*="mSale"]');
  if (prodBtn) prodBtn.style.display = allowed.includes("prod") ? "" : "none";
  if (saleBtn) saleBtn.style.display = allowed.includes("sale") ? "" : "none";
}

// ===== Admin Notification — পাসওয়ার্ড অনুরোধ চেক (স্বাধীন function) =====
async function checkAdminNotif() {
  if (ME.role !== "admin") return; // শুধু Admin
  try {
    const ur = await api("/users");
    if (!ur.success) return;
    const pending = ur.data.filter(
      (u) => u.password_request_status === "pending",
    );

    // Sidebar badge আপডেট
    const usrNav = document.querySelector('.ni[onclick*="usr"]');
    if (usrNav) {
      let nb = usrNav.querySelector(".nb");
      if (pending.length > 0) {
        if (!nb) {
          nb = document.createElement("span");
          nb.className = "nb";
          usrNav.appendChild(nb);
        }
        nb.textContent = pending.length;
      } else {
        if (nb) nb.remove();
      }
    }

    // Dashboard notification আপডেট
    const notifDiv = document.getElementById("adminNotif");
    if (!notifDiv) return;
    if (pending.length > 0) {
      notifDiv.innerHTML =
        `<div style="margin-bottom:8px;font-size:13px;font-weight:600;color:var(--b600)"><i class="ti ti-bell"></i> পাসওয়ার্ড পরিবর্তনের অনুরোধ</div>` +
        pending
          .map(
            (
              u,
            ) => `<div class="ai" style="background:var(--b50);border-color:#b5d4f4;margin-bottom:6px">
          <i class="ti ti-key" style="color:var(--b600);font-size:18px"></i>
          <div style="flex:1"><strong>${u.name}</strong> (${u.email})<br><span style="font-size:11px;color:var(--tm)">পাসওয়ার্ড পরিবর্তনের অনুরোধ পাঠিয়েছেন</span></div>
          <div style="display:flex;gap:6px">
            <button class="btn btns" style="background:var(--g50);color:var(--g600);border-color:var(--g400)" onclick="approvePwd(${u.id})"><i class="ti ti-check"></i> অনুমোদন</button>
            <button class="btn btns btnr" onclick="rejectPwd(${u.id})" title="প্রত্যাখ্যান"><i class="ti ti-x"></i></button>
          </div>
        </div>`,
          )
          .join("");
      notifDiv.style.display = "block";
    } else {
      notifDiv.style.display = "none";
      notifDiv.innerHTML = "";
    }
  } catch (e) {
    // column না থাকলে বা error হলে চুপ থাকবে
    console.log("Notif check skipped:", e.message);
  }
}

// ===== AUTO LOGOUT — ১০ মিনিট নিষ্ক্রিয় থাকলে লগআউট =====
let inactivityTimer = null;
const INACTIVE_LIMIT = 5 * 60 * 1000; // ৫ মিনিট

function resetInactivityTimer() {
  if (!TK) return;
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (TK) {
      toast("১০ মিনিট নিষ্ক্রিয় — স্বয়ংক্রিয় লগআউট হচ্ছে...");
      setTimeout(() => logout(), 2000);
    }
  }, INACTIVE_LIMIT);
}

function startInactivityWatch() {
  [
    "mousemove",
    "mousedown",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ].forEach((evt) => {
    document.addEventListener(evt, resetInactivityTimer, true);
  });
  resetInactivityTimer();
}

function stopInactivityWatch() {
  clearTimeout(inactivityTimer);
  [
    "mousemove",
    "mousedown",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ].forEach((evt) => {
    document.removeEventListener(evt, resetInactivityTimer, true);
  });
}

// ===== AUTO REFRESH — প্রতি ৩০ সেকেন্ডে Dashboard আপডেট =====
let autoRefreshTimer = null;
function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(() => {
    // শুধু Dashboard active থাকলে refresh করবে
    if (document.getElementById("pg-dash")?.classList.contains("active")) {
      lDash();
    }
  }, 15000); // ১৫ সেকেন্ড
}
function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}
// Logout করলে timer বন্ধ করুন
function logout() {
  stopAutoRefresh();
  stopInactivityWatch();
  TK = "";
  ME = {};
  sessionStorage.removeItem("hc_tk");
  sessionStorage.removeItem("hc_me");
  location.reload();
}

// ✅ Page refresh করলে auto-login
if (TK) showApp();
document.getElementById("lp2").addEventListener("keypress", (e) => {
  if (e.key === "Enter") login();
});

// NAV
const tls = {
  dash: "ড্যাশবোর্ড",
  seed: "চারা তালিকা",
  prod: "উৎপাদন রেজিস্টার",
  moth: "মাদার প্ল্যান্ট",
  batch: "ব্যাচ ম্যানেজমেন্ট",
  stk: "স্টক রেজিস্টার",
  dmg: "ক্ষতি / নষ্ট",
  sale: "বিক্রয় ও চালান",
  cust: "গ্রাহক তালিকা",
  income: "অন্যান্য আয়",
  rep: "রিপোর্ট ও বিশ্লেষণ",
  usr: "ব্যবহারকারী",
  cfg: "সেটিংস",
  bin: "🗑️ Recycle Bin",
};
const lrs = {
  dash: lDash,
  seed: lSeed,
  prod: lProd,
  moth: lMoth,
  batch: lBatch,
  stk: lStk,
  dmg: lDmg,
  sale: lSale,
  cust: lCust,
  income: lIncome,
  usr: lUsr,
  rep: () => {
    lBestSelling();
    lTargetAchievement();
  },
  cfg: lCfg,
  bin: () => lRecycleBin(),
};
function go(id, el) {
  document.querySelectorAll(".pg").forEach((p) => p.classList.remove("active"));
  document.getElementById("pg-" + id).classList.add("active");
  document.querySelectorAll(".ni").forEach((n) => n.classList.remove("active"));
  if (el) el.classList.add("active");
  document.getElementById("pt").textContent = tls[id] || id;
  cSB();
  lrs[id]?.();
}
function tSB() {
  document.getElementById("sb").classList.toggle("open");
  document.getElementById("sov").classList.toggle("open");
}
function cSB() {
  document.getElementById("sb").classList.remove("open");
  document.getElementById("sov").classList.remove("open");
}
function swTab(btn, sh, hd) {
  btn
    .closest(".tabs")
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(sh).style.display = "block";
  document.getElementById(hd).style.display = "none";
}
function swTab3(btn, sh, hds) {
  btn
    .closest(".tabs")
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(sh).style.display = "block";
  hds.forEach((h) => (document.getElementById(h).style.display = "none"));
}

// ===== DASHBOARD =====
async function lDash() {
  try {
    const d = (await api("/dashboard/stats")).data;
    document.getElementById("dSt").innerHTML = `
<div class="sc"><div class="si" style="background:var(--g50)"><i class="ti ti-plant" style="color:var(--g600);font-size:18px"></i></div><div class="sl">চারার ধরন</div><div class="sv">${toBnNum(d.seedling_types)}</div><div class="ss2">প্রকার নিবন্ধিত</div></div>
<div class="sc"><div class="si" style="background:var(--t50)"><i class="ti ti-stack-2" style="color:var(--t600);font-size:18px"></i></div><div class="sl">মোট স্টক</div><div class="sv">${toBnNum(d.total_stock)}</div><div class="ss2">টি চারা/কলম</div></div>
<div class="sc"><div class="si" style="background:var(--a50)"><i class="ti ti-sun" style="color:var(--a400);font-size:18px"></i></div><div class="sl">মোট উৎপাদন</div><div class="sv">${toBnNum(d.today_production)}</div><div class="ss2">টি চারা/কলম</div></div>
<div class="sc"><div class="si" style="background:var(--c50)"><i class="ti ti-receipt" style="color:var(--c400);font-size:18px"></i></div><div class="sl">আজকের বিক্রয়</div><div class="sv">${toBnMoney(d.today_revenue)}</div><div class="ss2">${toBnNum(d.today_invoices)}টি চালান</div></div>
<div class="sc"><div class="si" style="background:var(--b50)"><i class="ti ti-coin" style="color:var(--b600);font-size:18px"></i></div><div class="sl">মোট রাজস্ব</div><div class="sv">${toBnMoney(d.monthly_revenue)}</div><div class="ss2">সর্বমোট বিক্রি</div></div>`;

    // Bar chart — আলাদাভাবে call করুন
    lFiscalAchievement(); // ✅ auto-refresh এও চলবে, কিন্তু "লোড হচ্ছে" দেখাবে না
    const bnMonths = {
      Jan: "জান",
      Feb: "ফেব",
      Mar: "মার্চ",
      Apr: "এপ্রি",
      May: "মে",
      Jun: "জুন",
      Jul: "জুলা",
      Aug: "আগস্ট",
      Sep: "সেপ্টে",
      Oct: "অক্টো",
      Nov: "নভে",
      Dec: "ডিসে",
    };
    let pd = [];
    try {
      const monthlyRes = await api("/reports/monthly-production");
      if (monthlyRes.success && monthlyRes.data.length > 0) {
        pd = monthlyRes.data.map((r) => ({
          m: bnMonths[r.month_name] || r.month_name,
          s: +r.seed_qty || 0,
          a: +r.asexual_qty || 0,
        }));
      }
    } catch (me) {}
    if (!pd.length) pd = [{ m: "এই মাস", s: d.today_production || 0, a: 0 }];
    const mx = Math.max(...pd.map((x) => x.s + x.a), 1);
    document.getElementById("dChart").innerHTML = pd
      .map((x) => {
        const sh = Math.round((x.s / mx) * 88),
          ah = Math.round((x.a / mx) * 88);
        return `<div class="bcl"><div style="display:flex;gap:2px;align-items:flex-end;width:100%;height:88px">
  <div class="bar" style="height:${Math.max(sh, 2)}px;background:var(--g400);flex:1" title="বীজ: ${toBnNum(x.s)}"></div>
  <div class="bar" style="height:${Math.max(ah, 2)}px;background:var(--t400);flex:1" title="অঙ্গজ: ${toBnNum(x.a)}"></div>
  </div><div class="brlbl">${x.m}</div></div>`;
      })
      .join("");

    const catColors = [
      "var(--g400)",
      "var(--t400)",
      "var(--a200)",
      "var(--c400)",
      "var(--b400)",
    ];
    const svgEl = document.getElementById("catSvg");
    const dlEl = document.getElementById("catLegend");
    try {
      const catRes = await api("/reports/sales-by-category");
      if (catRes && catRes.success && catRes.data) {
        const hasSales = catRes.data.some((c) => parseFloat(c.total_sales) > 0);
        if (hasSales) {
          const active = catRes.data.filter(
            (c) => parseFloat(c.total_sales) > 0,
          );
          let offset = 25,
            svgCircles = "";
          active.forEach((c, i) => {
            const pct = parseFloat(c.percent) || 0;
            svgCircles += `<circle cx="18" cy="18" r="15.9" fill="none" stroke="${catColors[i % catColors.length]}" stroke-width="3.8" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-offset + 25}"/>`;
            offset += pct;
          });
          if (svgEl)
            svgEl.innerHTML =
              svgCircles +
              `<text x="18" y="21" text-anchor="middle" font-size="5" fill="var(--tp)" font-family="Noto Sans Bengali" font-weight="600">বিক্রয়</text>`;
          if (dlEl)
            dlEl.innerHTML = active
              .map(
                (c, i) =>
                  `<div class="dli"><div class="dld" style="background:${catColors[i % catColors.length]}"></div>${c.category} — ${toBn(c.percent)}%</div>`,
              )
              .join("");
        }
        // বিক্রয় না থাকলে "বিক্রয় ডেটা নেই" দেখাবে
      }
    } catch (ce) {
      /* error হলে "বিক্রয় ডেটা নেই" থাকবে */
    }
    // Success rates
    let rH = "";
    if (d.success_rates?.length)
      d.success_rates.forEach((r) => {
        const c = {
          seed: "--g400",
          grafting: "--t400",
          cutting: "--a200",
          budding: "--b400",
        };
        rH += `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${MN[r.production_type] || r.production_type}</span><strong>${r.avg_success_percent}%</strong></div><div class="pb"><div class="pf" style="width:${r.avg_success_percent}%;background:var(${c[r.production_type] || "--g400"})"></div></div></div>`;
      });
    else
      rH =
        '<div style="font-size:12px;color:var(--tm);padding:10px">এখনো ডেটা নেই</div>';
    document.getElementById("dRate").innerHTML = rH;
    // Low stock
    document.getElementById("dLowC").innerHTML =
      `<span style="color:var(--c400)">${d.low_stock_count}টি</span>`;
    if (d.low_stock_count > 0) {
      const ls = await api("/seedlings/low-stock");
      document.getElementById("dLow").innerHTML =
        ls.data
          ?.map(
            (s) =>
              `<div class="ai"><i class="ti ti-alert-triangle"></i><div><strong>${s.name_bn}</strong> — মাত্র ${s.current_stock}টি বাকি</div></div>`,
          )
          .join("") || "";
    } else
      document.getElementById("dLow").innerHTML =
        '<div style="color:var(--g600);font-size:12px;padding:10px">সব স্টক ঠিক আছে ✅</div>';
    // Recent activities
    const [sa, pr] = await Promise.all([
      api("/sales?limit=3"),
      api("/production?limit=3"),
    ]);
    let acts = [];
    if (sa.data)
      sa.data.forEach((x) =>
        acts.push({
          time: fmtDMY(x.sale_date),
          txt: `চালান ${x.invoice_no} — ${x.customer_name || "-"} — ৳${parseFloat(x.total_amount).toLocaleString()}`,
          mod: "বিক্রয়",
          st: "paid",
          user: x.created_by_name || "—",
        }),
      );
    if (pr.data)
      pr.data.forEach((x) =>
        acts.push({
          time: fmtDMY(x.created_at),
          txt: `ব্যাচ ${x.batch_code} — ${x.seedling_bn || "-"} (${x.produced_quantity}টি)`,
          mod: "উৎপাদন",
          st: "done",
          user: x.created_by_name || ME.name || "—",
        }),
      );
    acts = acts.slice(0, 5);
    document.getElementById("dAct").innerHTML = acts.length
      ? acts
          .map(
            (a) =>
              `<tr><td style="color:var(--tm)">${a.time}</td><td>${a.txt}</td><td><span class="tag">${a.mod}</span></td><td style="font-size:12px;color:var(--tp)"><i class="ti ti-user" style="font-size:11px"></i> ${a.user}</td><td><span class="b ${a.st === "paid" ? "bg" : "bt"}">${a.st === "paid" ? "পরিশোধিত" : "সম্পন্ন"}</span></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="lt">ডেটা নেই</td></tr>';
  } catch (e) {
    document.getElementById("dSt").innerHTML =
      '<div class="lt" style="color:var(--a400)">⏳ সংযোগ হচ্ছে, একটু অপেক্ষা করুন...</div>';
    setTimeout(() => lDash(), 3000);
  }
}

// ===== SEEDLINGS =====
async function lSeed() {
  try {
    const s = document.getElementById("sSearch")?.value || "",
      c = document.getElementById("sCatF")?.value || "";
    const d = await api(
      `/seedlings?search=${encodeURIComponent(s)}&page=${sPage}&limit=10${c ? "&category_id=" + c : ""}`,
    );
    if (!d.success) return;
    sTotal = d.pagination?.total || 0;
    document.getElementById("sTbl").innerHTML = d.data.length
      ? d.data
          .map(
            (x) => `<tr>
<td style="color:var(--tm)">${x.seedling_code}</td>
<td><strong>${x.name_bn}</strong>${x.variety ? `<br><span style="font-size:11px;color:var(--tm)">${x.variety}</span>` : ""}</td>
<td><span class="b bg">${x.category_bn || "-"}</span></td>
<td>৳${x.unit_price}</td>
<td><strong style="${x.current_stock <= x.min_stock_alert ? "color:var(--c400)" : ""}">${x.current_stock}</strong></td>
<td>${x.current_stock <= x.min_stock_alert ? '<span class="b br">কম স্টক</span>' : '<span class="b bg">সক্রিয়</span>'}</td>
<td><div style="display:flex;gap:4px"><button class="btn btns btne" onclick="editSeed(${JSON.stringify(x).replace(/"/g, "&quot;")})"><i class="ti ti-edit"></i></button><button class="btn btns btnr" onclick="delItem('seedlings',${x.id},'${x.name_bn}')"><i class="ti ti-trash"></i></button></div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="lt">কোনো চারা নেই</td></tr>';
    const tp = Math.ceil(sTotal / 10);
    document.getElementById("sPg").textContent =
      `${sTotal}টির মধ্যে ${(sPage - 1) * 10 + 1}–${Math.min(sPage * 10, sTotal)} দেখানো হচ্ছে`;
    let pb = "";
    if (sPage > 1)
      pb += `<button class="btn btns" onclick="sPage--;lSeed()"><i class="ti ti-chevron-left"></i></button>`;
    for (let i = 1; i <= tp; i++)
      pb += `<button class="btn btns${i === sPage ? " btnp" : ""}" onclick="sPage=${i};lSeed()">${i}</button>`;
    if (sPage < tp)
      pb += `<button class="btn btns" onclick="sPage++;lSeed()"><i class="ti ti-chevron-right"></i></button>`;
    document.getElementById("sPgBtns").innerHTML = pb;
  } catch (e) {}
}

function editSeed(s) {
  document.getElementById("mSeedT").textContent = "চারা সম্পাদনা";
  document.getElementById("sId").value = s.id;
  document.getElementById("sNB").value = s.name_bn || "";
  document.getElementById("sNE").value = s.name_en || "";
  document.getElementById("sV").value = s.variety || "";
  document.getElementById("sCat").value = s.category_id || 1;
  document.getElementById("sP").value = s.unit_price || 0;
  document.getElementById("sC").value = s.production_cost || 0;
  document.getElementById("sD").value = s.description || "";
  oM("mSeed");
}

async function saveSeed() {
  const id = document.getElementById("sId").value;
  const b = {
    name_bn: document.getElementById("sNB").value,
    name_en: document.getElementById("sNE").value,
    variety: document.getElementById("sV").value,
    category_id: +document.getElementById("sCat").value,
    production_type: "seed",
    unit_price: +document.getElementById("sP").value || 0,
    production_cost: +document.getElementById("sC").value || 0,
    description: document.getElementById("sD").value,
    is_active: true, // ⚠️ গুরুত্বপূর্ণ: এটা না দিলে চারা মুছে যায়
  };
  if (!b.name_bn || !b.unit_price) return toast("নাম ও মূল্য দিন", 1);
  try {
    let d;
    if (id) {
      // UPDATE করুন
      d = await api("/seedlings/" + id, {
        method: "PUT",
        body: JSON.stringify(b),
      });
    } else {
      // নতুন তৈরি করুন
      d = await api("/seedlings", { method: "POST", body: JSON.stringify(b) });
    }
    if (d.success) {
      toast(id ? "চারা আপডেট হয়েছে ✅" : "চারা যোগ হয়েছে ✅");
      cM("mSeed");
      document.getElementById("sId").value = "";
      document.getElementById("mSeedT").textContent = "নতুন চারা";
      // ফর্ম পরিষ্কার করুন
      ["sNB", "sNE", "sV", "sD"].forEach(
        (x) => (document.getElementById(x).value = ""),
      );
      document.getElementById("sP").value = "";
      document.getElementById("sC").value = "";
      lSeed();
    } else {
      toast(d.message || "সমস্যা হয়েছে", 1);
    }
  } catch (e) {
    toast("সার্ভার সমস্যা", 1);
  }
}

// নতুন চারা Modal খুলুন — category cache check করুন
async function openSeedModal() {
  // Category আগে থেকে loaded থাকলে সাথে সাথে দেখান
  if (catOptionsHTML) {
    const sCat = document.getElementById("sCat");
    if (sCat) sCat.innerHTML = catOptionsHTML;
  } else {
    // না থাকলে এখন load করুন
    await loadCategories();
  }
  // Form reset
  document.getElementById("sId").value = "";
  document.getElementById("mSeedT").textContent = "নতুন চারা";
  ["sNB", "sNE", "sV", "sD"].forEach(
    (x) => (document.getElementById(x).value = ""),
  );
  document.getElementById("sP").value = "";
  document.getElementById("sC").value = "";
  oM("mSeed");
}

// ===== PRODUCTION =====
async function lProd() {
  try {
    const d = await api("/production");
    if (!d.success) return;
    const all = d.data || [];
    const ac = all.filter((x) => x.status === "active").length,
      so = all.filter((x) => x.status === "sold_out").length;
    const av =
      all.reduce((s, x) => {
        const r = +(x.success_percent || x.germination_percent || 0);
        return s + r;
      }, 0) / (all.length || 1);
    ["pTot", "pAct", "pSold"].forEach(
      (id, i) =>
        (document.getElementById(id).textContent = [all.length, ac, so][i]),
    );
    document.getElementById("pAvg").textContent = av.toFixed(1) + "%";
    const sd = all.filter((x) => x.production_type === "seed");
    const ad = all.filter(
      (x) => x.production_type !== "seed" && x.production_type !== "purchase",
    );
    const pd = all.filter((x) => x.production_type === "purchase");
    document.getElementById("pSTbl").innerHTML = sd.length
      ? sd
          .map(
            (b) => `<tr>
<td><strong style="color:var(--g600)">${b.batch_code}</strong></td>
<td><strong>${b.seedling_bn || "-"}</strong>${b.seedling_variety ? "<br><span style='font-size:11px;color:var(--tm)'>" + b.seedling_variety + "</span>" : ""}</td>
<td>${b.seed_quantity || "-"}</td>
<td>${fmtDMY(b.sowing_date)}</td>
<td>${b.produced_quantity}</td>
<td>${Math.max(0, (b.seed_quantity || 0) - (b.produced_quantity || 0))}</td>
<td><span class="b ${(+b.germination_percent || 0) >= 75 ? "bg" : "ba"}">${b.germination_percent || "-"}%</span></td>
<td><span class="b bg">${b.status}</span></td>
<td><div style="display:flex;gap:4px">
<button class="btn btns btne" onclick="editBatch(${JSON.stringify(b).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('production-batches',${b.id},'ব্যাচ ${b.batch_code}')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="9" class="lt">বীজ উৎপাদন নেই</td></tr>';
    document.getElementById("pATbl").innerHTML = ad.length
      ? ad
          .map(
            (b) => `<tr>
<td><strong style="color:var(--g600)">${b.batch_code}</strong></td>
<td><strong>${b.seedling_bn || "-"}</strong>${b.seedling_variety ? "<br><span style='font-size:11px;color:var(--tm)'>" + b.seedling_variety + "</span>" : ""}</td>
<td><span class="b bt">${MN[b.production_type] || b.production_type}</span></td>
<td>${b.mother_variety || "-"}</td>
<td>${fmtDMY(b.propagation_date || b.created_at)}</td>
<td>${b.success_quantity}</td>
<td>${b.failed_quantity}</td>
<td><span class="b ${(+b.success_percent || 0) >= 75 ? "bg" : "ba"}">${b.success_percent || "-"}%</span></td>
<td><span class="b bg">${b.status}</span></td>
<td><div style="display:flex;gap:4px">
<button class="btn btns btne" onclick="editBatch(${JSON.stringify(b).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('production-batches',${b.id},'ব্যাচ ${b.batch_code}')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="10" class="lt">অঙ্গজ উৎপাদন নেই</td></tr>';
    // ক্রয় ট্যাব
    const pPTbl = document.getElementById("pPTbl");
    if (pPTbl)
      pPTbl.innerHTML = pd.length
        ? pd
            .map((b) => {
              const src = (b.remarks || "")
                .replace(/ক্রয় উৎস: /, "")
                .split(" | ")[0];
              return `<tr>
<td><strong style="color:var(--g600)">${b.batch_code}</strong></td>
<td><strong>${b.seedling_bn || "-"}</strong>${b.seedling_variety ? "<br><span style='font-size:11px;color:var(--tm)'>" + b.seedling_variety + "</span>" : ""}</td>
<td>${src || "-"}</td>
<td>${fmtDMY(b.propagation_date || b.created_at)}</td>
<td><strong>${b.produced_quantity}</strong></td>
<td>${b.failed_quantity || 0}</td>
<td><span class="b bg">${b.status}</span></td>
<td><div style="display:flex;gap:4px">
<button class="btn btns btne" onclick="editBatch(${JSON.stringify(b).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('production-batches',${b.id},'ব্যাচ ${b.batch_code}')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`;
            })
            .join("")
        : '<tr><td colspan="8" class="lt">ক্রয়ের রেকর্ড নেই</td></tr>';
  } catch (e) {}
}

function togP() {
  const m = document.getElementById("pMt").value;
  document.getElementById("pSF").style.display =
    m === "seed" ? "block" : "none";
  document.getElementById("pAF").style.display =
    m !== "seed" && m !== "purchase" ? "block" : "none";
  document.getElementById("pPF").style.display =
    m === "purchase" ? "block" : "none";
}

async function saveProd() {
  const editId = document.getElementById("mProd").dataset.editId || "";
  const m = document.getElementById("pMt").value;
  try {
    if (editId) {
      // ===== UPDATE — নতুন তৈরি হবে না, পুরনোটা আপডেট হবে =====
      const upd = {
        produced_quantity:
          +document.getElementById(m === "seed" ? "pPQ" : "pAQ").value || 0,
        remarks: document.getElementById("pRm").value,
      };
      if (m === "seed") {
        upd.seed_source = document.getElementById("pSrc").value;
        upd.seed_quantity = +document.getElementById("pSQ").value || 0;
        upd.sowing_date = document.getElementById("pSw").value;
      } else {
        upd.success_quantity = +document.getElementById("pSu").value || 0;
        upd.failed_quantity =
          (+document.getElementById("pAQ").value || 0) -
          (+document.getElementById("pSu").value || 0);
        const sq = upd.success_quantity,
          pq = +document.getElementById("pAQ").value || 0;
        upd.success_percent = pq > 0 ? ((sq / pq) * 100).toFixed(2) : 0;
        upd.propagation_date = document.getElementById("pPD").value;
      }
      const d = await api("/production/" + editId + "/update", {
        method: "POST",
        body: JSON.stringify(upd),
      });
      if (d && !d.error) {
        toast("ব্যাচ আপডেট হয়েছে ✅");
      } else {
        toast("আপডেট হয়েছে ✅");
      }
      cM("mProd");
      clearProdModal();
      lProd();
      lBatch();
    } else {
      if (m === "purchase") {
        const b = {
          seedling_id: +document.getElementById("pSd").value,
          production_type: "purchase",
          propagation_date: document.getElementById("pPDt").value,
          produced_quantity: +document.getElementById("pPQty").value || 0,
          success_quantity: +document.getElementById("pPQty").value || 0,
          failed_quantity: 0,
          remarks: `ক্রয় উৎস: ${document.getElementById("pPSrc").value || "-"} | একক মূল্য: ৳${document.getElementById("pPPrice").value || 0}`,
        };
        if (!b.propagation_date || !b.produced_quantity)
          return toast("তারিখ ও পরিমাণ দিন", 1);
        if (!document.getElementById("pPSrc").value)
          return toast("বিক্রেতার নাম দিন", 1);
        const d = await api("/production/asexual", {
          method: "POST",
          body: JSON.stringify(b),
        });
        if (d.success) {
          toast("ক্রয় রেকর্ড সংরক্ষিত ✅");
          cM("mProd");
          clearProdModal();
          await lProd();
          await lBatch();
        } else toast(d.error || d.message || "সমস্যা", 1);
      } else if (m === "seed") {
        const b = {
          seedling_id: +document.getElementById("pSd").value,
          seed_source: document.getElementById("pSrc").value,
          seed_quantity: +document.getElementById("pSQ").value || 0,
          sowing_date: document.getElementById("pSw").value,
          produced_quantity: +document.getElementById("pPQ").value || 0,
          failed_quantity: Math.max(
            0,
            (+document.getElementById("pSQ").value || 0) -
              (+document.getElementById("pPQ").value || 0),
          ),
          remarks: document.getElementById("pRm").value,
        };
        if (!b.sowing_date || !b.produced_quantity)
          return toast("তারিখ ও পরিমাণ দিন", 1);
        const d = await api("/production/seed", {
          method: "POST",
          body: JSON.stringify(b),
        });
        if (d.success) {
          toast("বীজ ব্যাচ তৈরি ✅");
          cM("mProd");
          clearProdModal();
          await lProd();
          await lBatch();
        } else toast(d.error || d.message || "সমস্যা", 1);
      } else {
        const b = {
          seedling_id: +document.getElementById("pSd").value,
          production_type: m,
          mother_plant_id: +document.getElementById("pMP").value || null,
          propagation_date: document.getElementById("pPD").value,
          produced_quantity: +document.getElementById("pAQ").value || 0,
          success_quantity: +document.getElementById("pSu").value || 0,
          failed_quantity:
            (+document.getElementById("pAQ").value || 0) -
            (+document.getElementById("pSu").value || 0),
          remarks: document.getElementById("pRm").value,
        };
        if (!b.propagation_date || !b.produced_quantity)
          return toast("তারিখ ও পরিমাণ দিন", 1);
        const d = await api("/production/asexual", {
          method: "POST",
          body: JSON.stringify(b),
        });
        if (d.success) {
          toast("অঙ্গজ ব্যাচ তৈরি ✅");
          cM("mProd");
          clearProdModal();
          await lProd();
          await lBatch();
        } else toast(d.error || d.message || "সমস্যা", 1);
      }
    }
  } catch (e) {
    toast("সার্ভার সমস্যা", 1);
  }
}

function clearProdModal() {
  delete document.getElementById("mProd").dataset.editId;
  document.querySelector("#mProd .mh h3").textContent = "নতুন উৎপাদন ব্যাচ";
  ["pSrc", "pRm"].forEach((id) => (document.getElementById(id).value = ""));
  ["pSQ", "pPQ", "pAQ", "pSu"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("pSw").value = "";
  if (document.getElementById("pPD")) document.getElementById("pPD").value = "";
}

// ===== MOTHER =====
async function lMoth() {
  try {
    const d = await api("/mother-plants");
    document.getElementById("mTbl").innerHTML = d.data?.length
      ? d.data
          .map(
            (m) =>
              `<tr><td><strong>${m.mp_code}</strong></td><td>${m.variety}</td><td>${m.age_years || "-"} বছর</td><td>${m.location || "-"}</td><td><span class="b ${m.health_status === "excellent" ? "bg" : m.health_status === "good" ? "ba" : "br"}">${HN[m.health_status] || m.health_status}</span></td><td><span class="b bg">সক্রিয়</span></td><td><button class="btn btns btnr" onclick="delItem('mother-plants',${m.id},'${m.mp_code} ${m.variety}')"><i class="ti ti-trash"></i></button></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="lt">মাদার প্ল্যান্ট নেই</td></tr>';
  } catch (e) {}
}

async function saveMoth() {
  const b = {
    variety: document.getElementById("mV").value,
    seedling_id: +document.getElementById("mSd").value || null,
    age_years: +document.getElementById("mAg").value || null,
    location: document.getElementById("mLo").value,
    health_status: document.getElementById("mH").value,
    notes: document.getElementById("mNt").value,
  };
  if (!b.variety || !b.location) return toast("জাত ও অবস্থান দিন", 1);
  try {
    const d = await api("/mother-plants", {
      method: "POST",
      body: JSON.stringify(b),
    });
    if (d.success) {
      toast("মাদার প্ল্যান্ট যোগ ✅");
      cM("mMoth");
      lMoth();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== STOCK =====
let stkAllData = [];
async function lStk() {
  try {
    const d = await api("/stock");
    stkAllData = d.data || [];

    // Category dropdown — catOptionsHTML থেকে নিন
    const catSel = document.getElementById("stkCat");
    if (catSel && catSel.options.length <= 1 && catOptionsHTML) {
      catSel.innerHTML =
        '<option value="">সব ক্যাটাগরি</option>' + catOptionsHTML;
    }

    renderStkTable(stkAllData);
  } catch (e) {}
}

function filterStk() {
  const search = (
    document.getElementById("stkSearch")?.value || ""
  ).toLowerCase();
  const catId = document.getElementById("stkCat")?.value || "";

  const filtered = stkAllData.filter((s) => {
    const matchSearch =
      !search ||
      (s.name_bn || "").toLowerCase().includes(search) ||
      (s.variety || "").toLowerCase().includes(search) ||
      (s.seedling_code || "").toLowerCase().includes(search);
    const matchCat = !catId || String(s.category_id) === String(catId);
    return matchSearch && matchCat;
  });
  renderStkTable(filtered);
}

function renderStkTable(data) {
  document.getElementById("sTblB").innerHTML = data.length
    ? data
        .map((s) => {
          const totalIn = (s.opening_balance || 0) + (s.total_produced || 0);
          return `<tr>
        <td><strong>${s.name_bn}</strong>${s.variety ? `<br><span style="font-size:12px;color:var(--tm)">${s.variety}</span>` : ""}</td>
        <td style="color:var(--b600);font-weight:600">${s.opening_balance > 0 ? toBnNum(s.opening_balance) : '<span style="color:var(--tm)">—</span>'}</td>
        <td style="color:var(--g600)">+${toBnNum(s.total_produced || 0)}</td>
        <td style="color:var(--g600);font-weight:600">+${toBnNum(totalIn)}</td>
        <td style="color:var(--c400)">-${toBnNum(s.total_sale || 0)}</td>
        <td style="color:var(--a400)">-${toBnNum(s.total_damage || 0)}</td>
        <td><strong style="${s.is_low_stock ? "color:var(--c400)" : "color:var(--g600)"}">${toBnNum(s.current_stock)}</strong></td>
        <td>${toBnMoney(s.current_stock * s.unit_price)}</td>
        <td>${s.is_low_stock ? '<span class="b br">সংকটজনক</span>' : '<span class="b bg">ভালো</span>'}</td>
      </tr>`;
        })
        .join("")
    : '<tr><td colspan="9" class="lt">কোনো ফলাফল নেই</td></tr>';
}

// ===== DAMAGE =====
async function lDmg() {
  try {
    const [d, pd] = await Promise.all([
      api("/damages"),
      api("/production?limit=9999"),
    ]);

    // Summary calculate করুন
    const totalDmg =
      d.data?.reduce((sum, x) => sum + (parseInt(x.quantity) || 0), 0) || 0;
    const totalProd =
      pd.data?.reduce(
        (sum, x) => sum + (parseInt(x.produced_quantity) || 0),
        0,
      ) || 0;
    const rate = totalProd > 0 ? ((totalDmg / totalProd) * 100).toFixed(1) : 0;

    // Cards আপডেট করুন
    const dmgEl = document.getElementById("dmgTotal");
    const prodEl = document.getElementById("dmgProd");
    const rateEl = document.getElementById("dmgRate");
    if (dmgEl) dmgEl.textContent = toBnNum(totalDmg);
    if (prodEl) prodEl.textContent = toBnNum(totalProd);
    if (rateEl) {
      rateEl.textContent = toBn(rate) + "%";
      rateEl.style.color =
        rate > 20 ? "var(--r400)" : rate > 10 ? "var(--a400)" : "var(--g600)";
    }

    // Table render করুন
    document.getElementById("dTbl").innerHTML = d.data?.length
      ? d.data
          .map(
            (x) => `<tr>
<td>${fmtDMY(x.damage_date)}</td>
<td>${x.name_bn || "-"}</td>
<td>${x.batch_code || "-"}</td>
<td><strong>${toBnNum(x.quantity)}</strong></td>
<td><span class="b br">${DN[x.reason] || x.reason}</span></td>
<td>${x.remarks || "-"}</td>
<td>${x.reporter || "-"}</td>
<td><div style="display:flex;gap:4px">
<button class="btn btns btne" onclick='editDmg(${JSON.stringify(x).replace(/'/g, "&#39;")})' title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('damages',${x.id},'ক্ষতি ${x.name_bn || ""}')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td>
</tr>`,
          )
          .join("")
      : '<tr><td colspan="8" class="lt">নেই</td></tr>';
  } catch (e) {}
}

function editDmg(x) {
  document.getElementById("mDmgT").textContent = "ক্ষতি রিপোর্ট সম্পাদনা";
  document.getElementById("dDmgId").value = x.id;
  document.getElementById("dSd").value = x.seedling_id || "";
  document.getElementById("dBt").value = x.batch_id || "";
  document.getElementById("dDt").value = fmtDateInput(x.damage_date);
  document.getElementById("dQt").value = x.quantity || "";
  document.getElementById("dRs").value = x.reason || "other";
  document.getElementById("dRm").value = x.remarks || "";
  oM("mDmg");
}

async function saveDmg() {
  const editId = document.getElementById("dDmgId")?.value;
  const b = {
    seedling_id: +document.getElementById("dSd").value,
    batch_id: +document.getElementById("dBt").value || null,
    damage_date: document.getElementById("dDt").value,
    quantity: +document.getElementById("dQt").value || 0,
    reason: document.getElementById("dRs").value,
    remarks: document.getElementById("dRm").value,
  };
  if (!b.quantity || !b.damage_date) return toast("তারিখ ও পরিমাণ দিন", 1);
  try {
    const url = editId ? "/damages/" + editId : "/damages";
    const method = editId ? "PUT" : "POST";
    const d = await api(url, { method, body: JSON.stringify(b) });
    if (d.success) {
      toast(editId ? "আপডেট হয়েছে ✅" : "রিপোর্ট জমা ✅");
      cM("mDmg");
      lDmg();
    } else toast(d.error || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== SALES =====
async function lSale() {
  try {
    const dt = document.getElementById("salDate")?.value || "";
    const [sl, td, mo] = await Promise.all([
      api("/sales" + (dt ? "?from_date=" + dt + "&to_date=" + dt : "")),
      api("/sales/today"),
      api("/sales/monthly"),
    ]);
    if (td.success) {
      document.getElementById("s1").textContent = toBnMoney(
        td.data.total_revenue,
      );
      document.getElementById("s3").textContent = toBnNum(
        td.data.total_invoices,
      );
      document.getElementById("s4").textContent = toBnMoney(
        td.data.pending_amount || 0,
      );
    }
    if (mo.success)
      document.getElementById("s2").textContent = toBnMoney(
        mo.data[0]?.revenue || 0,
      );
    if (td.success)
      document.getElementById("salSum").innerHTML =
        `আজ: <strong>${toBnNum(td.data.total_invoices)}</strong>টি চালান | আয়: <strong>${toBnMoney(td.data.total_revenue)}</strong>`;
    document.getElementById("salB").innerHTML = sl.data?.length
      ? sl.data
          .map(
            (x) => `<tr>
<td><strong>${x.invoice_no}</strong></td>
<td>${x.customer_name || "-"}<br><span style="font-size:11px;color:var(--tm)">${x.customer_phone || ""}</span></td>
<td>${fmtDMY(x.sale_date)}</td>
<td><strong>${toBnMoney(x.total_amount)}</strong></td>
<td><span class="b bg">${PN[x.payment_method] || x.payment_method}</span></td>
<td><span class="b ${x.payment_status === "paid" ? "bg" : "ba"}">${SN[x.payment_status] || x.payment_status}</span></td>
<td><div style="display:flex;gap:4px">
<button class="btn btns" onclick="viewInv(${x.id})" title="দেখুন"><i class="ti ti-eye"></i></button>
<button class="btn btns" onclick="printSale(${x.id})" title="প্রিন্ট"><i class="ti ti-printer"></i></button>
<button class="btn btns btne" onclick="editSale(${JSON.stringify(x).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('sales',${x.id},'চালান ${x.invoice_no}')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="lt">কোনো বিক্রয় নেই</td></tr>';
  } catch (e) {}
}

let currentInvData = null;
async function viewInv(id) {
  try {
    const d = await api("/sales/" + id);
    if (!d.success) return;
    const s = d.data;
    currentInvData = s;
    const its = s.items || [];
    const cfg = JSON.parse(localStorage.getItem("hc_cfg") || "{}");
    const orgName = cfg.name_bn || "উদ্যানতত্ত্ববিদের কার্যালয়";
    const orgSub = cfg.name_en || "Horticulture Office";
    const orgAddr = cfg.address || "আসামবস্তি, রাঙামাটি";
    document.getElementById("invBody").innerHTML = `
    <div id="invoicePrint" style="font-family:'Noto Sans Bengali',Arial,sans-serif;color:#222;background:#fff;padding:10px">
      <!-- Header -->
      <div style="border-bottom:3px solid #3B6D11;padding-bottom:14px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <img src="./images/govt logo.png" style="width:70px;height:70px;object-fit:contain" alt="govt logo">
          <div style="text-align:center;flex:1;padding:0 12px">
            <div style="font-size:22px;font-weight:700;color:#3B6D11">${orgName}</div>
            <div style="font-size:12px;color:#666">${orgSub} | ${orgAddr}</div>
            <div style="font-size:11px;color:#888">বাংলাদেশ কৃষি মন্ত্রণালয়</div>
          </div>
          <img src="./images/favicon.jpg" style="width:70px;height:70px;object-fit:contain;border-radius:50%" alt="center logo">
        </div>
      </div>
      <!-- Invoice Info -->
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px">
        <div>
          <div style="font-weight:700;font-size:15px;margin-bottom:4px">চালান নং: ${s.invoice_no}</div>
          <div style="color:#666">তারিখ: ${fmtDMY(s.sale_date)}</div>
          <div style="color:#666">পরিশোধ: <span style="color:${s.payment_status === "paid" ? "#3B6D11" : "#e24b4a"};font-weight:600">${s.payment_status === "paid" ? "পরিশোধিত" : "বকেয়া"}</span></div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;margin-bottom:4px">গ্রাহক তথ্য</div>
          <div>${s.customer_name || "—"}</div>
          <div style="color:#666">${s.customer_phone || ""}</div>
          <div style="color:#666">${s.customer_address || ""}</div>
        </div>
      </div>
      <!-- Items Table -->
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
        <thead>
          <tr style="background:#3B6D11;color:#fff">
            <th style="padding:8px 12px;text-align:left;border-radius:4px 0 0 0">#</th>
            <th style="padding:8px 12px;text-align:left">চারার নাম</th>
            <th style="padding:8px 12px;text-align:center">পরিমাণ</th>
            <th style="padding:8px 12px;text-align:right">একক দর (৳)</th>
            <th style="padding:8px 12px;text-align:right;border-radius:0 4px 0 0">মোট (৳)</th>
          </tr>
        </thead>
        <tbody>
          ${its
            .map(
              (
                i,
                idx,
              ) => `<tr style="border-bottom:1px solid #eee;background:${idx % 2 === 0 ? "#f9f9f9" : "#fff"}">
            <td style="padding:8px 12px;color:#888">${idx + 1}</td>
            <td style="padding:8px 12px;font-weight:500">${i.name_bn || "—"}${i.variety ? ` (${i.variety})` : ""}</td>
            <td style="padding:8px 12px;text-align:center">${toBnNum(i.quantity)}</td>
            <td style="padding:8px 12px;text-align:right">${toBnMoney(i.unit_price)}</td>
            <td style="padding:8px 12px;text-align:right;font-weight:600">${toBnMoney(i.total_price)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
        <div style="width:260px;font-size:13px">
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
            <span style="color:#666">উপমোট:</span>
            <span>${toBnMoney(s.subtotal || s.total_amount)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;color:#e24b4a">
            <span>ছাড়:</span>
            <span>− ${toBnMoney(s.discount || 0)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:16px;color:#3B6D11;border-top:2px solid #3B6D11;margin-top:4px">
            <span>নিট মোট:</span>
            <span>${toBnMoney(s.total_amount)}</span>
          </div>
          <div style="font-size:11px;color:#888;text-align:right">পরিশোধ পদ্ধতি: ${s.payment_method === "cash" ? "নগদ" : s.payment_method === "bank" ? "ব্যাংক" : "মোবাইল ব্যাংকিং"}</div>
        </div>
      </div>
      <!-- Footer -->
      <div style="border-top:1px solid #eee;padding-top:14px;display:flex;justify-content:space-between;font-size:11px;color:#888">
        <div>
          <div style="margin-bottom:4px">ধন্যবাদ আপনার ক্রয়ের জন্য 🌿</div>
          <div>Generated: ${fmtDMY(new Date())}</div>
        </div>
        <div style="text-align:right">
          <div style="margin-bottom:30px">কর্তৃপক্ষের স্বাক্ষর</div>
          <div style="border-top:1px solid #333;width:120px;text-align:center;padding-top:4px">অনুমোদনকারী</div>
        </div>
      </div>
    </div>`;
    oM("mInv");
  } catch (e) {
    toast("চালান লোড সমস্যা", 1);
  }
}

// ===== INVOICE PDF DOWNLOAD =====
function downloadInvoicePDF() {
  const el = document.getElementById("invoicePrint");
  if (!el) return toast("চালান খুলুন তারপর PDF ডাউনলোড করুন", 1);
  const inv = currentInvData;
  const filename = `চালান_${inv?.invoice_no || "invoice"}_${inv?.customer_name || ""}.pdf`;
  toast("PDF তৈরি হচ্ছে...");
  const opt = {
    margin: [8, 8, 8, 8],
    filename: filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };
  html2pdf()
    .set(opt)
    .from(el)
    .save()
    .then(() => {
      toast("PDF ডাউনলোড হয়েছে ✅");
    });
}

function printInv() {
  window.print();
}
function printSale(id) {
  viewInv(id).then(() => setTimeout(() => window.print(), 800));
}

// Calc total
// ===== বহু আইটেম বিক্রয় =====
let saleItemCount = 0;
let saleOptionsHTML = ""; // সব চারার options cache

function addSaleItem() {
  const idx = saleItemCount++;
  const div = document.createElement("div");
  div.id = "saleItem_" + idx;
  div.style.cssText =
    "display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:end;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed var(--bd)";
  div.innerHTML = `
    <div class="fg" style="margin:0"><label style="font-size:11px">চারা</label>
      <select class="fc" id="slSd_${idx}" onchange="onSeedChange(${idx})">${saleOptionsHTML}</select></div>
    <div class="fg" style="margin:0;width:80px"><label style="font-size:11px">পরিমাণ</label>
      <input class="fc" type="number" id="slQt_${idx}" value="1" oninput="calcAllItems()"></div>
    <div class="fg" style="margin:0;width:100px"><label style="font-size:11px">দর (৳)</label>
      <input class="fc" type="number" id="slRt_${idx}" value="0" oninput="calcAllItems()"></div>
    <div style="padding-bottom:2px">${idx > 0 ? `<button class="btn btns btnr" onclick="removeSaleItem(${idx})" title="মুছুন"><i class="ti ti-trash"></i></button>` : ""}</div>`;
  document.getElementById("saleItemsList").appendChild(div);
  calcAllItems();
}

function removeSaleItem(idx) {
  const el = document.getElementById("saleItem_" + idx);
  if (el) {
    el.remove();
    calcAllItems();
  }
}

function onSeedChange(idx) {
  // Edit mode-এ price override করবে না
  if (document.getElementById("mSale").dataset.editId) return;
  const sel = document.getElementById("slSd_" + idx);
  const price = sel?.options[sel.selectedIndex]?.dataset?.price || 0;
  document.getElementById("slRt_" + idx).value = price;
  calcAllItems();
}

function calcAllItems() {
  let total = 0;
  document.querySelectorAll('[id^="saleItem_"]').forEach((row) => {
    const idx = row.id.split("_")[1];
    const q = +document.getElementById("slQt_" + idx)?.value || 0;
    const r = +document.getElementById("slRt_" + idx)?.value || 0;
    total += q * r;
  });
  const disc = +document.getElementById("slDi")?.value || 0;
  document.getElementById("slTotal").textContent = "৳" + total.toLocaleString();
  document.getElementById("slTotalD").textContent =
    "− ৳" + disc.toLocaleString();
  document.getElementById("slNet").textContent =
    "৳" + (total - disc).toLocaleString();
}

function resetSaleModal() {
  saleItemCount = 0;
  document.getElementById("saleItemsList").innerHTML = "";
  addSaleItem(); // প্রথম item যোগ করুন
  document.getElementById("slDi").value = 0;
  calcAllItems();
}
document.getElementById("slDi").addEventListener("input", calcAllItems);
document.getElementById("saleDate").value = new Date()
  .toISOString()
  .split("T")[0];

async function saveSale() {
  const editId = document.getElementById("mSale").dataset.editId || "";
  // সব items collect করুন
  const items = [];
  document.querySelectorAll('[id^="saleItem_"]').forEach((row) => {
    const idx = row.id.split("_")[1];
    const sid = +document.getElementById("slSd_" + idx)?.value || 0;
    const qty = +document.getElementById("slQt_" + idx)?.value || 0;
    const rate = +document.getElementById("slRt_" + idx)?.value || 0;
    if (sid && qty && rate)
      items.push({ seedling_id: sid, quantity: qty, unit_price: rate });
  });
  const b = {
    customer_name: document.getElementById("slC").value,
    customer_phone: document.getElementById("slPh").value,
    customer_address: document.getElementById("slAd").value,
    discount: +document.getElementById("slDi").value || 0,
    payment_method: document.getElementById("slPm").value,
    items,
  };
  if (!b.customer_name) return toast("গ্রাহকের নাম দিন", 1);
  if (!items.length) return toast("কমপক্ষে একটি আইটেম দিন", 1);
  try {
    let d;
    if (editId) {
      d = await api("/sales/" + editId, {
        method: "PUT",
        body: JSON.stringify({
          customer_name: b.customer_name,
          customer_phone: b.customer_phone,
          customer_address: b.customer_address,
          payment_method: b.payment_method,
          discount: b.discount,
        }),
      });
      if (d.success) {
        toast("বিক্রয় আপডেট হয়েছে ✅");
        cM("mSale");
        delete document.getElementById("mSale").dataset.editId;
        document.querySelector("#mSale .mh h3").textContent =
          "নতুন বিক্রয় / চালান";
        lSale();
      } else toast(d.error || d.message || "সমস্যা", 1);
    } else {
      d = await api("/sales", { method: "POST", body: JSON.stringify(b) });
      if (d.success) {
        toast("বিক্রয় সম্পন্ন ✅ চালান: " + (d.data?.invoice_no || ""));
        cM("mSale");
        resetSaleModal();
        lSale();
      } else toast(d.error || d.message || "সমস্যা", 1);
    }
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== CUSTOMERS =====
async function lCust() {
  try {
    const s = document.getElementById("cSearch")?.value || "";
    const d = await api(
      "/customers" + (s ? "?search=" + encodeURIComponent(s) : ""),
    );
    document.getElementById("cTbl").innerHTML = d.data?.length
      ? d.data
          .map(
            (c) =>
              `<tr><td><strong>${c.name}</strong></td><td>${c.phone || "-"}</td><td>${c.address || "-"}</td><td>${c.total_orders || 0}টি</td><td>৳${parseFloat(c.total_spent || 0).toLocaleString()}</td><td><div style="display:flex;gap:4px"><button class="btn btns btne" onclick="editCust(${JSON.stringify(c).replace(/"/g, "&quot;")})"><i class="ti ti-edit"></i></button><button class="btn btns btnr" onclick="delItem('customers',${c.id},'${c.name}')"><i class="ti ti-trash"></i></button></div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="lt">গ্রাহক নেই</td></tr>';
  } catch (e) {}
}

function editCust(c) {
  document.getElementById("mCustT").textContent = "গ্রাহক সম্পাদনা";
  document.getElementById("cId").value = c.id;
  document.getElementById("cNm").value = c.name || "";
  document.getElementById("cPh").value = c.phone || "";
  document.getElementById("cAd").value = c.address || "";
  document.getElementById("cEm").value = c.email || "";
  oM("mCust");
}

async function saveCust() {
  const id = document.getElementById("cId").value;
  const b = {
    name: document.getElementById("cNm").value,
    phone: document.getElementById("cPh").value,
    address: document.getElementById("cAd").value,
    email: document.getElementById("cEm").value,
  };
  if (!b.name) return toast("নাম দিন", 1);
  try {
    const d = id
      ? await api("/customers/" + id, {
          method: "PUT",
          body: JSON.stringify(b),
        })
      : await api("/customers", { method: "POST", body: JSON.stringify(b) });
    if (d.success) {
      toast(id ? "আপডেট ✅" : "গ্রাহক যোগ ✅");
      cM("mCust");
      document.getElementById("cId").value = "";
      document.getElementById("mCustT").textContent = "নতুন গ্রাহক";
      lCust();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== USERS =====
async function lUsr() {
  const matrix = document.getElementById("permMatrix");
  if (matrix) matrix.style.display = ME.role === "admin" ? "block" : "none";
  try {
    const d = await api("/users");
    const pendingCount =
      d.data?.filter((u) => u.password_request_status === "pending").length ||
      0;
    // Pending badge সিডবার-এ দেখান
    const usrNav = document.querySelector('.ni[onclick*="usr"]');
    if (usrNav && pendingCount > 0) {
      const nb = usrNav.querySelector(".nb") || document.createElement("span");
      nb.className = "nb";
      nb.textContent = pendingCount;
      if (!usrNav.querySelector(".nb")) usrNav.appendChild(nb);
    }
    document.getElementById("uTbl").innerHTML =
      d.data
        ?.map(
          (u) => `<tr>
<td><div style="display:flex;align-items:center;gap:8px"><div class="av">${u.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase()}</div>
<div><strong>${u.name}</strong>${u.password_request_status === "pending" ? '<br><span style="font-size:11px;color:var(--a400)">⏳ পাসওয়ার্ড পরিবর্তনের অনুরোধ</span>' : u.password_request_status === "approved" ? '<br><span style="font-size:11px;color:var(--g600)">✅ পাসওয়ার্ড অনুমোদিত</span>' : ""}</div></div></td>
<td>${u.email}</td>
<td><span class="b bg">${RN[u.role] || u.role}</span></td>
<td>${u.is_active ? '<span class="b bg">সক্রিয়</span>' : '<span class="b br">নিষ্ক্রিয়</span>'}</td>
<td><div style="display:flex;gap:4px">
${ME.role === "admin" && u.password_request_status === "pending" ? `<button class="btn btns" style="background:var(--g50);color:var(--g600)" onclick="approvePwd(${u.id})" title="অনুমোদন"><i class="ti ti-check"></i></button><button class="btn btns btnr" onclick="rejectPwd(${u.id})" title="প্রত্যাখ্যান"><i class="ti ti-x"></i></button>` : ""}
<button class="btn btns btne" onclick="editUsr(${JSON.stringify(u).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns" style="${u.is_active ? "background:var(--a50);color:var(--a400)" : "background:var(--g50);color:var(--g600)"}" onclick="toggleUser(${u.id},'${u.name}')" title="${u.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}"><i class="ti ti-${u.is_active ? "lock" : "lock-open"}"></i></button>
<button class="btn btns btnr" onclick="delItem('users',${u.id},'${u.name}')" title="স্থায়ীভাবে মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`,
        )
        .join("") || "";
  } catch (e) {
    document.getElementById("uTbl").innerHTML =
      '<tr><td colspan="5" class="lt">শুধু Admin দেখতে পারে</td></tr>';
  }
}

function editUsr(u) {
  document.getElementById("mUsrT").textContent = "ব্যবহারকারী সম্পাদনা";
  document.getElementById("uId").value = u.id;
  document.getElementById("uNm").value = u.name || "";
  document.getElementById("uEm").value = u.email || "";
  document.getElementById("uRl").value = u.role || "";
  document.getElementById("uPw").value = "";
  oM("mUsr");
}

async function saveUsr() {
  const id = document.getElementById("uId").value;
  const b = {
    name: document.getElementById("uNm").value,
    email: document.getElementById("uEm").value,
    role: document.getElementById("uRl").value,
    is_active: true,
  };
  if (document.getElementById("uPw").value)
    b.password = document.getElementById("uPw").value;
  if (!b.name || !b.email) return toast("নাম ও ইমেইল দিন", 1);
  try {
    const d = id
      ? await api("/users/" + id, { method: "PUT", body: JSON.stringify(b) })
      : await api("/users", { method: "POST", body: JSON.stringify(b) });
    if (d.success) {
      toast(id ? "আপডেট ✅" : "তৈরি হয়েছে ✅");
      cM("mUsr");
      document.getElementById("uId").value = "";
      document.getElementById("mUsrT").textContent = "নতুন ব্যবহারকারী";
      lUsr();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== P&L REPORT =====
async function loadPL() {
  try {
    const f = document.getElementById("plFr").value,
      t = document.getElementById("plTo").value;
    const d = await api(
      "/reports/profit-loss" +
        (f ? "?from_date=" + f + (t ? "&to_date=" + t : "") : ""),
    );
    if (d.success) {
      const r = d.data;
      document.getElementById("plRev").textContent =
        "৳" + parseFloat(r.total_revenue).toLocaleString();
      document.getElementById("plCost").textContent =
        "৳" + parseFloat(r.total_cost).toLocaleString();
      document.getElementById("plNet").textContent =
        "৳" + parseFloat(r.profit).toLocaleString();
      document.getElementById("plNet").style.color =
        r.profit >= 0 ? "var(--g600)" : "var(--r400)";
      document.getElementById("plMg").textContent = r.profit_margin + "%";
      document.getElementById("plRes").style.display = "block";
    }
  } catch (e) {
    toast("রিপোর্ট লোড সমস্যা", 1);
  }
}

// ===== DELETE =====
// ===== CUSTOM CONFIRM MODAL =====
let confirmCallback = null;
function showConfirm(msg, onYes) {
  document.getElementById("confirmMsg").innerHTML = msg;
  confirmCallback = onYes;
  oM("mConfirm");
}
function confirmYes() {
  cM("mConfirm");
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
}
function confirmNo() {
  cM("mConfirm");
  confirmCallback = null;
}

function delItem(endpoint, id, name) {
  showConfirm(
    `<div style="text-align:center;margin-bottom:8px;font-size:32px">🗑️</div>
    <strong>"${name || "এই item"}"</strong> মুছে ফেলবেন?<br>
    <span style="font-size:12px;color:var(--tm);margin-top:8px;display:block">মুছলে Recycle Bin-এ যাবে — পরে পুনরুদ্ধার করা যাবে।</span>`,
    async () => {
      try {
        const d = await api("/" + endpoint + "/" + id, { method: "DELETE" });
        if (d.success) {
          toast('"' + (name || "item") + '" Recycle Bin-এ পাঠানো হয়েছে 🗑️');
          const refreshMap = {
            seedlings: lSeed,
            customers: lCust,
            users: lUsr,
            "mother-plants": lMoth,
            sales: lSale,
            "production-batches": () => {
              lProd();
              lBatch();
            },
            damages: lDmg,
            categories: loadCategories,
            targets: lTargetAchievement,
          };
          refreshMap[endpoint]?.();
        } else toast(d.message || "মুছতে সমস্যা", 1);
      } catch (e) {
        toast("সার্ভার সমস্যা", 1);
      }
    },
  );
}

// ===== RECYCLE BIN =====
async function lRecycleBin() {
  const el = document.getElementById("recycleBinList");
  if (el) el.innerHTML = '<div class="lt">লোড হচ্ছে...</div>';
  try {
    const d = await api("/recycle-bin");
    if (!d.success || !d.data.length) {
      if (el)
        el.innerHTML =
          '<div style="text-align:center;padding:30px 20px;color:var(--tm)"><div style="font-size:48px;margin-bottom:10px">🗑️</div><div style="font-size:15px;font-weight:600">Recycle Bin খালি</div><div style="font-size:12px;margin-top:6px">মুছে ফেলা items এখানে দেখাবে</div></div>';
      return;
    }
    if (el)
      el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:13px;color:var(--tm)">মোট ${toBnNum(d.data.length)}টি item — পুনরুদ্ধার করা যাবে</div>
      <button class="btn btns btnr" onclick="emptyBin()"><i class="ti ti-trash"></i> সব মুছুন</button>
    </div>
    <div class="tw"><table><thead><tr>
      <th>আইটেমের নাম</th><th>মডিউল</th><th>মুছেছেন</th><th>তারিখ</th><th>কার্যক্রম</th>
    </tr></thead><tbody>
    ${d.data
      .map(
        (r) => `<tr>
      <td><strong>${r.item_name || "—"}</strong></td>
      <td><span class="b bg">${r.module || r.table_name}</span></td>
      <td>${r.deleted_by_name || "—"}</td>
      <td>${fmtDMY(r.deleted_at)}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btns" style="background:var(--g50);color:var(--g600);border:1px solid var(--g400)" onclick="restoreItem(${r.id},'${(r.item_name || "").replace(/'/g, "&#39;")}')"><i class="ti ti-restore"></i> পুনরুদ্ধার</button>
        <button class="btn btns btnr" onclick="permDelete(${r.id},'${(r.item_name || "").replace(/'/g, "&#39;")}')"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`,
      )
      .join("")}
    </tbody></table></div>`;
  } catch (e) {
    if (el) el.innerHTML = '<div class="lt">লোড সমস্যা</div>';
  }
}

async function restoreItem(id, name) {
  showConfirm(`♻️ "${name}" পুনরুদ্ধার করবেন?`, async () => {
    try {
      const d = await api("/recycle-bin/" + id + "/restore", {
        method: "POST",
      });
      if (d.success) {
        toast('"' + name + '" পুনরুদ্ধার হয়েছে ✅');
        lRecycleBin();
      } else toast(d.message || "সমস্যা", 1);
    } catch (e) {
      toast("সমস্যা", 1);
    }
  });
}

async function permDelete(id, name) {
  showConfirm(
    `⚠️ "${name}" চিরতরে মুছে ফেলবেন?\nএটা পুনরুদ্ধার করা যাবে না!`,
    async () => {
      try {
        const d = await api("/recycle-bin/" + id, { method: "DELETE" });
        if (d.success) {
          toast("স্থায়ীভাবে মুছে ফেলা হয়েছে");
          lRecycleBin();
        } else toast(d.message || "সমস্যা", 1);
      } catch (e) {
        toast("সমস্যা", 1);
      }
    },
  );
}

async function emptyBin() {
  showConfirm(
    "⚠️ Recycle Bin সম্পূর্ণ খালি করবেন?\nসব item চিরতরে মুছে যাবে!",
    async () => {
      try {
        const d = await api("/recycle-bin", { method: "DELETE" });
        if (d.success) {
          toast("Recycle Bin খালি করা হয়েছে");
          lRecycleBin();
        } else toast(d.message || "সমস্যা", 1);
      } catch (e) {
        toast("সমস্যা", 1);
      }
    },
  );
}

// ===== DROPDOWNS =====
async function loadDD() {
  try {
    await loadCategories(); // ✅ Category dropdown সব জায়গায় আপডেট হবে
    const d = await api("/seedlings?limit=200");
    if (d.success) {
      const o = d.data
        .map(
          (s) =>
            `<option value="${s.id}" data-price="${s.unit_price}">${s.name_bn}${s.variety ? " (" + s.variety + ")" : ""}</option>`,
        )
        .join("");
      saleOptionsHTML = o;
      ["pSd", "dSd", "mSd"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.innerHTML = o;
        }
      });
      resetSaleModal();
    }
    const m = await api("/mother-plants");
    if (m.success)
      document.getElementById("pMP").innerHTML =
        '<option value="">--</option>' +
        m.data
          .map(
            (x) =>
              `<option value="${x.id}">${x.mp_code} - ${x.variety}</option>`,
          )
          .join("");
    const bt = await api("/production");
    if (bt.success)
      document.getElementById("dBt").innerHTML =
        '<option value="">-- নির্বাচন করুন</option>' +
        bt.data
          .map((x) => `<option value="${x.id}">${x.batch_code}</option>`)
          .join("");
  } catch (e) {}
}

// ===== BATCH MANAGEMENT =====
async function lBatch(isRetry = false) {
  try {
    const d = await api("/production");
    if (!d.success) return;
    let all = d.data || [];

    // empty হলে একবার retry করব (cold start বা login delay)
    if (!all.length && !isRetry) {
      setTimeout(() => lBatch(true), 2000);
      return;
    }
    const srch =
      document.getElementById("btSearch")?.value?.toLowerCase() || "";
    const stf = document.getElementById("btStatus")?.value || "";
    if (srch)
      all = all.filter(
        (x) =>
          (x.batch_code || "").toLowerCase().includes(srch) ||
          (x.seedling_bn || "").toLowerCase().includes(srch),
      );
    if (stf) all = all.filter((x) => x.status === stf);
    const ac = all.filter((x) => x.status === "active").length,
      so = all.filter((x) => x.status === "sold_out").length;
    const av =
      all.reduce((s, x) => {
        const r = +(x.success_percent || x.germination_percent || 0);
        return s + r;
      }, 0) / (all.length || 1);
    const bTot = document.getElementById("bTot");
    const bAct = document.getElementById("bAct");
    const bSld = document.getElementById("bSld");
    const bAvg = document.getElementById("bAvg");
    const bTbl = document.getElementById("bTbl");
    if (bTot) bTot.textContent = all.length;
    if (bAct) bAct.textContent = ac;
    if (bSld) bSld.textContent = so;
    if (bAvg) bAvg.textContent = av.toFixed(1) + "%";
    const statusBadge = {
      active: '<span class="b bg">সক্রিয়</span>',
      partial: '<span class="b ba">আংশিক</span>',
      sold_out: '<span class="b br">বিক্রি শেষ</span>',
      closed: '<span class="b">বন্ধ</span>',
    };
    if (bTbl)
      bTbl.innerHTML = all.length
        ? all
            .map((b) => {
              const dt =
                b.production_type === "seed"
                  ? b.sowing_date
                  : b.propagation_date;
              const sp = b.success_percent || b.germination_percent || 0;
              const avail = b.available_quantity ?? b.produced_quantity;
              const sold =
                b.produced_quantity - avail - (b.failed_quantity || 0);
              return `<tr>
<td><strong style="color:var(--g600)">${b.batch_code}</strong></td>
<td><strong>${b.seedling_bn || "-"}</strong>${b.seedling_variety ? "<br><span style='font-size:11px;color:var(--tm)'>" + b.seedling_variety + "</span>" : ""}</td>
<td><span class="b bt">${MN[b.production_type] || b.production_type}</span></td>
<td>${fmtDMY(dt || b.created_at)}</td>
<td>${b.produced_quantity}</td>
<td><strong style="${avail <= 10 ? "color:var(--c400)" : ""}">${avail}</strong></td>
<td>${Math.max(0, sold)}</td>
<td>${b.failed_quantity || 0}</td>
<td><span class="b ${+sp >= 75 ? "bg" : "ba"}">${sp || "-"}%</span></td>
<td>${statusBadge[b.status] || b.status}</td>
<td><div style="display:flex;gap:4px">
<button class="btn btns btne" onclick="editBatch(${JSON.stringify(b).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('production-batches',${b.id},'ব্যাচ ${b.batch_code}')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`;
            })
            .join("")
        : '<tr><td colspan="11" class="lt">কোনো ব্যাচ নেই</td></tr>';
  } catch (e) {
    console.error("lBatch error:", e);
  }
}

// EDIT BATCH
function editBatch(b) {
  document.getElementById("pMt").value = b.production_type || "seed";
  togP();
  // Modal খোলো — কিন্তু loadDD শেষ হওয়ার পর values set করো
  document.getElementById("mProd").classList.add("open");
  loadDD().then(() => {
    document.getElementById("pSd").value = b.seedling_id || "";
    if (b.production_type === "seed") {
      document.getElementById("pSrc").value = b.seed_source || "";
      document.getElementById("pSQ").value = b.seed_quantity || 0;
      document.getElementById("pSw").value = fmtDateInput(b.sowing_date);
      document.getElementById("pPQ").value = b.produced_quantity || 0;
    } else {
      document.getElementById("pMP").value = b.mother_plant_id || "";
      document.getElementById("pPD").value = fmtDateInput(b.propagation_date);
      document.getElementById("pAQ").value = b.produced_quantity || 0;
      document.getElementById("pSu").value = b.success_quantity || 0;
    }
    document.getElementById("pRm").value = b.remarks || "";
    document.getElementById("mProd").dataset.editId = b.id;
    document.querySelector("#mProd .mh h3").textContent =
      `ব্যাচ সম্পাদনা — ${b.batch_code}`;
  });
}

// EDIT SALE
async function editSale(s) {
  document.getElementById("slC").value = s.customer_name || "";
  document.getElementById("slPh").value = s.customer_phone || "";
  document.getElementById("slAd").value = s.customer_address || "";
  document.getElementById("slPm").value = s.payment_method || "cash";
  document.getElementById("slDi").value = s.discount || 0;
  document.getElementById("mSale").dataset.editId = s.id;
  document.querySelector("#mSale .mh h3").textContent =
    `বিক্রয় সম্পাদনা — ${s.invoice_no}`;
  try {
    const detail = await api("/sales/" + s.id);
    if (detail.success && detail.data.items && detail.data.items.length > 0) {
      saleItemCount = 0;
      document.getElementById("saleItemsList").innerHTML = "";
      detail.data.items.forEach((item) => {
        addSaleItem();
        const idx = saleItemCount - 1;
        // ✅ চারা সিলেক্ট করুন
        const sel = document.getElementById("slSd_" + idx);
        if (sel) {
          for (let i = 0; i < sel.options.length; i++) {
            if (parseInt(sel.options[i].value) === item.seedling_id) {
              sel.selectedIndex = i;
              break;
            }
          }
        }
        // ✅ পরিমাণ ও দর — সরাসরি set করুন (onchange override রোধ করুন)
        const qtEl = document.getElementById("slQt_" + idx);
        const rtEl = document.getElementById("slRt_" + idx);
        if (qtEl) qtEl.value = item.quantity || 1;
        if (rtEl) rtEl.value = item.unit_price || 0;
      });
      // ✅ সব set হওয়ার পর মোট হিসাব করুন
      setTimeout(() => calcAllItems(), 50);
    }
  } catch (e) {
    console.log("editSale error:", e);
  }
  oM("mSale");
}

// ===== PASSWORD VISIBILITY TOGGLE =====
function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  const icon = btn.querySelector("i");
  if (inp.type === "password") {
    inp.type = "text";
    icon.className = "ti ti-eye-off";
  } else {
    inp.type = "password";
    icon.className = "ti ti-eye";
  }
}

// ===== PROFILE MODAL =====
function openProfile() {
  const isAdmin = ME.role === "admin";
  const ini = (ME.name || "U")
    .split(" ")
    .map((x) => x[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const roleLabel = {
    admin: "Admin",
    manager: "Manager",
    production_officer: "Prod. Officer",
    sales_operator: "Sales Operator",
    viewer: "Viewer",
  };

  if (isAdmin) {
    // Admin — সরাসরি update দেখাও
    document.getElementById("profileAdmin").style.display = "block";
    document.getElementById("profileUser").style.display = "none";
    document.getElementById("mProfileTitle").textContent =
      "আমার প্রোফাইল — Admin";
    document.getElementById("profAvatar").textContent = ini;
    document.getElementById("profName").textContent = ME.name || "";
    document.getElementById("profRole").textContent = "Admin";
    document.getElementById("prName").value = ME.name || "";
    document.getElementById("prEmail").value = ME.email || "";
    document.getElementById("prCurPwd").value = "";
    document.getElementById("prNewPwd").value = "";
    document.getElementById("prConPwd").value = "";
  } else {
    // Regular user — Request form দেখাও
    document.getElementById("profileAdmin").style.display = "none";
    document.getElementById("profileUser").style.display = "block";
    document.getElementById("mProfileTitle").textContent = "আমার প্রোফাইল";
    document.getElementById("profAvatarU").textContent = ini;
    document.getElementById("profNameU").textContent = ME.name || "";
    document.getElementById("profRoleU").textContent =
      roleLabel[ME.role] || ME.role;
    document.getElementById("pwdNew").value = "";
    document.getElementById("pwdCon").value = "";
    document.getElementById("reqStatus").style.display = "none";
  }
  oM("mProfile");
}

// ===== SETTINGS PAGE LOAD =====
function lCfg() {
  document.getElementById("prName").value = ME.name || "";
  document.getElementById("prEmail").value = ME.email || "";
  // Admin-only sections দেখাও/লুকাও
  const adminEl = document.getElementById("cfgAdminOnly");
  if (adminEl) adminEl.style.display = ME.role === "admin" ? "block" : "none";
  loadCategories();
  applyThemeFromStorage();
}

// প্রোফাইল আপডেট
async function updateProfile() {
  const name = document.getElementById("prName").value;
  const email = document.getElementById("prEmail").value;
  const curPwd = document.getElementById("prCurPwd").value;
  const newPwd = document.getElementById("prNewPwd").value;
  const conPwd = document.getElementById("prConPwd").value;

  if (!curPwd) return toast("বর্তমান পাসওয়ার্ড দিন", 1);
  if (!email) return toast("ইমেইল দিন", 1);
  if (newPwd && newPwd !== conPwd) return toast("নতুন পাসওয়ার্ড মিলছে না", 1);
  if (newPwd && newPwd.length < 6)
    return toast("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর", 1);

  try {
    const d = await api("/auth/update-profile", {
      method: "PUT",
      body: JSON.stringify({
        name,
        email,
        current_password: curPwd,
        new_password: newPwd || undefined,
      }),
    });
    if (d.success) {
      toast("প্রোফাইল আপডেট হয়েছে ✅ পুনরায় Login করুন...");
      // তথ্য আপডেট ও logout
      setTimeout(() => logout(), 2000);
    } else {
      toast(d.message || "সমস্যা হয়েছে", 1);
    }
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== THEME & DARK MODE =====
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("hc_theme", theme);
  // Active button highlight করুন
  ["green", "blue", "purple", "orange"].forEach((t) => {
    const btn = document.getElementById("theme-" + t);
    if (btn)
      btn.style.border =
        t === theme ? "2px solid currentColor" : "2px solid transparent";
  });
}

function toggleDark() {
  const isDark = document.getElementById("darkToggle")?.checked;
  document.documentElement.setAttribute("data-dark", isDark ? "true" : "false");
  localStorage.setItem("hc_dark", isDark ? "true" : "false");
  // Toggle UI আপডেট করুন
  const slider = document.getElementById("darkSlider");
  const knob = document.getElementById("darkKnob");
  if (slider) slider.style.background = isDark ? "var(--g600)" : "#ccc";
  if (knob)
    knob.style.transform = isDark ? "translateX(24px)" : "translateX(0)";
}

function applyThemeFromStorage() {
  const theme = localStorage.getItem("hc_theme") || "green";
  const dark = localStorage.getItem("hc_dark") || "false";
  // Theme apply করুন
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-dark", dark);
  // Settings পেজ খোলা থাকলে button highlight করুন
  setTimeout(() => {
    ["green", "blue", "purple", "orange"].forEach((t) => {
      const btn = document.getElementById("theme-" + t);
      if (btn)
        btn.style.border =
          t === theme ? "2px solid currentColor" : "2px solid transparent";
    });
    const toggle = document.getElementById("darkToggle");
    if (toggle) toggle.checked = dark === "true";
    const slider = document.getElementById("darkSlider");
    const knob = document.getElementById("darkKnob");
    if (slider)
      slider.style.background = dark === "true" ? "var(--g600)" : "#ccc";
    if (knob)
      knob.style.transform =
        dark === "true" ? "translateX(24px)" : "translateX(0)";
  }, 100);
}

// Page load-এ theme apply করুন
applyThemeFromStorage();

// ===== CATEGORY MANAGEMENT =====
let catOptionsHTML = ""; // Cache for dropdowns

async function loadCategories() {
  try {
    const d = await api("/categories");
    if (!d.success) return;
    const cats = d.data;

    // Dropdown options cache
    catOptionsHTML = cats
      .map((c) => `<option value="${c.id}">${c.name_bn}</option>`)
      .join("");

    // Filter dropdown (চারা তালিকা)
    const sCatF = document.getElementById("sCatF");
    if (sCatF)
      sCatF.innerHTML = `<option value="">সব ক্যাটাগরি</option>${catOptionsHTML}`;

    // Seedling form dropdown
    const sCat = document.getElementById("sCat");
    if (sCat) sCat.innerHTML = catOptionsHTML;

    // Settings page category list
    const catList = document.getElementById("catList");
    if (catList) {
      if (!cats.length) {
        catList.innerHTML = '<div class="lt">কোনো ক্যাটাগরি নেই</div>';
        return;
      }
      catList.innerHTML = `<div class="tw"><table><thead><tr><th>#</th><th>বাংলা নাম</th><th>English</th><th>কার্যক্রম</th></tr></thead><tbody>
      ${cats
        .map(
          (c, i) => `<tr>
        <td>${toBnNum(i + 1)}</td>
        <td><strong>${c.name_bn}</strong></td>
        <td style="color:var(--tm)">${c.name_en || "—"}</td>
        <td>${ME.role === "admin" ? `<button class="btn btns btnr" onclick="deleteCategory(${c.id},'${c.name_bn}')"><i class="ti ti-trash"></i></button>` : "—"}</td>
      </tr>`,
        )
        .join("")}
      </tbody></table></div>`;
    }
  } catch (e) {}
}

async function addCategory() {
  const bn = document.getElementById("newCatBn")?.value?.trim();
  const en = document.getElementById("newCatEn")?.value?.trim();
  if (!bn) return toast("বাংলা নাম দিন", 1);
  try {
    const d = await api("/categories", {
      method: "POST",
      body: JSON.stringify({ name_bn: bn, name_en: en || null }),
    });
    if (d.success) {
      toast("ক্যাটাগরি যোগ হয়েছে ✅");
      document.getElementById("newCatBn").value = "";
      document.getElementById("newCatEn").value = "";
      loadCategories();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

async function deleteCategory(id, name) {
  if (!confirm(`"${name}" মুছে ফেলবেন?`)) return;
  try {
    const d = await api("/categories/" + id, { method: "DELETE" });
    if (d.success) {
      toast("মুছে ফেলা হয়েছে");
      loadCategories();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// SETTINGS FUNCTIONS
function saveSettings() {
  const cfg = {
    name_bn: document.getElementById("cfgNB").value,
    name_en: document.getElementById("cfgNE").value,
    low_stock: +document.getElementById("cfgLS").value || 20,
    currency: document.getElementById("cfgCur").value,
    language: document.getElementById("cfgLng").value,
    center_category: document.getElementById("cfgCenterCat").value,
  };
  localStorage.setItem("hc_cfg", JSON.stringify(cfg));
  applySiteConfig(cfg);
  toast("সেটিংস সংরক্ষণ হয়েছে ✅");
}

// Sidebar ও সাইটের নাম আপডেট করুন
function applySiteConfig(cfg) {
  if (!cfg) return;
  const nameBn = cfg.name_bn || "উদ্যানতত্ত্ববিদের কার্যালয়";

  // Sidebar logo আপডেট
  const logoEl = document.querySelector(".sbl h1");
  if (logoEl) logoEl.textContent = "🌿 " + nameBn;

  const subEl = document.querySelector(".sbl p");
  if (subEl) subEl.textContent = nameEn;

  // Browser Tab Title আপডেট
  document.title = nameBn + " — Horticulture Management";

  // Login page-এও আপডেট
  const lpH1 = document.querySelector(".lb h1");
  if (lpH1) lpH1.textContent = nameBn;
  const lpSu = document.querySelector(".lb .su");
  if (lpSu) lpSu.textContent = nameEn;
}

// ===== FISCAL YEAR TARGET vs ACHIEVEMENT =====
function fyDonut(actual, target, color) {
  if (!target)
    return `<svg width="90" height="90" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="#eee" stroke-width="3.8"/><text x="18" y="21" text-anchor="middle" font-size="4.5" fill="#999" font-family="Noto Sans Bengali">লক্ষ্য নেই</text></svg>`;
  const pct = Math.min(Math.round((actual / target) * 100), 100);
  const dash = pct;
  const gap = 100 - dash;
  return `<svg width="90" height="90" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eee" stroke-width="3.8"/>
    <circle cx="18" cy="18" r="15.9" fill="none" stroke="${color}" stroke-width="3.8"
      stroke-dasharray="${dash} ${gap}" stroke-dashoffset="25" stroke-linecap="round"/>
    <text x="18" y="17" text-anchor="middle" font-size="6" fill="${color}" font-family="Noto Sans Bengali" font-weight="bold">${pct}%</text>
    <text x="18" y="23" text-anchor="middle" font-size="3" fill="#888" font-family="Noto Sans Bengali">অর্জিত</text>
  </svg>`;
}

async function lFiscalAchievement() {
  const fy = document.getElementById("fySelect")?.value || 2025;
  const el = document.getElementById("fyResult");
  // শুধু একদম প্রথমবার "লোড হচ্ছে" দেখাবে
  const isEmpty = !el || !el.innerHTML || el.innerHTML.trim() === "";
  if (isEmpty && el) el.innerHTML = '<div class="lt">লোড হচ্ছে...</div>';
  try {
    const d = await api("/reports/fiscal-achievement?fy=" + fy);
    if (!d.success) {
      if (el) el.innerHTML = '<div class="lt">ডেটা আনতে সমস্যা</div>';
      return;
    }
    const {
      production: p,
      sales: s,
      categories: cats,
      fy: fyLabel,
      current_month: cm,
    } = d.data;

    const pPct =
      p.target > 0 ? Math.min(Math.round((p.actual / p.target) * 100), 100) : 0;
    const sPct =
      s.target > 0 ? Math.min(Math.round((s.actual / s.target) * 100), 100) : 0;
    const pColor =
      pPct >= 100
        ? "#3B6D11"
        : pPct >= 70
          ? "#4A9B6F"
          : pPct >= 40
            ? "#E8A838"
            : "#E24B4A";
    const sColor =
      sPct >= 100
        ? "#1A6B8A"
        : sPct >= 70
          ? "#2E9EC4"
          : sPct >= 40
            ? "#E8A838"
            : "#E24B4A";

    // Category max for bar scaling
    const maxCat = Math.max(
      ...cats.map((c) => parseFloat(c.total_qty) || 0),
      1,
    );

    let html = `
    <div style="background:var(--g50);border-radius:10px;padding:16px">
      <div style="font-size:12px;font-weight:600;color:var(--g600);margin-bottom:12px"><i class="ti ti-plant"></i> উৎপাদন লক্ষ্যমাত্রা</div>
      <div style="display:grid;grid-template-columns:1fr 1px 1fr;gap:16px;align-items:center">

        <!-- বাম: বার্ষিক -->
        <div style="display:flex;align-items:center;gap:12px">
          ${fyDonut(p.actual, p.target, pColor)}
          <div style="font-size:12px">
            <div style="font-size:10px;color:var(--tm);margin-bottom:4px;font-weight:600">বার্ষিক লক্ষ্যমাত্রা</div>
            <div style="color:var(--tm);margin-bottom:3px">লক্ষ্য: <strong>${toBnNum(p.target)}টি</strong></div>
            <div style="color:${pColor};font-weight:600;margin-bottom:3px">অর্জন: ${toBnNum(p.actual)}টি</div>
            <div style="font-size:11px;color:var(--tm)">${p.actual >= p.target ? "✅ অর্জিত!" : "⬇ বাকি: " + toBnNum(p.target - p.actual) + "টি"}</div>
          </div>
        </div>

        <!-- Divider -->
        <div style="background:var(--bd);height:80px;width:1px"></div>

        <!-- ডান: চলতি মাস -->
        <div style="font-size:12px">
          <div style="font-size:10px;color:var(--tm);margin-bottom:8px;font-weight:600">চলতি মাস — ${bnMonths2[cm?.month || new Date().getMonth() + 1]}</div>
          ${
            cm?.target > 0
              ? `
          <div style="margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="color:var(--tm)">মাসিক লক্ষ্য:</span>
              <strong>${toBnNum(cm.target)}টি</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="color:var(--tm)">অর্জন:</span>
              <strong style="color:${cm.actual >= cm.target ? "var(--g600)" : "var(--r400)"}">${toBnNum(cm.actual || 0)}টি</strong>
            </div>
            <div style="height:8px;background:var(--gr100);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${Math.min(Math.round(((cm.actual || 0) / cm.target) * 100), 100)}%;background:${(cm.actual || 0) >= cm.target ? "var(--g600)" : "var(--g400)"};border-radius:4px"></div>
            </div>
            <div style="font-size:11px;color:var(--tm);margin-top:4px;text-align:right">${toBn(Math.min(Math.round(((cm.actual || 0) / cm.target) * 100), 100))}%</div>
          </div>`
              : `
          <div style="color:var(--tm);font-size:11px">এই মাসের লক্ষ্যমাত্রা নির্ধারণ করা হয়নি</div>`
          }
        </div>
      </div>
    </div>`;

    // Category breakdown বাদ দেওয়া হয়েছে
    if (el) el.innerHTML = html;
  } catch (e) {
    if (el) el.innerHTML = '<div class="lt">লোড সমস্যা</div>';
  }
}

// ===== TARGET vs ACHIEVEMENT =====
const bnMonths2 = [
  "",
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

// মাসিক/বার্ষিক toggle
function toggleTargetPeriod() {
  const period = document.getElementById("tgPeriod").value;
  document.getElementById("tgMonthBox").style.display =
    period === "monthly" ? "block" : "none";
}

function openTargetModal(tgt = null) {
  document.getElementById("tgEditId").value = tgt ? tgt.id : "";
  document.getElementById("mTargetTitle").textContent = tgt
    ? "লক্ষ্যমাত্রা সম্পাদনা"
    : "লক্ষ্যমাত্রা যোগ করুন";
  document.getElementById("tgType").value = tgt
    ? tgt.target_type
    : "production";
  // target_month=0 মানে অর্থবছর মোট
  const isAnnual = tgt ? tgt.target_month === 0 : true;
  document.getElementById("tgPeriod").value = isAnnual ? "annual" : "monthly";
  toggleTargetPeriod();
  document.getElementById("tgFY").value = tgt
    ? tgt.target_month >= 7
      ? tgt.target_year
      : tgt.target_year - 1
    : document.getElementById("targetFY").value;
  document.getElementById("tgMonth").value =
    tgt && tgt.target_month > 0 ? tgt.target_month : 7;
  document.getElementById("tgQty").value = tgt ? tgt.target_quantity : "";
  document.getElementById("tgAmt").value = tgt ? tgt.target_amount : "";
  document.getElementById("tgNotes").value = tgt ? tgt.notes || "" : "";
  oM("mTarget");
}

async function saveTarget() {
  const editId = document.getElementById("tgEditId").value;
  const type = document.getElementById("tgType").value;
  const period = document.getElementById("tgPeriod").value;
  const fy = +document.getElementById("tgFY").value;
  // অর্থবছর মোট হলে month=0, year=fy
  // মাসিক হলে month অনুযায়ী year নির্ধারণ
  let month, year;
  if (period === "annual") {
    month = 0;
    year = fy;
  } else {
    month = +document.getElementById("tgMonth").value;
    year = month >= 7 ? fy : fy + 1;
  }
  const qty = +document.getElementById("tgQty").value || 0;
  const amt = +document.getElementById("tgAmt").value || 0;
  const notes = document.getElementById("tgNotes").value;
  if (!qty && !amt) return toast("পরিমাণ বা আয় দিন", 1);
  try {
    const d = await api("/targets", {
      method: "POST",
      body: JSON.stringify({
        target_type: type,
        target_month: month,
        target_year: year,
        target_quantity: qty,
        target_amount: amt,
        notes,
      }),
    });
    if (d.success) {
      toast(
        editId ? "লক্ষ্যমাত্রা আপডেট হয়েছে ✅" : "লক্ষ্যমাত্রা যোগ হয়েছে ✅",
      );
      cM("mTarget");
      lTargetAchievement();
      lFiscalAchievement();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

async function deleteTarget(id) {
  if (!confirm("এই লক্ষ্যমাত্রা মুছে ফেলবেন?")) return;
  try {
    const d = await api("/targets/" + id, { method: "DELETE" });
    if (d.success) {
      toast("মুছে ফেলা হয়েছে");
      lTargetAchievement();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

async function lTargetAchievement() {
  // Admin বাটন দেখান
  const addBtn = document.getElementById("addTargetBtn");
  if (addBtn) addBtn.style.display = ME.role === "admin" ? "" : "none";

  const fy = document.getElementById("targetFY")?.value || 2025;
  const res = document.getElementById("targetResults");
  // প্রথমবার ছাড়া loading দেখাবে না
  if (res && res.innerHTML.includes("লোড হচ্ছে"))
    res.innerHTML = '<div class="lt">লোড হচ্ছে...</div>';

  try {
    const [tgRes, achRes] = await Promise.all([
      api("/targets?fy=" + fy),
      api("/reports/fiscal-achievement?fy=" + fy),
    ]);

    if (!achRes.success) {
      res.innerHTML = '<div class="lt">ডেটা আনতে সমস্যা</div>';
      return;
    }
    const { production: p, sales: s, categories: cats } = achRes.data;
    const targets = tgRes.success ? tgRes.data : [];

    let html = "";

    // Summary row
    const pPct =
      p.target > 0 ? Math.min(Math.round((p.actual / p.target) * 100), 100) : 0;
    const sPct =
      s.target > 0 ? Math.min(Math.round((s.actual / s.target) * 100), 100) : 0;
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:var(--g50);border-radius:10px;padding:14px">
        <div style="font-size:12px;font-weight:600;color:var(--g600);margin-bottom:8px"><i class="ti ti-plant"></i> উৎপাদন</div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="flex:1">
            <div style="height:12px;background:var(--gr100);border-radius:6px;overflow:hidden;margin-bottom:6px">
              <div style="height:100%;width:${pPct}%;background:${pPct >= 100 ? "var(--g600)" : pPct >= 70 ? "var(--g400)" : pPct >= 40 ? "var(--a400)" : "var(--r400)"};border-radius:6px"></div>
            </div>
            <div style="font-size:11px;color:var(--tm)">লক্ষ্য: ${toBnNum(p.target)}টি | অর্জন: ${toBnNum(p.actual)}টি</div>
          </div>
          <div style="font-size:18px;font-weight:700;color:${pPct >= 100 ? "var(--g600)" : pPct >= 70 ? "var(--g400)" : pPct >= 40 ? "var(--a400)" : "var(--r400)"}">${toBn(pPct)}%</div>
        </div>
      </div>
      <div style="background:var(--t50);border-radius:10px;padding:14px">
        <div style="font-size:12px;font-weight:600;color:var(--t600);margin-bottom:8px"><i class="ti ti-coin"></i> বিক্রয়</div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="flex:1">
            <div style="height:12px;background:var(--gr100);border-radius:6px;overflow:hidden;margin-bottom:6px">
              <div style="height:100%;width:${sPct}%;background:${sPct >= 100 ? "var(--t600)" : sPct >= 70 ? "var(--t400)" : sPct >= 40 ? "var(--a400)" : "var(--r400)"};border-radius:6px"></div>
            </div>
            <div style="font-size:11px;color:var(--tm)">লক্ষ্য: ${toBnMoney(s.target)} | অর্জন: ${toBnMoney(s.actual)}</div>
          </div>
          <div style="font-size:18px;font-weight:700;color:${sPct >= 100 ? "var(--t600)" : sPct >= 70 ? "var(--t400)" : sPct >= 40 ? "var(--a400)" : "var(--r400)"}">${toBn(sPct)}%</div>
        </div>
      </div>
    </div>`;

    // Monthly targets table — annual row আলাদাভাবে দেখাই
    if (targets.length > 0) {
      html += `<div style="font-size:12px;font-weight:600;color:var(--tm);margin-bottom:8px">মাসভিত্তিক লক্ষ্যমাত্রা</div>
      <div class="tw"><table><thead><tr>
        <th>সময়কাল</th><th>ধরন</th><th>লক্ষ্য (পরিমাণ)</th><th>লক্ষ্য (৳)</th><th>মন্তব্য</th>
        ${ME.role === "admin" ? "<th>কার্যক্রম</th>" : ""}
      </tr></thead><tbody>`;
      targets.forEach((t) => {
        const isAnnual = t.target_month === 0;
        const periodLabel = isAnnual
          ? `<strong style="color:var(--g600)">🎯 অর্থবছর মোট ${toBn(t.target_year)}-${toBn(t.target_year + 1)}</strong>`
          : `${bnMonths2[t.target_month]} ${toBn(t.target_year)}`;
        html += `<tr ${isAnnual ? 'style="background:var(--g50)"' : ""}>
          <td>${periodLabel}</td>
          <td><span class="b ${t.target_type === "production" ? "bg" : "b-t"}">${t.target_type === "production" ? "উৎপাদন" : "বিক্রয়"}</span></td>
          <td>${toBnNum(t.target_quantity)}টি</td>
          <td>${toBnMoney(t.target_amount)}</td>
          <td style="color:var(--tm);font-size:12px">${t.notes || "—"}</td>
          ${
            ME.role === "admin"
              ? `<td><div style="display:flex;gap:4px">
            <button class="btn btns btne" onclick='openTargetModal(${JSON.stringify(t).replace(/'/g, "&#39;")})' title="সম্পাদনা"><i class="ti ti-edit"></i></button>
            <button class="btn btns btnr" onclick="deleteTarget(${t.id})" title="মুছুন"><i class="ti ti-trash"></i></button>
          </div></td>`
              : ""
          }
        </tr>`;
      });
      html += "</tbody></table></div>";
    } else {
      html += `<div style="text-align:center;padding:24px;color:var(--tm)">
        <div style="font-size:36px;margin-bottom:8px">🎯</div>
        <div>এই অর্থবছরে কোনো লক্ষ্যমাত্রা নির্ধারণ হয়নি</div>
        ${ME.role === "admin" ? '<div style="font-size:12px;margin-top:6px">উপরের "+ লক্ষ্যমাত্রা যোগ" বাটনে ক্লিক করুন</div>' : ""}
      </div>`;
    }

    if (res) res.innerHTML = html;
  } catch (e) {
    if (res) res.innerHTML = '<div class="lt">লোড সমস্যা</div>';
  }
}

// ===== BEST SELLING SEEDLINGS =====
async function lBestSelling() {
  try {
    const d = await api("/reports/best-selling");
    if (!d.success || !d.data.length) {
      document.getElementById("bestSellingList").innerHTML =
        '<div class="lt">বিক্রয় ডেটা নেই</div>';
      return;
    }
    const max = +d.data[0].total_sold || 1;
    document.getElementById("bestSellingList").innerHTML = `
    <div class="tw"><table><thead><tr><th>#</th><th>চারা</th><th>বিক্রিত</th><th>আয় (৳)</th><th>অর্ডার</th><th>বিক্রয় হার</th></tr></thead>
    <tbody>${d.data
      .map(
        (r, i) => `<tr>
      <td><strong style="color:${i < 3 ? "var(--g600)" : "var(--tm)"}">${toBn(i + 1)}</strong>${i === 0 ? " 🥇" : i === 1 ? " 🥈" : i === 2 ? " 🥉" : ""}</td>
      <td><strong>${r.name_bn}</strong>${r.variety ? `<br><span style="font-size:11px;color:var(--tm)">${r.variety}</span>` : ""}</td>
      <td><strong>${toBnNum(r.total_sold)}</strong>টি</td>
      <td>${toBnMoney(r.total_revenue)}</td>
      <td>${toBnNum(r.order_count)}টি</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="pb" style="flex:1;height:8px"><div class="pf" style="width:${Math.round((r.total_sold / max) * 100)}%;background:var(--g400)"></div></div><span style="font-size:11px;min-width:35px">${toBn(Math.round((r.total_sold / max) * 100))}%</span></div></td>
    </tr>`,
      )
      .join("")}</tbody></table></div>`;
  } catch (e) {
    document.getElementById("bestSellingList").innerHTML =
      '<div class="lt">লোড সমস্যা</div>';
  }
}

// ===== MONTHLY EXCEL DOWNLOAD =====
async function downloadMonthlyExcel() {
  const year =
    document.getElementById("repYear").value || new Date().getFullYear();
  try {
    toast("Excel তৈরি হচ্ছে...");
    const d = await api("/reports/monthly-summary?year=" + year);
    if (!d.success) return toast("ডেটা আনতে সমস্যা", 1);

    const wb = XLSX.utils.book_new();
    const bnMonthsFull = {
      Jan: "জানুয়ারি",
      Feb: "ফেব্রুয়ারি",
      Mar: "মার্চ",
      Apr: "এপ্রিল",
      May: "মে",
      Jun: "জুন",
      Jul: "জুলাই",
      Aug: "আগস্ট",
      Sep: "সেপ্টেম্বর",
      Oct: "অক্টোবর",
      Nov: "নভেম্বর",
      Dec: "ডিসেম্বর",
    };

    // বিক্রয় Sheet
    const salesData = [
      ["মাস", "চালান সংখ্যা", "মোট বিক্রয় (৳)", "মোট ছাড় (৳)", "নিট আয় (৳)"],
    ];
    let totalRev = 0,
      totalInv = 0;
    d.data.sales.forEach((r) => {
      const net = parseFloat(r.total_revenue) - parseFloat(r.total_discount);
      totalRev += net;
      totalInv += parseInt(r.total_invoices);
      salesData.push([
        bnMonthsFull[r.month_name] || r.month_name,
        r.total_invoices,
        parseFloat(r.total_revenue).toFixed(2),
        parseFloat(r.total_discount).toFixed(2),
        net.toFixed(2),
      ]);
    });
    salesData.push(["মোট", totalInv, "", "", totalRev.toFixed(2)]);
    const wsS = XLSX.utils.aoa_to_sheet(salesData);
    wsS["!cols"] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsS, "মাসিক বিক্রয়");

    // উৎপাদন Sheet
    const prodData = [["মাস", "মোট ব্যাচ", "মোট উৎপাদিত"]];
    d.data.production.forEach((r) =>
      prodData.push([
        bnMonthsFull[r.month_name] || r.month_name,
        r.total_batches,
        r.total_produced,
      ]),
    );
    const wsP = XLSX.utils.aoa_to_sheet(prodData);
    wsP["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsP, "মাসিক উৎপাদন");

    XLSX.writeFile(
      wb,
      `উদ্যানতত্ত্ববিদের_কার্যালয়_${year}_মাসিক_রিপোর্ট.xlsx`,
    );
    toast("Excel ডাউনলোড হচ্ছে ✅");
  } catch (e) {
    toast("সমস্যা হয়েছে", 1);
  }
}

async function downloadProductionExcel() {
  try {
    toast("Excel তৈরি হচ্ছে...");
    const d = await api("/production");
    if (!d.success) return toast("ডেটা আনতে সমস্যা", 1);
    const wb = XLSX.utils.book_new();
    const rows = [
      [
        "ব্যাচ ID",
        "চারা",
        "পদ্ধতি",
        "বপন/প্রচার তারিখ",
        "উৎপাদিত",
        "সফল",
        "ব্যর্থ",
        "সাফল্য %",
        "অবস্থা",
      ],
    ];
    d.data.forEach((b) =>
      rows.push([
        b.batch_code,
        b.seedling_bn,
        b.production_type,
        b.sowing_date || b.propagation_date || "",
        b.produced_quantity,
        b.success_quantity,
        b.failed_quantity,
        b.success_percent || b.germination_percent || 0,
        b.status,
      ]),
    );
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "উৎপাদন");
    XLSX.writeFile(wb, "উৎপাদন_রেজিস্টার.xlsx");
    toast("Excel ডাউনলোড হচ্ছে ✅");
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

async function testConn() {
  try {
    const d = await api("/");
    if (d.success) toast("সংযোগ সফল ✅ — " + d.message);
    else toast("সংযোগ ব্যর্থ", 1);
  } catch (e) {
    toast("সার্ভার সংযোগ ব্যর্থ। npm run dev চালু আছে?", 1);
  }
}

// Load saved settings on startup
(function () {
  const c = JSON.parse(localStorage.getItem("hc_cfg") || "{}");
  if (c.center_category)
    document.getElementById("cfgCenterCat").value = c.center_category;
  if (c.name_bn) document.getElementById("cfgNB").value = c.name_bn;
  if (c.name_en) document.getElementById("cfgNE").value = c.name_en;
  if (c.low_stock) document.getElementById("cfgLS").value = c.low_stock;
  if (c.currency) document.getElementById("cfgCur").value = c.currency;
  if (c.language) document.getElementById("cfgLng").value = c.language;
  // ✅ App load হলেই সংরক্ষিত নাম apply করুন
  if (c.name_bn || c.name_en) applySiteConfig(c);
})();

// ===== পাসওয়ার্ড পরিবর্তনের অনুরোধ =====
async function reqPwdChange() {
  const nw = document.getElementById("pwdNew").value;
  const con = document.getElementById("pwdCon").value;
  if (!nw || !con) return toast("সব তথ্য দিন", 1);
  if (nw !== con) return toast("পাসওয়ার্ড মিলছে না", 1);
  if (nw.length < 6) return toast("কমপক্ষে ৬ অক্ষর দিন", 1);
  try {
    const d = await api("/auth/request-password-change", {
      method: "POST",
      body: JSON.stringify({ new_password: nw }),
    });
    if (d.success) {
      const st = document.getElementById("reqStatus");
      if (st) {
        st.style.display = "block";
        st.style.background = "var(--g50)";
        st.style.color = "var(--g600)";
        st.innerHTML =
          '<i class="ti ti-check"></i> অনুরোধ পাঠানো হয়েছে! Admin অনুমোদন করলে পাসওয়ার্ড পরিবর্তন হবে।';
      }
      document.getElementById("pwdNew").value = "";
      document.getElementById("pwdCon").value = "";
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}
// ব্যবহারকারী সক্রিয়/নিষ্ক্রিয় toggle
async function toggleUser(id, name) {
  try {
    const d = await api("/users/" + id + "/toggle-active", { method: "POST" });
    if (d.success) {
      toast(d.message + " ✅");
      lUsr();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

async function approvePwd(id) {
  try {
    const d = await api("/users/" + id + "/approve-password", {
      method: "POST",
    });
    if (d.success) {
      toast("পাসওয়ার্ড অনুমোদিত ✅");
      lUsr();
      checkAdminNotif();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}
async function rejectPwd(id) {
  try {
    const d = await api("/users/" + id + "/reject-password", {
      method: "POST",
    });
    if (d.success) {
      toast("অনুরোধ প্রত্যাখ্যান করা হয়েছে");
      lUsr();
      checkAdminNotif();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

async function exportCSV(type) {
  const fns = {
    stock: "/stock",
    sale: "/sales",
    prod: "/production",
    dmg: "/damages",
  };
  if (!fns[type]) return;
  try {
    const d = await api(fns[type]);
    let rows = [],
      hdrs = [],
      data = [];
    if (type === "stock" && d.data) {
      hdrs = ["চারা", "মোট ইন", "মোট আউট", "স্টক", "মূল্য"];
      data = d.data.map((x) => [
        x.name_bn,
        x.total_in,
        x.total_out,
        x.current_stock,
        x.current_stock * x.unit_price,
      ]);
    } else if (type === "sale" && d.data) {
      hdrs = ["চালান", "গ্রাহক", "তারিখ", "মোট", "পরিশোধ"];
      data = d.data.map((x) => [
        x.invoice_no,
        x.customer_name,
        fmtDMY(x.sale_date),
        x.total_amount,
        x.payment_method,
      ]);
    } else if (type === "prod" && d.data) {
      hdrs = ["ব্যাচ", "চারা", "পদ্ধতি", "উৎপাদিত", "সফল", "সাফল্য%"];
      data = d.data.map((x) => [
        x.batch_code,
        x.seedling_bn,
        x.production_type,
        x.produced_quantity,
        x.success_quantity,
        x.success_percent || x.germination_percent || 0,
      ]);
    } else if (type === "dmg" && d.data) {
      hdrs = ["তারিখ", "চারা", "পরিমাণ", "কারণ"];
      data = d.data.map((x) => [
        fmtDMY(x.damage_date),
        x.name_bn,
        x.quantity,
        x.reason,
      ]);
    }
    const csv = [hdrs.join(","), ...data.map((r) => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
    a.download = type + "_report.csv";
    a.click();
    toast("CSV ডাউনলোড হচ্ছে ✅");
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

function printPage() {
  window.print();
}
function printRep(type) {
  exportCSV(type);
}

// ===== অন্যান্য আয় =====
const INC_TYPE = {
  agriculture: "কৃষি পণ্য",
  dormitory: "ডরমিটরি ভাড়া",
  other: "অন্যান্য",
};

async function lIncome() {
  try {
    const d = await api("/other-income");
    const rows = d.data || [];
    // Summary calculate
    const agri = rows
      .filter((x) => x.income_type === "agriculture")
      .reduce((s, x) => s + (+x.amount || 0), 0);
    const dorm = rows
      .filter((x) => x.income_type === "dormitory")
      .reduce((s, x) => s + (+x.amount || 0), 0);
    const oth = rows
      .filter((x) => x.income_type === "other")
      .reduce((s, x) => s + (+x.amount || 0), 0);
    const tot = agri + dorm + oth;
    const a = document.getElementById("incAgri");
    const b = document.getElementById("incDorm");
    const c = document.getElementById("incOther");
    const t = document.getElementById("incTotal");
    if (a) a.textContent = toBnMoney(agri);
    if (b) b.textContent = toBnMoney(dorm);
    if (c) c.textContent = toBnMoney(oth);
    if (t) t.textContent = toBnMoney(tot);
    const tbl = document.getElementById("incTbl");
    if (tbl)
      tbl.innerHTML = rows.length
        ? rows
            .map(
              (x) => `<tr>
      <td>${fmtDMY(x.income_date)}</td>
      <td><span class="b bg">${INC_TYPE[x.income_type] || x.income_type}</span></td>
      <td>${x.category || "-"}</td>
      <td><strong style="color:var(--g600)">৳${parseFloat(x.amount).toLocaleString()}</strong></td>
      <td style="font-size:12px;color:var(--tm)">${x.description || "-"}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btns btne" onclick='editIncome(${JSON.stringify(x).replace(/"/g, "&quot;")})' title="সম্পাদনা"><i class="ti ti-edit"></i></button>
        <button class="btn btns" style="background:var(--t50);color:var(--t600)" onclick='viewIncome(${JSON.stringify(x).replace(/"/g, "&quot;")})' title="বিস্তারিত"><i class="ti ti-eye"></i></button>
        <button class="btn btns btnr" onclick="delIncome(${x.id})" title="মুছুন"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`,
            )
            .join("")
        : '<tr><td colspan="6" class="lt">কোনো রেকর্ড নেই</td></tr>';
  } catch (e) {
    console.error("lIncome:", e);
  }
}

function editIncome(x) {
  document.getElementById("incId").value = x.id;
  document.getElementById("incModalTitle").textContent = "আয় সম্পাদনা";
  document.getElementById("incDate").value = x.income_date?.split("T")[0] || "";
  document.getElementById("incType").value = x.income_type || "agriculture";
  document.getElementById("incCat").value = x.category || "";
  document.getElementById("incAmt").value = x.amount || "";
  document.getElementById("incDesc").value = x.description || "";
  oM("mIncome");
}

function viewIncome(x) {
  document.getElementById("incViewContent").innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div><div style="font-size:11px;color:var(--tm)">তারিখ</div><div style="font-weight:600">${fmtDMY(x.income_date)}</div></div>
      <div><div style="font-size:11px;color:var(--tm)">আয়ের ধরন</div><div><span class="b bg">${INC_TYPE[x.income_type] || x.income_type}</span></div></div>
      <div><div style="font-size:11px;color:var(--tm)">বিভাগ</div><div style="font-weight:600">${x.category || "-"}</div></div>
      <div><div style="font-size:11px;color:var(--tm)">পরিমাণ</div><div style="font-weight:700;color:var(--g600);font-size:20px">৳${parseFloat(x.amount).toLocaleString()}</div></div>
    </div>
    ${x.description ? `<div style="background:var(--gr50);border-radius:8px;padding:12px;font-size:13px;color:var(--tm)">${x.description}</div>` : ""}
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btns" onclick="printIncome()"><i class="ti ti-printer"></i> প্রিন্ট</button>
      <button class="btn" onclick="cM('mIncView')">বন্ধ করুন</button>
    </div>`;
  oM("mIncView");
}

function printIncome() {
  const content = document.getElementById("incViewContent").innerHTML;
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>আয় বিবরণ</title>
    <style>body{font-family:sans-serif;padding:20px}.b{display:inline-block;padding:2px 8px;background:#eaf3de;border-radius:20px;font-size:12px}</style>
    </head><body>${content}<script>window.print();window.close();<\/script></body></html>`);
  w.document.close();
}

async function saveIncome() {
  const id = document.getElementById("incId")?.value;
  const b = {
    income_type: document.getElementById("incType").value,
    category: document.getElementById("incCat").value,
    amount: +document.getElementById("incAmt").value || 0,
    income_date: document.getElementById("incDate").value,
    description: document.getElementById("incDesc").value,
  };
  if (!b.income_date || !b.amount) return toast("তারিখ ও পরিমাণ দিন", 1);
  try {
    const url = id ? "/other-income/" + id : "/other-income";
    const method = id ? "PUT" : "POST";
    const d = await api(url, { method, body: JSON.stringify(b) });
    if (d.success) {
      toast(id ? "আপডেট হয়েছে ✅" : "আয় সংরক্ষিত ✅");
      cM("mIncome");
      document.getElementById("incId").value = "";
      document.getElementById("incModalTitle").textContent = "অন্যান্য আয় যোগ";
      await lIncome();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

async function delIncome(id) {
  showConfirm("এই আয়ের রেকর্ড মুছবেন?", async () => {
    const d = await api("/other-income/" + id, { method: "DELETE" });
    if (d.success) {
      toast("মুছে ফেলা হয়েছে ✅");
      await lIncome();
    } else toast("সমস্যা", 1);
  });
}

// নোটিশ বোর্ড — Dashboard-এ দেখাবে
async function lNotices() {
  try {
    const d = await api("/notices");
    console.log("Notices:", d); // debug
    if (!d.success || !d.data.length) return;

    const priColor = {
      urgent: "#f85149",
      important: "#e3b341",
      normal: "#58a6ff",
    };
    const priLabel = {
      urgent: "🔴 জরুরি",
      important: "🟡 গুরুত্বপূর্ণ",
      normal: "🔵 সাধারণ",
    };

    const html = `
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;color:var(--tm);margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <i class="ti ti-speakerphone" style="color:var(--a400)"></i> নোটিশ বোর্ড
        </div>
        ${d.data
          .map(
            (n) => `
          <div style="background:var(--gr50);border:1px solid var(--bd);border-left:4px solid ${priColor[n.priority] || priColor.normal};border-radius:10px;padding:14px 16px;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:11px;color:${priColor[n.priority] || priColor.normal};font-weight:600">${priLabel[n.priority] || priLabel.normal}</span>
              <span style="font-size:11px;color:var(--tm);margin-left:auto">${fmtDMY(n.created_at)}</span>
            </div>
            <div style="font-size:14px;font-weight:600;margin-bottom:4px">${n.title}</div>
            <div style="font-size:13px;color:var(--tp);line-height:1.7;white-space:pre-line">${n.content}</div>
          </div>`,
          )
          .join("")}
      </div>`;

    const target = document.getElementById("dSt");
    if (target && target.parentNode) {
      let noticeWrap = document.getElementById("dashNotices");
      if (!noticeWrap) {
        noticeWrap = document.createElement("div");
        noticeWrap.id = "dashNotices";
        target.parentNode.insertBefore(noticeWrap, target);
      }
      noticeWrap.innerHTML = html;
    }
  } catch (e) {
    console.error("lNotices error:", e);
  }
}
