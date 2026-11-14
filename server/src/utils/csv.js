'use strict';

/**
 * Serialises an array of plain objects to CSV (RFC 4180 compatible).
 * Used by the report exporter and the sample CSV download.
 */
function toCSV(rows, columns) {
  if (!rows || !rows.length) {
    const header = (columns || []).map((c) => c.header).join(',');
    return header ? `${header}\n` : '';
  }

  const cols =
    columns ||
    Object.keys(rows[0]).map((k) => ({ key: k, header: k }));

  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = cols.map((c) => escape(c.header)).join(',');
  const body = rows
    .map((row) => cols.map((c) => escape(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(','))
    .join('\n');

  return `${header}\n${body}\n`;
}

module.exports = { toCSV };
