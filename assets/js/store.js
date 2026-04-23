/**
 * store.js — ChitTrack
 * State management and localStorage persistence.
 * All mutations go through this module.
 */

'use strict';

/* ============================================================
   DEFAULT STATE BUILDERS
   ============================================================ */

function _buildDefaultPayments() {
  const payments = {};
  DEFAULT_MEMBERS.forEach(member => {
    payments[member.id] = {};
    for (let month = 1; month <= CONFIG.MONTH_COUNT; month++) {
      const [depositAmount] = SCHEDULE_DATA[month - 1];
      payments[member.id][month] = {
        paid:   false,
        amount: depositAmount,
        date:   null,
        note:   month === 2 ? 'Commission' : '',
      };
    }
  });
  return payments;
}

function _buildDefaultSchedule() {
  const schedule = {};
  for (let i = 1; i <= CONFIG.MONTH_COUNT; i++) {
    const [depositAmount, cumulative] = SCHEDULE_DATA[i - 1];
    schedule[i] = {
      date:             DATES[i - 1] || '',
      depositAmount,
      potAmount:        CONFIG.POT_AMOUNT,
      commission:       i === 2 ? CONFIG.COMMISSION : 0,
      borrowerMemberId: DEFAULT_MEMBERS[i - 1]?.id ?? null,
      cumulative,
    };
  }
  return schedule;
}

function _freshState() {
  return {
    members:      DEFAULT_MEMBERS.map(m => ({ ...m })),
    payments:     _buildDefaultPayments(),
    schedule:     _buildDefaultSchedule(),
    currentMonth: 1,
    nextId:       DEFAULT_MEMBERS.length + 1,
  };
}

/* ============================================================
   PERSISTENCE
   ============================================================ */

/**
 * Load state from localStorage, migrating schedule constants on every load
 * so dates / amounts always reflect the source-of-truth in config.js.
 * @returns {object|null}
 */
function _loadFromStorage() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    // Validate minimal shape
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.members))       return null;

    // Always sync schedule constants (dates, amounts, commission)
    for (let i = 1; i <= CONFIG.MONTH_COUNT; i++) {
      if (data.schedule && data.schedule[i]) {
        const [depositAmount, cumulative] = SCHEDULE_DATA[i - 1];
        data.schedule[i].date         = DATES[i - 1] || '';
        data.schedule[i].depositAmount = depositAmount;
        data.schedule[i].cumulative    = cumulative;
        data.schedule[i].commission    = i === 2 ? CONFIG.COMMISSION : 0;
      }
    }

    return data;
  } catch (_) {
    return null;
  }
}

/** Persist current state to localStorage. */
function saveData() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('ChitTrack: could not save to localStorage', e);
  }
}

/** Wipe localStorage and reset to defaults. */
function resetData() {
  localStorage.removeItem(CONFIG.STORAGE_KEY);
  Object.assign(state, _freshState());
  saveData();
}

/* ============================================================
   STATE
   ============================================================ */

const state = _loadFromStorage() || _freshState();

/* ============================================================
   COMPUTED QUERIES  (read-only, no side-effects)
   ============================================================ */

/**
 * Payment statistics for a single member.
 * @param {number} memberId
 * @returns {{ paid, total, paidAmount, dueAmount, pending }}
 */
function getMemberPaymentStats(memberId) {
  const p = state.payments[memberId] || {};
  let paid = 0, total = 0, paidAmount = 0, dueAmount = 0;

  for (let m = 1; m <= CONFIG.MONTH_COUNT; m++) {
    total++;
    const entry = p[m];
    if (entry && entry.paid) {
      paid++;
      paidAmount += entry.amount || CONFIG.MONTHLY_AMOUNT;
    } else {
      dueAmount += CONFIG.MONTHLY_AMOUNT;
    }
  }
  return { paid, total, paidAmount, dueAmount, pending: total - paid };
}

/**
 * Paid / unpaid counts for a given month across all members.
 * @param {number} month
 * @returns {{ paid, unpaid, total }}
 */
function getMonthStats(month) {
  let paid = 0, unpaid = 0;
  state.members.forEach(m => {
    const entry = (state.payments[m.id] || {})[month];
    if (entry && entry.paid) paid++;
    else unpaid++;
  });
  return { paid, unpaid, total: state.members.length };
}

/** Total amount collected across all members and all months. */
function getTotalCollected() {
  let total = 0;
  state.members.forEach(m => {
    const p = state.payments[m.id] || {};
    Object.values(p).forEach(entry => {
      if (entry.paid) total += entry.amount || CONFIG.MONTHLY_AMOUNT;
    });
  });
  return total;
}

/** Total outstanding dues up to and including the current month. */
function getTotalPending() {
  let total = 0;
  state.members.forEach(m => {
    const p = state.payments[m.id] || {};
    for (let mo = 1; mo <= state.currentMonth; mo++) {
      const entry = p[mo];
      if (!entry || !entry.paid) total += CONFIG.MONTHLY_AMOUNT;
    }
  });
  return total;
}

/* ============================================================
   MUTATIONS  (always call saveData() after mutating state)
   ============================================================ */

/**
 * Record or update a payment for a member/month.
 * @param {number} memberId
 * @param {number} month
 * @param {{ amount, date, note }} data
 */
function recordPayment(memberId, month, { amount, date, note }) {
  if (!state.payments[memberId]) state.payments[memberId] = {};
  state.payments[memberId][month] = {
    paid:   true,
    amount: amount || SCHEDULE_DATA[month - 1][0],
    date:   date   || todayISO(),
    note:   note   || '',
  };
  saveData();
}

/**
 * Mark all members as paid for a given month (skips already-paid).
 * @param {number} month
 */
function bulkMarkPaid(month) {
  const today = todayISO();
  state.members.forEach(m => {
    if (!state.payments[m.id]) state.payments[m.id] = {};
    if (!state.payments[m.id][month]?.paid) {
      state.payments[m.id][month] = {
        paid:   true,
        amount: SCHEDULE_DATA[month - 1][0],
        date:   today,
        note:   '',
      };
    }
  });
  saveData();
}

/**
 * Add a new member.
 * @param {{ name, phone, email, amount, slotNo, borrowerMonth, notes }} data
 * @returns {object} the new member object
 */
function addMember(data) {
  if (state.members.length >= CONFIG.MEMBER_COUNT_MAX) {
    throw new Error(`Maximum ${CONFIG.MEMBER_COUNT_MAX} members reached`);
  }

  const member = {
    id:            state.nextId++,
    name:          String(data.name).trim(),
    phone:         String(data.phone || '').trim(),
    email:         String(data.email || '').trim(),
    amount:        Number(data.amount) || CONFIG.MONTHLY_AMOUNT,
    slotNo:        Number(data.slotNo) || state.members.length + 1,
    borrowerMonth: Number(data.borrowerMonth) || null,
    notes:         String(data.notes || '').trim(),
  };

  state.members.push(member);

  // Initialise payment records
  state.payments[member.id] = {};
  for (let m = 1; m <= CONFIG.MONTH_COUNT; m++) {
    state.payments[member.id][m] = {
      paid: false, amount: member.amount, date: null, note: '',
    };
  }

  // Auto-assign borrower month if provided
  if (member.borrowerMonth && state.schedule[member.borrowerMonth]) {
    state.schedule[member.borrowerMonth].borrowerMemberId = member.id;
  }

  saveData();
  return member;
}

/**
 * Remove a member and all their payment data.
 * @param {number} id
 */
function deleteMember(id) {
  state.members = state.members.filter(m => m.id !== id);
  delete state.payments[id];
  Object.values(state.schedule).forEach(s => {
    if (s.borrowerMemberId === id) s.borrowerMemberId = null;
  });
  saveData();
}

/**
 * Assign a borrower to a month.
 * @param {number} month
 * @param {{ memberId, potAmount, commission }} data
 */
function assignBorrower(month, { memberId, potAmount, commission }) {
  state.schedule[month].borrowerMemberId = memberId || null;
  state.schedule[month].potAmount        = Number(potAmount)   || CONFIG.POT_AMOUNT;
  state.schedule[month].commission       = Number(commission)  || 0;
  saveData();
}

/**
 * Update the active month.
 * @param {number} month
 */
function setCurrentMonth(month) {
  state.currentMonth = clamp(Number(month), 1, CONFIG.MONTH_COUNT);
  saveData();
}
