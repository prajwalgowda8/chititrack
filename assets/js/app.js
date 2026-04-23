/**
 * app.js — ChitTrack
 * Application bootstrap, event delegation, modal controllers, CSV export.
 * This is the only file that wires DOM events to store mutations + re-renders.
 */

'use strict';

/* ============================================================
   UI STATE  (transient — not persisted)
   ============================================================ */

// Attach transient UI state to the shared state object
// so render.js can read selected IDs without extra globals.
state._selectedMemberId = null;
state._selectedUserId   = null;

let _paymentContext      = null;   // { memberId, month }
let _borrowerMonthCtx   = null;   // month number

/* ============================================================
   PAGE SWITCHING
   ============================================================ */

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach((t, i) => {
    const isActive = (page === 'admin' && i === 0) || (page === 'user' && i === 1);
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });

  document.getElementById('page-' + page).classList.add('active');

  if (page === 'admin') renderAdmin();
  if (page === 'user')  renderUserPage();
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */

function openModal(id) {
  const el = document.getElementById(id);
  el.classList.add('open');
  // Focus first focusable element inside modal
  const first = el.querySelector('input, select, textarea, button:not(.modal-close)');
  if (first) first.focus();
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// Close modal on Escape key — separate listener, does not re-trigger action handler
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  }
});

/* ============================================================
   EVENT DELEGATION
   All click/keyboard events are handled here via data-action attributes.
   No inline onclick handlers in HTML.
   ============================================================ */

document.addEventListener('click', handleGlobalClick);

// Enter / Space activate focused interactive elements
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[data-action]');
  if (el) { e.preventDefault(); handleAction(el); }
});

function handleGlobalClick(e) {
  const el = e.target.closest('[data-action]');
  if (el) handleAction(el);
}

function handleAction(el) {
  const action   = el.dataset.action;
  const memberId = parseInt(el.dataset.memberId, 10) || null;
  const month    = parseInt(el.dataset.month, 10)    || null;

  switch (action) {
    case 'show-page':
      showPage(el.dataset.page);
      break;

    case 'select-member':
      state._selectedMemberId = memberId;
      renderMemberList(document.getElementById('memberSearch').value);
      renderMemberDetail(memberId);
      break;

    case 'delete-member':
      _confirmDeleteMember(memberId);
      break;

    case 'open-payment':
      _openPaymentModal(memberId, month);
      break;

    case 'open-borrower':
      _openBorrowerModal(month);
      break;

    case 'bulk-pay':
      _doBulkPay(month);
      break;

    case 'select-user':
      state._selectedUserId = memberId;
      renderUserPage();
      break;

    case 'save-member':
      _saveMember();
      break;

    case 'save-payment':
      _savePayment();
      break;

    case 'save-borrower':
      _saveBorrower();
      break;

    case 'export-csv':
      _exportCSV();
      break;

    case 'open-add-member':
      openModal('addMemberModal');
      break;

    case 'close-modal':
      closeModal(el.dataset.modal);
      break;

    case 'set-current-month':
      // handled by <select> change event below
      break;
  }
}

/* ============================================================
   MEMBER LIST SEARCH
   ============================================================ */

document.getElementById('memberSearch').addEventListener('input', function () {
  renderMemberList(this.value);
});

/* ============================================================
   CURRENT MONTH SELECT
   ============================================================ */

document.getElementById('currentMonthSelect').addEventListener('change', function () {
  setCurrentMonth(this.value);
  renderAdmin();
});

/* ============================================================
   PAYMENT MODAL
   ============================================================ */

function _openPaymentModal(memberId, month) {
  _paymentContext = { memberId, month };
  const m     = state.members.find(x => x.id === memberId);
  const entry = (state.payments[memberId] || {})[month] || {};

  document.getElementById('paymentModalTitle').textContent =
    `Payment — ${m?.name ?? ''} — Month ${month}`;
  document.getElementById('payDate').value   = entry.date   || todayISO();
  document.getElementById('payAmount').value = entry.amount || SCHEDULE_DATA[month - 1][0];
  document.getElementById('payNote').value   = entry.note   || '';

  openModal('paymentModal');
}

function _savePayment() {
  if (!_paymentContext) return;
  const { memberId, month } = _paymentContext;

  const amount = parseInt(document.getElementById('payAmount').value, 10);
  const date   = document.getElementById('payDate').value;
  const note   = document.getElementById('payNote').value.trim();

  if (!date) { showToast('Please select a payment date', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

  recordPayment(memberId, month, { amount, date, note });

  closeModal('paymentModal');
  showToast('Payment recorded');
  renderAdmin();
  if (state._selectedMemberId === memberId) renderPaymentGrid(memberId);
  _paymentContext = null;
}

/* ============================================================
   BORROWER MODAL
   ============================================================ */

function _openBorrowerModal(month) {
  _borrowerMonthCtx = month;
  document.getElementById('borrowerModalTitle').textContent =
    `Assign Borrower — Month ${month}`;

  const sel     = document.getElementById('borrowerSelect');
  const current = state.schedule[month]?.borrowerMemberId;

  sel.innerHTML = `<option value="">— Not assigned —</option>` +
    state.members.map(m =>
      `<option value="${m.id}" ${m.id === current ? 'selected' : ''}>
        ${sanitize(m.name)} (Slot #${m.slotNo})
      </option>`
    ).join('');

  document.getElementById('borrowerAmount').value     = state.schedule[month]?.potAmount    || CONFIG.POT_AMOUNT;
  document.getElementById('borrowerCommission').value = state.schedule[month]?.commission   || 0;

  openModal('borrowerModal');
}

function _saveBorrower() {
  const month      = _borrowerMonthCtx;
  const memberId   = parseInt(document.getElementById('borrowerSelect').value, 10) || null;
  const potAmount  = parseInt(document.getElementById('borrowerAmount').value, 10);
  const commission = parseInt(document.getElementById('borrowerCommission').value, 10);

  assignBorrower(month, { memberId, potAmount, commission });

  closeModal('borrowerModal');
  showToast('Borrower assigned');
  renderAdmin();
  _borrowerMonthCtx = null;
}

/* ============================================================
   BULK PAY
   ============================================================ */

function _doBulkPay(month) {
  if (!confirm(`Mark ALL members as PAID for Month ${month}?\nThis sets today's date for any unpaid members.`)) return;
  bulkMarkPaid(month);
  showToast(`All members marked paid for Month ${month}`);
  renderAdmin();
  if (state._selectedMemberId) renderPaymentGrid(state._selectedMemberId);
}

/* ============================================================
   ADD MEMBER MODAL
   ============================================================ */

function _saveMember() {
  const name = document.getElementById('mName').value.trim();
  if (!name) { showToast('Name is required', 'error'); return; }

  try {
    addMember({
      name,
      phone:         document.getElementById('mPhone').value.trim(),
      email:         document.getElementById('mEmail').value.trim(),
      amount:        parseInt(document.getElementById('mAmount').value, 10),
      slotNo:        parseInt(document.getElementById('mSlot').value, 10),
      borrowerMonth: parseInt(document.getElementById('mBorrowerMonth').value, 10),
      notes:         document.getElementById('mNotes').value.trim(),
    });
  } catch (err) {
    showToast(err.message, 'error');
    return;
  }

  closeModal('addMemberModal');
  showToast(`${name} added`);
  _resetAddMemberForm();
  renderAdmin();
}

function _resetAddMemberForm() {
  ['mName','mPhone','mEmail','mSlot','mBorrowerMonth','mNotes']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('mAmount').value = CONFIG.MONTHLY_AMOUNT;
}

/* ============================================================
   DELETE MEMBER
   ============================================================ */

function _confirmDeleteMember(id) {
  const m = state.members.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`Delete ${m.name}?\nThis will remove all their payment data.`)) return;

  deleteMember(id);

  if (state._selectedMemberId === id) {
    state._selectedMemberId = null;
    document.getElementById('memberDetailCard').innerHTML = `
      <div class="empty-state">
        <div class="es-icon">👆</div>
        <div class="es-title">Select a member</div>
        <div class="es-sub">Click on any member to view their payment details</div>
      </div>`;
  }

  showToast(`${m.name} removed`);
  renderAdmin();
}

/* ============================================================
   EXPORT CSV
   ============================================================ */

function _exportCSV() {
  const { MONTH_COUNT, MONTHLY_AMOUNT } = CONFIG;

  const headers = [
    'Member', 'Phone', 'Slot',
    ...Array.from({ length: MONTH_COUNT }, (_, i) => `Month ${i + 1}`),
    'Total Paid', 'Total Pending',
  ];

  const rows = state.members.map(m => {
    const p = state.payments[m.id] || {};
    const monthCols = Array.from({ length: MONTH_COUNT }, (_, i) => {
      const e = p[i + 1];
      return e?.paid ? (e.amount || MONTHLY_AMOUNT) : 0;
    });
    const totalPaid    = monthCols.reduce((a, b) => a + b, 0);
    const totalPending = MONTH_COUNT * MONTHLY_AMOUNT - totalPaid;
    return [m.name, m.phone, m.slotNo, ...monthCols, totalPaid, totalPending];
  });

  const csv  = [headers, ...rows].map(r => r.map(_csvCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `chittrack_report_${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported');
}

/** Wrap a CSV cell value in quotes if it contains commas or quotes. */
function _csvCell(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/* ============================================================
   INIT
   ============================================================ */

renderAdmin();
