// ============================================================
// EMPLOYEE — কর্মচারী তালিকা
// app.js এর পরে include করুন
// ============================================================

const EMP_DESIGNATIONS = [
    'উদ্যানতত্ত্ববিদ',
    'উপসহকারী উদ্যান কর্মকর্তা',
    'স্টোর কিপার',
    'উচ্চমান সহকারী কাম হিসাবরক্ষক',
    'অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',
    'কুক',
    'ড্রাইভার',
    'ফার্মলেবার',
    'এমএলএসএস',
    'গার্ড'
];

const DESIG_OPTIONS = EMP_DESIGNATIONS.map(d => `<option value="${d}">${d}</option>`).join('');

let _empReady = false;

function injectEmpPage() {
    // Nav item — ব্যবহারকারী-এর পরে
    if (!document.getElementById('nav-emp')) {
        const usrNav = document.querySelector('.sb .ni[onclick*="usr"]');
        const ni = document.createElement('div');
        ni.className = 'ni';
        ni.id = 'nav-emp';
        ni.setAttribute('onclick', "go('emp', this)");
        ni.innerHTML = `<i class="ti ti-users" style="font-size:16px"></i> কর্মচারী তালিকা`;
        ni.style.display = 'flex';
        if (usrNav) usrNav.parentNode.insertBefore(ni, usrNav.nextSibling);
        else document.querySelector('.sb')?.appendChild(ni);
    }

    if (!document.getElementById('pg-emp')) {
        const pg = document.createElement('div');
        pg.className = 'pg';
        pg.id = 'pg-emp';
        pg.innerHTML = `
        <div>
          <!-- Summary cards -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px" id="empCards"></div>

          <!-- Table card -->
          <div class="card">
            <div style="padding:14px 16px;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div style="font-size:15px;font-weight:600">কর্মচারী তালিকা</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <select id="empDesigFilter" class="fc" style="min-height:36px;padding:5px 10px;font-size:13px;width:auto" onchange="lEmp()">
                  <option value="">সব পদ</option>
                  ${DESIG_OPTIONS}
                </select>
                <button class="btn btnp" onclick="openEmpModal()" id="addEmpBtn">
                  <i class="ti ti-plus"></i> নতুন কর্মচারী
                </button>
              </div>
            </div>
            <div class="tw">
              <table>
                <thead><tr>
                  <th>#</th>
                  <th>নাম</th>
                  <th>পদবি</th>
                  <th>কর্মচারী আইডি</th>
                  <th>যোগদান</th>
                  <th>মোবাইল</th>
                  <th>NID</th>
                  <th>অবস্থা</th>
                  <th>কার্যক্রম</th>
                </tr></thead>
                <tbody id="empTbl"><tr><td colspan="9" class="lt">লোড হচ্ছে...</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Add/Edit Modal -->
        <div class="mo" id="mEmp">
          <div class="md" style="max-width:560px">
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
              <div class="fg" style="grid-column:1/-1">
                <label>পদবি *</label>
                <select id="empDesig" class="fc">
                  <option value="">-- পদ নির্বাচন করুন --</option>
                  ${DESIG_OPTIONS}
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
              <div class="fg" style="grid-column:1/-1">
                <label>অবস্থা</label>
                <select id="empStatus" class="fc">
                  <option value="active">কর্মরত</option>
                  <option value="inactive">অবসর/বদলি</option>
                </select>
              </div>
              <div class="fg" style="grid-column:1/-1">
                <label>মন্তব্য</label>
                <textarea id="empNotes" class="fc" rows="2" placeholder="অতিরিক্ত তথ্য"></textarea>
              </div>
            </div>
            <input type="hidden" id="empEditId">
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

    if (typeof tls !== 'undefined') tls['emp'] = 'কর্মচারী তালিকা';
    if (typeof lrs !== 'undefined') lrs['emp'] = lEmp;
    _empReady = true;
}

// Poll
const _empTimer = setInterval(() => {
    const app = document.getElementById('app');
    if (!app || !app.classList.contains('active')) return;
    injectEmpPage();
    // role-based visibility
    const nav = document.getElementById('nav-emp');
    if (nav && typeof ME !== 'undefined') {
        const allowed = ['admin', 'manager'];
        nav.style.display = allowed.includes(ME.role) ? 'flex' : 'none';
    }
    if (_empReady) clearInterval(_empTimer);
}, 300);

// ===== Load =====
let empAllData = [];
async function lEmp() {
    try {
        const r = await fetch('/api/employees-info', {
            cache: 'no-store', headers: { Authorization: 'Bearer ' + TK }
        });
        const d = await r.json();
        empAllData = d.data || [];

        // Admin button visibility
        const addBtn = document.getElementById('addEmpBtn');
        if (addBtn) addBtn.style.display = (typeof ME !== 'undefined' && ME.role === 'admin') ? '' : 'none';

        // Summary cards
        renderEmpCards(empAllData);

        // Filter
        const filter = document.getElementById('empDesigFilter')?.value || '';
        const filtered = filter ? empAllData.filter(e => e.designation === filter) : empAllData;
        renderEmpTable(filtered);
    } catch(e) {
        document.getElementById('empTbl').innerHTML = '<tr><td colspan="9" class="lt">লোড সমস্যা</td></tr>';
    }
}

function renderEmpCards(data) {
    const el = document.getElementById('empCards'); if (!el) return;
    const total   = data.length;
    const active  = data.filter(e => e.status === 'active').length;
    const inactive= data.filter(e => e.status === 'inactive').length;
    el.innerHTML = `
      <div class="sc"><div class="si" style="background:var(--g50)"><i class="ti ti-users" style="color:var(--g600);font-size:18px"></i></div><div class="sl">মোট কর্মচারী</div><div class="sv">${toBnNum(total)}</div><div class="ss2">জন নিবন্ধিত</div></div>
      <div class="sc"><div class="si" style="background:var(--t50)"><i class="ti ti-user-check" style="color:var(--t600);font-size:18px"></i></div><div class="sl">কর্মরত</div><div class="sv" style="color:var(--g600)">${toBnNum(active)}</div><div class="ss2">জন সক্রিয়</div></div>
      <div class="sc"><div class="si" style="background:var(--a50)"><i class="ti ti-user-off" style="color:var(--a400);font-size:18px"></i></div><div class="sl">অবসর/বদলি</div><div class="sv" style="color:var(--a400)">${toBnNum(inactive)}</div><div class="ss2">জন</div></div>`;
}

function renderEmpTable(data) {
    const el = document.getElementById('empTbl'); if (!el) return;
    if (!data.length) { el.innerHTML = '<tr><td colspan="9" class="lt">কোনো কর্মচারী নেই</td></tr>'; return; }
    const isAdmin = typeof ME !== 'undefined' && ME.role === 'admin';
    el.innerHTML = data.map((e, i) => `<tr>
      <td style="color:var(--tm)">${toBnNum(i+1)}</td>
      <td><strong>${e.name_bn}</strong>${e.name_en ? `<br><span style="font-size:11px;color:var(--tm)">${e.name_en}</span>` : ''}</td>
      <td><span class="b bg" style="font-size:11px">${e.designation}</span></td>
      <td style="color:var(--tm)">${e.employee_id || '—'}</td>
      <td>${e.join_date ? fmtDMY(e.join_date) : '—'}</td>
      <td>${e.mobile || '—'}</td>
      <td style="color:var(--tm)">${e.nid || '—'}</td>
      <td>${e.status === 'active' ? '<span class="b bg">কর্মরত</span>' : '<span class="b ba">অবসর/বদলি</span>'}</td>
      <td><div style="display:flex;gap:4px">
        ${isAdmin ? `
        <button class="btn btns btne" onclick='editEmp(${JSON.stringify(e).replace(/"/g,"&quot;")})' title="সম্পাদনা"><i class="ti ti-edit"></i></button>
        <button class="btn btns btnr" onclick="delEmp(${e.id},'${e.name_bn}')" title="মুছুন"><i class="ti ti-trash"></i></button>` : '—'}
      </div></td>
    </tr>`).join('');
}

// ===== Modal =====
function openEmpModal() {
    document.getElementById('mEmpTitle').textContent = 'নতুন কর্মচারী';
    document.getElementById('empEditId').value = '';
    ['empNB','empNE','empId2','empNid','empMob','empAddr','empNotes'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('empDesig').value = '';
    document.getElementById('empJoin').value = '';
    document.getElementById('empStatus').value = 'active';
    document.getElementById('mEmp').classList.add('open');
}

function editEmp(e) {
    document.getElementById('mEmpTitle').textContent = 'কর্মচারী সম্পাদনা';
    document.getElementById('empEditId').value = e.id;
    document.getElementById('empNB').value    = e.name_bn || '';
    document.getElementById('empNE').value    = e.name_en || '';
    document.getElementById('empDesig').value = e.designation || '';
    document.getElementById('empId2').value   = e.employee_id || '';
    document.getElementById('empJoin').value  = e.join_date ? e.join_date.split('T')[0] : '';
    document.getElementById('empNid').value   = e.nid || '';
    document.getElementById('empMob').value   = e.mobile || '';
    document.getElementById('empAddr').value  = e.address || '';
    document.getElementById('empStatus').value= e.status || 'active';
    document.getElementById('empNotes').value = e.notes || '';
    document.getElementById('mEmp').classList.add('open');
}

async function saveEmp() {
    const id = document.getElementById('empEditId').value;
    const b = {
        name_bn:     document.getElementById('empNB').value.trim(),
        name_en:     document.getElementById('empNE').value.trim(),
        designation: document.getElementById('empDesig').value,
        employee_id: document.getElementById('empId2').value.trim(),
        join_date:   document.getElementById('empJoin').value,
        nid:         document.getElementById('empNid').value.trim(),
        mobile:      document.getElementById('empMob').value.trim(),
        address:     document.getElementById('empAddr').value.trim(),
        status:      document.getElementById('empStatus').value,
        notes:       document.getElementById('empNotes').value.trim(),
    };
    if (!b.name_bn) return toast('নাম দিন', 1);
    if (!b.designation) return toast('পদবি নির্বাচন করুন', 1);

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
            toast(id ? 'আপডেট হয়েছে ✅' : 'কর্মচারী যোগ হয়েছে ✅');
            document.getElementById('mEmp').classList.remove('open');
            lEmp();
        } else toast(d.message || 'সমস্যা', 1);
    } catch(e) { toast('সার্ভার সমস্যা', 1); }
}

async function delEmp(id, name) {
    if (typeof showConfirm === 'function') {
        showConfirm(`<div style="text-align:center;font-size:32px;margin-bottom:8px">🗑️</div><strong>"${name}"</strong> মুছে ফেলবেন?`, async () => {
            await _doDelEmp(id);
        });
    } else if (confirm(`"${name}" মুছে ফেলবেন?`)) {
        await _doDelEmp(id);
    }
}
async function _doDelEmp(id) {
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
