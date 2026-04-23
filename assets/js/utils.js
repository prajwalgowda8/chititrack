/**
 * utils.js — ChitTrack
 * Pure helper functions — no DOM, no state.
 */

'use strict';

/**
 * Format a number as Indian Rupee string.
 * @param {number} n
 * @returns {string}  e.g. "₹3,25,000"
 */
function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

/**
 * Format a YYYY-MM-DD date string without timezone shift.
 * @param {string|null} d
 * @returns {string}  e.g. "5 Mar 26"
 */
function fmtDate(d) {
  if (!d) return '—';
  const parts = String(d).split('-');
  if (parts.length !== 3) return d;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  const day   = parseInt(parts[2], 10);
  const month = MONTHS[parseInt(parts[1], 10) - 1];
  const year  = parts[0].slice(2);
  return `${day} ${month} ${year}`;
}

/**
 * Return up to 2 uppercase initials from a full name.
 * @param {string} name
 * @returns {string}
 */
function initials(name) {
  return name
    .split(' ')
    .map(w => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Return a deterministic avatar background colour for a member id.
 * @param {number} id
 * @returns {string}  CSS colour value
 */
function avatarColor(id) {
  return AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length];
}

/**
 * Sanitise a string for safe insertion as text content (not innerHTML).
 * Use this before building any HTML that includes user-supplied data.
 * @param {string} str
 * @returns {string}
 */
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/**
 * Clamp a number between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Today's date as YYYY-MM-DD (local time, no UTC shift).
 * @returns {string}
 */
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
