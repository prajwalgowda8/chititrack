/**
 * render.js — ChitTrack
 * All DOM rendering functions.
 * Reads from `state` (store.js) — never mutates it directly.
 * Uses sanitize() for all user-supplied strings to prevent XSS.
 */

'use strict';

/* ============================================================
   ADMIN PAGE
   ============================================================ */

function renderAdmin() {
  renderStats();
  renderMemberList();
  renderSchedule();
  _populateCurrentMonthSelect();
  document.getElementById('nav-month-badge').textContent =
    'Month ' + state.currentMonth;
}

function renderStats() {
  const collected = getTotalCollected();
  const pending   = getTotalPending();
  const ms        = getMonthStats(state.currentMonth);

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card gold">
      <div class="stat-label">Total Collected</div>
      <div class="stat-value" style="font-size:20px">${fmt(collected)}</div>
      <div class="stat-sub">Across all months</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">Pending (up to now)</div>
      <div class="stat-value" style="font-size:20px">${fmt(pending)}</div>
      <div class="stat-sub">Outstanding dues</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Members</div>
      <div class="stat-value">${state.members.length}</div>
      <div class="stat-sub">of ${CONFIG.MEMBER_COUNT_MAX} slots</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">This Month Paid</div>
      <div class="stat-value">${ms.paid}</div>
      <div class="stat-sub">${ms.unpaid} pending · Month ${state.currentMonth}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Months Completed</div>
      <div class="stat-value">${state.currentMonth - 1}</div>
      <div class="stat-sub">of ${CONFIG.MONTH_COUNT} total</div>
    </div>
  `;
}

function renderMemberList(filter = '') {
  const list = document.getElementById('memberList');
  const q    = filter.toLowerCase().trim();
  const members = state.members.filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.phone.includes(q)
  );

  if (!members.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">🔍</div>
        <div class="es-title">No members found</div>
      </div>`;
    return;
  }

  list.innerHTML = members.map(m => {
    const stats      = getMemberPaymentStats(m.id);
    const pct        = Math.round((stats.paid / stats.total) * 100);
    const isBorrower = Object.values(state.schedule).some(s => s.borrowerMemberId === m.id);
    const thisMoPaid = (state.payments[m.id] || {})[state.currentMonth]?.paid;
    const selected   = state._selectedMemberId === m.id ? 'selected' : '';

    return `
      <div class="member-item ${selected}"
           role="button" tabindex="0"
           aria-label="View ${sanitize(m.name)}"
           data-action="select-member"
           data-member-id="${m.id}">
        <div class="member-avatar" style="background:${avatarColor(m.id)}"
             aria-hidden="true">${sanitize(initials(m.name))}</div>
        <div class="member-info">
          <div class="member-name">${sanitize(m.name)}</div>
          <div class="member-meta">
            <span>Slot #${m.slotNo}</span>
            ${isBorrower ? '<span class="badge badge-gold">Borrower</span>' : ''}
            ${thisMoPaid
              ? '<span class="badge badge-green">✓ Paid</span>'
              : '<span class="badge badge-red">Due</span>'}
          </div>
          <div class="prog-bar-wrap mt-2">
            <div class="prog-bar-fill" style="width:${pct}%"></div>
          </div>
          <div style="font-size:10px;color:var(--slate);margin-top:2px">
            ${stats.paid}/${stats.total} months
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderMemberDetail(id) {
  const m = state.members.find(x => x.id === id);
  if (!m) return;

  const stats         = getMemberPaymentStats(id);
  const pct           = Math.round((stats.paid / stats.total) * 100);
  const borrowerMonths = Object.entries(state.schedule)
    .filter(([, s]) => s.borrowerMemberId === id)
    .map(([mo]) => 'Month ' + mo);

  const card = document.getElementById('memberDetailCard');
  card.innerHTML = `
    <div class="detail-header">
      <div class="detail-avatar" style="background:${avatarColor(id)}"
           aria-hidden="true">${sanitize(initials(m.name))}</div>
      <div style="flex:1">
        <div class="detail-name">${sanitize(m.name)}</div>
        <div class="detail-sub">
          <span>📞 ${sanitize(m.phone || '—')}</span>
          <span>✉ ${sanitize(m.email || '—')}</span>
          <span>Slot #${m.slotNo}</span>
          ${borrowerMonths.length
            ? `<span class="badge badge-gold">🏆 ${sanitize(borrowerMonths.join(', '))}</span>`
            : ''}
        </div>
        <div style="margin-top:8px;display:flex;gap:16px;flex-wrap:wrap">
          <div style="font-size:12px;color:var(--green);font-weight:600">
            ✓ Paid: ${stats.paid} months (${fmt(stats.paidAmount)})
          </div>
          <div style="font-size:12px;color:var(--red);font-weight:600">
            ⚠ Pending: ${stats.pending} months
          </div>
        </div>
        <div class="prog-bar-wrap mt-2" style="height:8px">
          <div class="prog-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <button class="btn btn-danger btn-sm"
              data-action="delete-member"
              data-member-id="${id}"
              aria-label="Delete ${sanitize(m.name)}">Delete</button>
    </div>
    <div style="padding:14px 20px 4px;font-size:11px;font-weight:700;
                color:var(--slate);text-transform:uppercase;letter-spacing:1px">
      Payment Grid — Click any cell to record payment
    </div>
    <div class="payment-grid" id="paymentGrid_${id}"></div>
  `;

  renderPaymentGrid(id);
}

function renderPaymentGrid(memberId) {
  const grid = document.getElementById('paymentGrid_' + memberId);
  if (!grid) return;

  const payments = state.payments[memberId] || {};

  grid.innerHTML = Array.from({ length: CONFIG.MONTH_COUNT }, (_, i) => {
    const month    = i + 1;
    const entry    = payments[month] || { paid: false, amount: SCHEDULE_DATA[month - 1][0], date: null, note: '' };
    const sch      = state.schedule[month];
    const isComm   = sch && sch.commission > 0;
    const isFuture = month > state.currentMonth;

    const cls        = isFuture ? 'future' : (isComm ? 'commission' : (entry.paid ? 'paid' : 'unpaid'));
    const statusText = isFuture ? 'Upcoming' : (isComm ? 'Commission' : (entry.paid ? 'Paid' : 'Unpaid'));
    const statusCls  = isFuture ? 'future' : (entry.paid ? 'paid' : 'unpaid');

    const clickAttr = isFuture
      ? ''
      : `data-action="open-payment" data-member-id="${memberId}" data-month="${month}"`;

    return `
      <div class="payment-cell ${cls}"
           role="${isFuture ? 'presentation' : 'button'}"
           tabindex="${isFuture ? '-1' : '0'}"
           aria-label="Month ${month} — ${statusText}"
           ${clickAttr}>
        <div class="pc-month">Month ${month} · ${fmtDate(sch?.date)}</div>
        <div class="pc-amount">${fmt(entry.amount || CONFIG.MONTHLY_AMOUNT)}</div>
        ${entry.note
          ? `<div class="pc-status" style="color:var(--gold)">${sanitize(entry.note)}</div>`
          : ''}
        <div class="pc-status ${statusCls}">
          ${statusText}${entry.date ? ' · ' + fmtDate(entry.date) : ''}
        </div>
      </div>`;
  }).join('');
}

/* ============================================================
   SCHEDULE TABLE
   ============================================================ */

function renderSchedule() {
  const tbody = document.getElementById('scheduleBody');
  let html = '';

  for (let m = 1; m <= CONFIG.MONTH_COUNT; m++) {
    const sch      = state.schedule[m];
    const ms       = getMonthStats(m);
    const pct      = state.members.length
      ? Math.round((ms.paid / state.members.length) * 100)
      : 0;
    const borrower = sch.borrowerMemberId
      ? state.members.find(x => x.id === sch.borrowerMemberId)
      : null;
    const isCurrent = m === state.currentMonth;
    const isPast    = m < state.currentMonth;

    html += `
      <tr class="${isCurrent ? 'current-month-row' : ''}">
        <td><span class="mono font-bold">${m}</span></td>
        <td>${fmtDate(sch.date)}</td>
        <td class="mono">${fmt(sch.depositAmount || CONFIG.MONTHLY_AMOUNT)}</td>
        <td class="mono">
          ${sch.cumulative != null
            ? fmt(sch.cumulative)
            : '<span style="color:var(--slate)">—</span>'}
        </td>
        <td><span class="badge badge-green">${ms.paid} paid</span></td>
        <td>
          <span class="${ms.unpaid > 0 ? 'badge badge-red' : 'badge badge-green'}">
            ${ms.unpaid} due
          </span>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="prog-bar-wrap" style="width:80px;height:5px;display:inline-block">
              <div class="prog-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="text-xs font-mono">${pct}%</span>
          </div>
        </td>
        <td>
          ${borrower
            ? `<div style="display:flex;align-items:center;gap:6px">
                <div class="member-avatar"
                     style="width:22px;height:22px;font-size:9px;background:${avatarColor(borrower.id)}"
                     aria-hidden="true">${sanitize(initials(borrower.name))}</div>
                <span style="font-size:12px">${sanitize(borrower.name)}</span>
               </div>`
            : '<span class="text-xs text-slate">Not assigned</span>'}
        </td>
        <td>
          <div style="display:flex;gap:4px">
            ${!isPast
              ? `<button class="btn btn-outline btn-sm"
                         data-action="open-borrower"
                         data-month="${m}">Assign</button>`
              : ''}
            <button class="btn btn-outline btn-sm"
                    data-action="bulk-pay"
                    data-month="${m}">Mark All</button>
          </div>
        </td>
      </tr>`;
  }

  tbody.innerHTML = html;
}

function _populateCurrentMonthSelect() {
  const sel = document.getElementById('currentMonthSelect');
  sel.innerHTML = Array.from({ length: CONFIG.MONTH_COUNT }, (_, i) =>
    `<option value="${i + 1}" ${i + 1 === state.currentMonth ? 'selected' : ''}>
      Month ${i + 1} — ${fmtDate(DATES[i])}
    </option>`
  ).join('');
}

/* ============================================================
   USER PAGE
   ============================================================ */

function renderUserPage() {
  const wrap = document.getElementById('userSelectWrap');

  wrap.innerHTML = state.members.map(m => {
    const stats  = getMemberPaymentStats(m.id);
    const thisMo = (state.payments[m.id] || {})[state.currentMonth];
    const active = state._selectedUserId === m.id ? 'active' : '';

    return `
      <div class="user-card-pick ${active}"
           role="button" tabindex="0"
           aria-label="View ${sanitize(m.name)}"
           data-action="select-user"
           data-member-id="${m.id}">
        <div class="uc-avatar" style="background:${avatarColor(m.id)}"
             aria-hidden="true">${sanitize(initials(m.name))}</div>
        <div class="uc-name">${sanitize(m.name)}</div>
        <div class="uc-status">${stats.paid}/${stats.total} paid</div>
        <div class="mt-2">
          ${thisMo?.paid
            ? '<span class="badge badge-green">✓ This month</span>'
            : '<span class="badge badge-red">Due now</span>'}
        </div>
      </div>`;
  }).join('');

  if (state._selectedUserId) renderUserDetail(state._selectedUserId);
}

function renderUserDetail(id) {
  const m = state.members.find(x => x.id === id);
  if (!m) return;

  const stats         = getMemberPaymentStats(id);
  const pct           = Math.round((stats.paid / stats.total) * 100);
  const payments      = state.payments[id] || {};
  const borrowerMonths = Object.entries(state.schedule)
    .filter(([, s]) => s.borrowerMemberId === id)
    .map(([mo, s]) => ({ month: parseInt(mo, 10), amount: s.potAmount, date: s.date }));

  const paymentRows = Array.from({ length: CONFIG.MONTH_COUNT }, (_, i) => {
    const month          = i + 1;
    const entry          = payments[month] || { paid: false, amount: SCHEDULE_DATA[month - 1][0], date: null, note: '' };
    const sch            = state.schedule[month];
    const isFuture       = month > state.currentMonth;
    const fixedCumulative = SCHEDULE_DATA[month - 1][1];

    return `
      <div class="payment-row" ${isFuture ? 'style="opacity:0.5"' : ''}>
        <div class="pr-sl">${month}</div>
        <div class="pr-month">${fmtDate(sch?.date || '')}</div>
        <div class="pr-amount">${fmt(entry.amount || SCHEDULE_DATA[month - 1][0])}</div>
        ${sch?.commission
          ? `<div class="pr-note">Commission: ${fmt(sch.commission)}</div>`
          : '<div class="pr-note"></div>'}
        <div class="pr-cumulative">
          ${fixedCumulative != null ? fmt(fixedCumulative) : '—'}
        </div>
        <div class="pr-date">
          ${entry.date
            ? fmtDate(entry.date)
            : isFuture
              ? 'Upcoming'
              : '<span style="color:var(--red)">Not paid</span>'}
        </div>
        ${!isFuture
          ? `<span class="badge ${entry.paid ? 'badge-green' : 'badge-red'}">
               ${entry.paid ? '✓ Paid' : 'Due'}
             </span>`
          : '<span class="badge" style="background:var(--bg);color:var(--slate)">—</span>'}
      </div>`;
  }).join('');

  document.getElementById('userDetailSection').innerHTML = `
    <div class="user-detail-card">
      <div class="udc-banner"><div class="udc-banner-pattern"></div></div>
      <div class="udc-profile">
        <div class="udc-avatar" style="background:${avatarColor(id)}"
             aria-hidden="true">${sanitize(initials(m.name))}</div>
        <div class="udc-info">
          <div class="udc-name">${sanitize(m.name)}</div>
          <div class="udc-meta">
            Slot #${m.slotNo} · ${sanitize(m.phone || '—')} · ${sanitize(m.email || '—')}
          </div>
        </div>
      </div>

      <div class="udc-stats">
        <div class="udc-stat">
          <div class="udc-stat-val" style="color:var(--green)">${stats.paid}</div>
          <div class="udc-stat-lbl">Months Paid</div>
        </div>
        <div class="udc-stat">
          <div class="udc-stat-val" style="color:var(--red)">${stats.pending}</div>
          <div class="udc-stat-lbl">Pending</div>
        </div>
        <div class="udc-stat">
          <div class="udc-stat-val">${fmt(stats.paidAmount)}</div>
          <div class="udc-stat-lbl">Total Paid</div>
        </div>
        <div class="udc-stat">
          <div class="udc-stat-val">${pct}%</div>
          <div class="udc-stat-lbl">Completion</div>
        </div>
      </div>

      ${borrowerMonths.length ? `
        <div style="padding:16px 24px;background:var(--gold-pale);
                    border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;color:var(--gold);
                      text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">
            🏆 Chit Borrower
          </div>
          ${borrowerMonths.map(b => `
            <div style="font-size:13px;color:var(--ink)">
              Month ${b.month} · <strong>${fmt(b.amount)}</strong> received · ${fmtDate(b.date)}
            </div>`).join('')}
        </div>` : ''}

      <div class="udc-payments">
        <div class="udc-payments-title">Payment History</div>
        <div style="display:flex;gap:12px;align-items:center;
                    margin-bottom:12px;font-size:11px;color:var(--slate)">
          <span style="width:30px">Sl</span>
          <span style="width:90px">Date</span>
          <span style="flex:1">Amount</span>
          <span style="width:80px"></span>
          <span style="width:100px;text-align:right">Cumulative</span>
          <span style="width:90px;text-align:right">Paid On</span>
          <span style="width:50px">Status</span>
        </div>
        ${paymentRows}
      </div>
    </div>`;
}

/* ============================================================
   TOAST
   ============================================================ */

/**
 * Show a brief notification.
 * @param {string} msg
 * @param {'success'|'error'} type
 */
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
