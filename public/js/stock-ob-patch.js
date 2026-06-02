// ============================================================
// STOCK REGISTER — প্রারম্ভিক স্টক column patch
// app.js এর পরে include করুন
// ============================================================

// renderStkTable override
window.renderStkTable = function(data) {
    // thead-এ প্রারম্ভিক স্টক column যোগ করো
    const thead = document.querySelector('#pg-stk table thead tr');
    if (thead && !document.getElementById('stkObHeader')) {
        const th = document.createElement('th');
        th.id = 'stkObHeader';
        th.style.cssText = 'color:var(--b600)';
        th.textContent = 'প্রারম্ভিক স্টক';
        // "মোট ইন" এর পরে insert
        const ths = thead.querySelectorAll('th');
        if (ths.length >= 2) thead.insertBefore(th, ths[1].nextSibling);
        else thead.appendChild(th);
    }

    document.getElementById("sTblB").innerHTML = data.length
        ? data.map(s => `<tr>
            <td>
              <strong>${s.name_bn}</strong>
              ${s.variety ? `<br><span style="font-size:12px;color:var(--tm)">${s.variety}</span>` : ''}
            </td>
            <td style="color:var(--b600);font-weight:600">
              ${s.opening_balance > 0 ? toBnNum(s.opening_balance) + 'টি' : '<span style="color:var(--tm)">—</span>'}
            </td>
            <td style="color:var(--g600)">+${toBnNum(s.total_in)}</td>
            <td style="color:var(--c400)">-${toBnNum(s.total_sale || 0)}</td>
            <td style="color:var(--a400)">-${toBnNum(s.total_damage || 0)}</td>
            <td>
              <strong style="${s.is_low_stock ? 'color:var(--c400)' : ''}">
                ${toBnNum(s.current_stock)}
              </strong>
            </td>
            <td>${toBnMoney(s.current_stock * s.unit_price)}</td>
            <td>
              ${s.is_low_stock
                ? '<span class="b br">সংকটজনক</span>'
                : '<span class="b bg">ভালো</span>'}
            </td>
          </tr>`).join("")
        : '<tr><td colspan="8" class="lt">কোনো ফলাফল নেই</td></tr>';
};
