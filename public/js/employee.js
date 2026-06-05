// ============================================================
// EMPLOYEE — জনবল তালিকা
// ============================================================

// তিনটি ক্যাটাগরির মঞ্জুরিকৃত পদ
const SANCTIONED_BY_CATEGORY = {
    'A': [
        { designation: 'উপপরিচালক',                                  sanctioned: 1 },
        { designation: 'উদ্যানতত্ত্ববিদ',                            sanctioned: 1 },
        { designation: 'উপসহকারী উদ্যান কর্মকর্তা',                 sanctioned: 4 },
        { designation: 'স্টোর কিপার',                                sanctioned: 1 },
        { designation: 'উচ্চমান সহকারী কাম হিসাবরক্ষক',            sanctioned: 1 },
        { designation: 'অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',  sanctioned: 1 },
        { designation: 'কুক',                                         sanctioned: 1 },
        { designation: 'ড্রাইভার',                                    sanctioned: 1 },
        { designation: 'ট্রাক্টর/পাওয়ার টিলার ড্রাইভার',           sanctioned: 1 },
        { designation: 'ফার্মলেবার',                                  sanctioned: 16 },
        { designation: 'এমএলএসএস',                                   sanctioned: 1 },
        { designation: 'গার্ড',                                       sanctioned: 4 },
    ],
    'B': [
        { designation: 'উদ্যানতত্ত্ববিদ',                            sanctioned: 1 },
        { designation: 'উপসহকারী উদ্যান কর্মকর্তা',                 sanctioned: 3 },
        { designation: 'স্টোর কিপার',                                sanctioned: 1 },
        { designation: 'উচ্চমান সহকারী কাম হিসাবরক্ষক',            sanctioned: 1 },
        { designation: 'অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',  sanctioned: 1 },
        { designation: 'কুক',                                         sanctioned: 1 },
        { designation: 'ড্রাইভার',                                    sanctioned: 1 },
        { designation: 'ফার্মলেবার',                                  sanctioned: 8 },
        { designation: 'এমএলএসএস',                                   sanctioned: 1 },
        { designation: 'গার্ড',                                       sanctioned: 3 },
    ],
    'C': [
        { designation: 'নার্সারি তত্ত্বাবধায়ক',                     sanctioned: 1 },
        { designation: 'উপসহকারী উদ্যান কর্মকর্তা',                 sanctioned: 2 },
        { designation: 'অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',  sanctioned: 1 },
        { designation: 'ফার্মলেবার',                                  sanctioned: 5 },
        { designation: 'এমএলএসএস',                                   sanctioned: 1 },
        { designation: 'গার্ড',                                       sanctioned: 2 },
    ],
};

// বর্তমান ক্যাটাগরি settings থেকে নাও
function getCenterCategory() {
    const cfg = JSON.parse(localStorage.getItem('hc_cfg') || '{}');
    return cfg.center_category || 'B'; // default B
}

function getSanctionedPosts() {
    return SANCTIONED_BY_CATEGORY[getCenterCategory()] || SANCTIONED_BY_CATEGORY['B'];
}

function getDesigOptions() {
    return getSanctionedPosts().map(p => `<option value="${p.designation}">${p.designation}</option>`).join('');
}

const TEMP_DESIG_OPTIONS = `<option value="সাময়িক শ্রমিক">সাময়িক শ্রমিক</option>`;

let _empReady = false;

function injectEmpPage() {
    if (!document.getElementById('nav-emp')) {
        const usrNav = document.querySelector('.sb .ni[onclick*="usr"]');
        const ni = document.createElement('div');
        ni.className = 'ni'; ni.id = 'nav-emp';
        ni.setAttribute('onclick', "go('emp', this)");
        ni.innerHTML = `<i class="ti ti-users" style="font-size:16px"></i> জনবল তালিকা`;
        if (usrNav) usrNav.parentNode.insertBefore(ni, usrNav.nextSibling);
        else document.querySelector('.sb')?.appendChild(ni);
    }

    if (!document.getElementById('pg-emp')) {
        const pg = document.createElement('div');
        pg.className = 'pg'; pg.id = 'pg-emp';
        pg.innerHTML = `
        <div>
          <!-- Summary cards -->
          <div id="empCards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px"></div>

          <!-- ===== স্থায়ী জনবল ===== -->
          <div class="card" style="margin-bottom:20px">
            <div style="padding:14px 16px;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div>
                <div style="font-size:15px;font-weight:600">স্থায়ী জনবল</div>
                <div style="font-size:12px;color:var(--tm)">মঞ্জুরিকৃত পদের বিপরীতে কর্মরত</div>
              </div>
              <button class="btn btnp" onclick="openEmpModal('permanent')" id="addPermBtn">
                <i class="ti ti-plus"></i> স্থায়ী কর্মচারী যোগ
              </button>
            </div>

            <!-- Post summary -->
            <div id="postSummary" style="padding:14px 16px;border-bottom:1px solid var(--bd)"></div>

            <!-- Staff table -->
            <div class="tw">
              <table>
                <thead><tr>
                  <th>#</th><th>নাম</th><th>পদবি</th><th>কর্মচারী আইডি</th>
                  <th>যোগদান</th><th>মোবাইল</th><th>NID</th><th>অবস্থা</th><th>কার্যক্রম</th>
                </tr></thead>
                <tbody id="empPermTbl"><tr><td colspan="9" class="lt">লোড হচ্ছে...</td></tr></tbody>
              </table>
            </div>
          </div>

          <!-- ===== সাময়িক শ্রমিক ===== -->
          <div class="card">
            <div style="padding:14px 16px;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div>
                <div style="font-size:15px;font-weight:600">সাময়িক শ্রমিক</div>
                <div style="font-size:12px;color:var(--tm)">নির্ধারিত পদ নেই</div>
              </div>
              <button class="btn btnp" onclick="openEmpModal('temporary')" id="addTempBtn">
                <i class="ti ti-plus"></i> শ্রমিক যোগ
              </button>
            </div>
            <div class="tw">
              <table>
                <thead><tr>
                  <th>#</th><th>নাম</th><th>শ্রমিকের ধরন</th><th>যোগদান</th><th>মোবাইল</th><th>NID</th><th>ঠিকানা</th><th>অবস্থা</th><th>কার্যক্রম</th>
                </tr></thead>
                <tbody id="empTempTbl"><tr><td colspan="9" class="lt">লোড হচ্ছে...</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ===== Modal ===== -->
        <div class="mo" id="mEmp">
          <div class="md" style="max-width:540px">
            <div class="mh">
              <h3 id="mEmpTitle">নতুন কর্মচারী</h3>
              <button class="mx" onclick="cM('mEmp')"><i class="ti ti-x"></i></button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="fg" style="grid-column:1/-1">
                <label>নাম (বাংলা) *</label>
                <input id="empNB" class="fc" placeholder="পূর্ণ নাম বাংলায়">
              </div>
              <div class="fg" style="grid-column:1/-1">
                <label>নাম (ইংরেজি)</label>
                <input id="empNE" class="fc" placeholder="Full name in English">
              </div>
              <div class="fg" style="grid-column:1/-1" id="empDesigBox">
                <label>পদবি *</label>
                <select id="empDesig" class="fc">
                  <option value="">-- পদ নির্বাচন করুন --</option>
                </select>
              </div>
              <div class="fg">
                <label>কর্মচারী আইডি</label>
                <input id="empId2" class="fc" placeholder="যেমন: HC-001">
              </div>
              <div class="fg">
                <label>যোগদানের তারিখ</label>
                <input id="empJoin" class="fc" type="date">
              </div>
              <div class="fg">
                <label>NID নম্বর</label>
                <input id="empNid" class="fc" placeholder="জাতীয় পরিচয়পত্র নম্বর">
              </div>
              <div class="fg">
                <label>মোবাইল</label>
                <input id="empMob" class="fc" placeholder="01XXXXXXXXX">
              </div>
              <div class="fg" style="grid-column:1/-1">
                <label>ঠিকানা</label>
                <textarea id="empAddr" class="fc" rows="2" placeholder="স্থায়ী ঠিকানা"></textarea>
              </div>
              <div class="fg" id="empWorkerTypeBox">
                <label>শ্রমিকের ধরন</label>
                <select id="empWorkerType" class="fc">
                  <option value="নিয়মিত">নিয়মিত শ্রমিক</option>
                  <option value="অনিয়মিত">অনিয়মিত শ্রমিক</option>
                </select>
              </div>
              <div class="fg">
                <label>অবস্থা</label>
                <select id="empStatus" class="fc">
                  <option value="active">কর্মরত</option>
                  <option value="inactive">অবসর / বদলি / ছাড়</option>
                </select>
              </div>
              <div class="fg" style="grid-column:1/-1">
                <label>মন্তব্য</label>
                <textarea id="empNotes" class="fc" rows="2" placeholder="অতিরিক্ত তথ্য"></textarea>
              </div>
            </div>
            <input type="hidden" id="empEditId">
            <input type="hidden" id="empStaffType">
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
              <button class="btn" onclick="cM('mEmp')">বাতিল</button>
              <button class="btn btnp" onclick="saveEmp()">
                <i class="ti ti-device-floppy"></i> সংরক্ষণ
              </button>
            </div>
          </div>
        </div>`;
        document.querySelector('.ct')?.appendChild(pg);
    }

    if (typeof tls !== 'undefined') tls['emp'] = 'জনবল তালিকা';
    if (typeof lrs !== 'undefined') lrs['emp'] = lEmp;
    _empReady = true;
}

const _empTimer = setInterval(() => {
    const app = document.getElementById('app');
    if (!app || !app.classList.contains('active')) return;
    injectEmpPage();
    const nav = document.getElementById('nav-emp');
    if (nav && typeof ME !== 'undefined') {
        nav.style.display = ['admin','manager'].includes(ME.role) ? 'flex' : 'none';
    }
    if (_empReady) clearInterval(_empTimer);
}, 300);

// ===== Load =====
async function lEmp() {
    try {
        const r = await fetch('/api/employees-info', {
            cache: 'no-store', headers: { Authorization: 'Bearer ' + TK }
        });
        const d = await r.json();
        const all  = d.data || [];
        const perm = all.filter(e => e.staff_type !== 'temporary');
        const temp = all.filter(e => e.staff_type === 'temporary');

        const isAdmin = typeof ME !== 'undefined' && ME.role === 'admin';
        const addPermBtn = document.getElementById('addPermBtn');
        const addTempBtn = document.getElementById('addTempBtn');
        if (addPermBtn) addPermBtn.style.display = isAdmin ? '' : 'none';
        if (addTempBtn) addTempBtn.style.display = isAdmin ? '' : 'none';

        renderEmpCards(perm, temp);
        renderPostSummary(perm);
        renderPermTable(perm, isAdmin);
        renderTempTable(temp, isAdmin);
    } catch(e) {
        console.error('lEmp error:', e);
    }
}

// ===== Summary Cards =====
function renderEmpCards(perm, temp) {
    const el = document.getElementById('empCards'); if (!el) return;
    const SANCTIONED_POSTS = getSanctionedPosts();
    const totalSanctioned = SANCTIONED_POSTS.reduce((s, p) => s + p.sanctioned, 0);
    const activePerm  = perm.filter(e => e.status === 'active').length;
    const vacancy     = totalSanctioned - activePerm;
    const activeTemp  = temp.filter(e => e.status === 'active').length;
    el.innerHTML = `
      <div class="sc"><div class="si" style="background:var(--g50)"><i class="ti ti-clipboard-list" style="color:var(--g600);font-size:18px"></i></div><div class="sl">মঞ্জুরিকৃত পদ</div><div class="sv">${toBnNum(totalSanctioned)}</div><div class="ss2">মোট স্থায়ী পদ</div></div>
      <div class="sc"><div class="si" style="background:var(--t50)"><i class="ti ti-user-check" style="color:var(--t600);font-size:18px"></i></div><div class="sl">কর্মরত (স্থায়ী)</div><div class="sv" style="color:var(--g600)">${toBnNum(activePerm)}</div><div class="ss2">জন</div></div>
      <div class="sc"><div class="si" style="background:var(--c50)"><i class="ti ti-user-minus" style="color:var(--c400);font-size:18px"></i></div><div class="sl">শূন্য পদ</div><div class="sv" style="color:${vacancy > 0 ? 'var(--c400)' : 'var(--g600)'}">${toBnNum(vacancy)}</div><div class="ss2">${vacancy > 0 ? '⚠️ পূরণ হয়নি' : '✅ পূর্ণ'}</div></div>
      <div class="sc"><div class="si" style="background:var(--a50)"><i class="ti ti-users" style="color:var(--a400);font-size:18px"></i></div><div class="sl">সাময়িক শ্রমিক</div><div class="sv" style="color:var(--a400)">${toBnNum(activeTemp)}</div><div class="ss2">জন কর্মরত</div></div>`;
}

// ===== Post Summary (স্থায়ী) =====
function renderPostSummary(permStaff) {
    const el = document.getElementById('postSummary'); if (!el) return;
    const SANCTIONED_POSTS = getSanctionedPosts();
    const cat = getCenterCategory();
    const rows = SANCTIONED_POSTS.map(post => {
        const actual  = permStaff.filter(e => e.designation === post.designation && e.status === 'active').length;
        const vacancy = post.sanctioned - actual;
        let badge, color;
        if (vacancy === 0)              { badge = '✅ পূর্ণ';        color = 'var(--g600)'; }
        else if (actual === 0)          { badge = '🔴 কেউ নেই';     color = 'var(--c400)'; }
        else                            { badge = `⚠️ ${toBnNum(vacancy)} শূন্য`; color = 'var(--a400)'; }
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)">
          <div style="font-size:13px">${post.designation}</div>
          <div style="display:flex;align-items:center;gap:16px;font-size:12px">
            <span style="color:var(--tm)">মঞ্জুরি: <strong>${toBnNum(post.sanctioned)}</strong></span>
            <span style="color:var(--g600)">কর্মরত: <strong>${toBnNum(actual)}</strong></span>
            <span style="color:${color};font-weight:600;min-width:90px;text-align:right">${badge}</span>
          </div>
        </div>`;
    });
    el.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--tm);margin-bottom:8px">পদভিত্তিক অবস্থান — <span style="color:var(--g600)">ক্যাটাগরী-${cat}</span></div>${rows.join('')}`;
}

// ===== স্থায়ী কর্মচারী Table =====
function renderPermTable(data, isAdmin) {
    const el = document.getElementById('empPermTbl'); if (!el) return;
    if (!data.length) { el.innerHTML = '<tr><td colspan="9" class="lt">কোনো স্থায়ী কর্মচারী নেই</td></tr>'; return; }
    el.innerHTML = data.map((e, i) => `<tr>
      <td style="color:var(--tm)">${toBnNum(i+1)}</td>
      <td><strong>${e.name_bn}</strong>${e.name_en ? `<br><span style="font-size:11px;color:var(--tm)">${e.name_en}</span>` : ''}</td>
      <td><span class="b bg" style="font-size:11px">${e.designation}</span></td>
      <td style="color:var(--tm)">${e.employee_id || '—'}</td>
      <td>${e.join_date ? fmtDMY(e.join_date) : '—'}</td>
      <td>${e.mobile || '—'}</td>
      <td style="color:var(--tm)">${e.nid || '—'}</td>
      <td>${e.status === 'active' ? '<span class="b bg">কর্মরত</span>' : '<span class="b ba">অবসর/বদলি</span>'}</td>
      <td><div style="display:flex;gap:4px">${isAdmin ? `
        <button class="btn btns btne" onclick='editEmp(${JSON.stringify(e).replace(/"/g,"&quot;")})' title="সম্পাদনা"><i class="ti ti-edit"></i></button>
        <button class="btn btns btnr" onclick="delEmp(${e.id},'${e.name_bn}')" title="মুছুন"><i class="ti ti-trash"></i></button>` : '—'}
      </div></td>
    </tr>`).join('');
}

// ===== সাময়িক শ্রমিক Table =====
function renderTempTable(data, isAdmin) {
    const el = document.getElementById('empTempTbl'); if (!el) return;
    if (!data.length) { el.innerHTML = '<tr><td colspan="8" class="lt">কোনো সাময়িক শ্রমিক নেই</td></tr>'; return; }
    el.innerHTML = data.map((e, i) => `<tr>
      <td style="color:var(--tm)">${toBnNum(i+1)}</td>
      <td><strong>${e.name_bn}</strong>${e.name_en ? `<br><span style="font-size:11px;color:var(--tm)">${e.name_en}</span>` : ''}</td>
      <td><span class="b ${e.worker_type === 'নিয়মিত' ? 'bg' : 'ba'}" style="font-size:11px">${e.worker_type || '—'}</span></td>
      <td>${e.join_date ? fmtDMY(e.join_date) : '—'}</td>
      <td>${e.mobile || '—'}</td>
      <td style="color:var(--tm)">${e.nid || '—'}</td>
      <td style="font-size:12px;color:var(--tm)">${e.address || '—'}</td>
      <td>${e.status === 'active' ? '<span class="b bg">কর্মরত</span>' : '<span class="b ba">ছাড়</span>'}</td>
      <td><div style="display:flex;gap:4px">${isAdmin ? `
        <button class="btn btns btne" onclick='editEmp(${JSON.stringify(e).replace(/"/g,"&quot;")})' title="সম্পাদনা"><i class="ti ti-edit"></i></button>
        <button class="btn btns btnr" onclick="delEmp(${e.id},'${e.name_bn}')" title="মুছুন"><i class="ti ti-trash"></i></button>` : '—'}
      </div></td>
    </tr>`).join('');
}

// ===== Modal =====
function openEmpModal(type = 'permanent') {
    document.getElementById('mEmpTitle').textContent = type === 'permanent' ? 'নতুন স্থায়ী কর্মচারী' : 'নতুন সাময়িক শ্রমিক';
    document.getElementById('empStaffType').value = type;
    document.getElementById('empEditId').value = '';
    ['empNB','empNE','empId2','empNid','empMob','empAddr','empNotes'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('empJoin').value = '';
    document.getElementById('empStatus').value = 'active';

    // পদবি dropdown — type অনুযায়ী
    const desigSel = document.getElementById('empDesig');
    const workerTypeBox = document.getElementById('empWorkerTypeBox');
    if (type === 'permanent') {
        desigSel.innerHTML = `<option value="">-- পদ নির্বাচন করুন --</option>${getDesigOptions()}`;
        document.getElementById('empDesigBox').style.display = '';
        document.getElementById('empId2').closest('.fg').style.display = '';
        if (workerTypeBox) workerTypeBox.style.display = 'none';
    } else {
        desigSel.innerHTML = TEMP_DESIG_OPTIONS;
        desigSel.value = 'সাময়িক শ্রমিক';
        document.getElementById('empDesigBox').style.display = 'none';
        document.getElementById('empId2').closest('.fg').style.display = 'none';
        if (workerTypeBox) workerTypeBox.style.display = '';
        document.getElementById('empWorkerType').value = 'নিয়মিত';
    }
    document.getElementById('mEmp').classList.add('open');
}

function editEmp(e) {
    const type = e.staff_type === 'temporary' ? 'temporary' : 'permanent';
    openEmpModal(type);
    document.getElementById('mEmpTitle').textContent = 'সম্পাদনা — ' + e.name_bn;
    document.getElementById('empEditId').value  = e.id;
    document.getElementById('empNB').value      = e.name_bn || '';
    document.getElementById('empNE').value      = e.name_en || '';
    document.getElementById('empDesig').value   = e.designation || '';
    document.getElementById('empId2').value     = e.employee_id || '';
    document.getElementById('empJoin').value    = e.join_date ? e.join_date.split('T')[0] : '';
    document.getElementById('empNid').value     = e.nid || '';
    document.getElementById('empMob').value     = e.mobile || '';
    document.getElementById('empAddr').value    = e.address || '';
    document.getElementById('empStatus').value  = e.status || 'active';
    document.getElementById('empNotes').value   = e.notes || '';
    if (type === 'temporary') {
        document.getElementById('empWorkerType').value = e.worker_type || 'নিয়মিত';
    }
}

async function saveEmp() {
    const id   = document.getElementById('empEditId').value;
    const type = document.getElementById('empStaffType').value;
    const b = {
        name_bn:     document.getElementById('empNB').value.trim(),
        name_en:     document.getElementById('empNE').value.trim(),
        designation: type === 'temporary' ? 'সাময়িক শ্রমিক' : document.getElementById('empDesig').value,
        staff_type:  type,
        worker_type: type === 'temporary' ? document.getElementById('empWorkerType').value : null,
        employee_id: document.getElementById('empId2').value.trim(),
        join_date:   document.getElementById('empJoin').value,
        nid:         document.getElementById('empNid').value.trim(),
        mobile:      document.getElementById('empMob').value.trim(),
        address:     document.getElementById('empAddr').value.trim(),
        status:      document.getElementById('empStatus').value,
        notes:       document.getElementById('empNotes').value.trim(),
    };
    if (!b.name_bn) return toast('নাম দিন', 1);
    if (type === 'permanent' && !b.designation) return toast('পদবি নির্বাচন করুন', 1);
    try {
        const url    = id ? '/api/employees-info/' + id : '/api/employees-info';
        const method = id ? 'PUT' : 'POST';
        const r = await fetch(url, {
            method, cache: 'no-store',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TK },
            body: JSON.stringify(b)
        });
        const d = await r.json();
        if (d.success) {
            toast(id ? 'আপডেট হয়েছে ✅' : 'যোগ হয়েছে ✅');
            document.getElementById('mEmp').classList.remove('open');
            lEmp();
        } else toast(d.message || 'সমস্যা', 1);
    } catch(e) { toast('সার্ভার সমস্যা', 1); }
}

async function delEmp(id, name) {
    showConfirm(`<div style="text-align:center;font-size:32px;margin-bottom:8px">🗑️</div><strong>"${name}"</strong> মুছে ফেলবেন?`,
        async () => {
            try {
                const r = await fetch('/api/employees-info/' + id, {
                    method: 'DELETE', cache: 'no-store',
                    headers: { Authorization: 'Bearer ' + TK }
                });
                const d = await r.json();
                if (d.success) { toast('মুছে ফেলা হয়েছে'); lEmp(); }
                else toast(d.message || 'সমস্যা', 1);
            } catch(e) { toast('সমস্যা', 1); }
        }
    );
}
