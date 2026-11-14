'use strict';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(customParseFormat);

/**
 * Attendance dates are always stored as UTC midnight so the compound unique
 * index (date, student, subject) is stable regardless of server timezone.
 */
function toDateOnly(input) {
  if (input === undefined || input === null || input === '') return null;
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  const d = dayjs.utc(String(input), ['YYYY-MM-DD', 'YYYY/MM/DD', 'DD-MM-YYYY'], true);
  if (d.isValid()) return new Date(Date.UTC(d.year(), d.month(), d.date()));
  const fallback = dayjs.utc(input);
  if (!fallback.isValid()) return null;
  return new Date(Date.UTC(fallback.year(), fallback.month(), fallback.date()));
}

/** YYYY-MM-DD (UTC). */
function toDateKey(input) {
  const d = toDateOnly(input);
  return d ? dayjs.utc(d).format('YYYY-MM-DD') : null;
}

/** Inclusive list of date keys between two bounds. */
function dateRangeKeys(start, end) {
  const s = toDateOnly(start);
  const e = toDateOnly(end);
  if (!s || !e) return [];
  const keys = [];
  let cur = dayjs.utc(s);
  const last = dayjs.utc(e);
  while (cur.isBefore(last) || cur.isSame(last)) {
    keys.push(cur.format('YYYY-MM-DD'));
    cur = cur.add(1, 'day');
  }
  return keys;
}

/** Monday-based week start. */
function startOfWeek(input) {
  const d = dayjs.utc(input);
  const dow = (d.day() + 6) % 7; // 0 = Monday
  return d.subtract(dow, 'day').startOf('day').toDate();
}

module.exports = { dayjs, toDateOnly, toDateKey, dateRangeKeys, startOfWeek };
