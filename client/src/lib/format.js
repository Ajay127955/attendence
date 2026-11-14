/** Small formatting + helper utilities shared across the UI. */

export const STATUSES = ['present', 'absent', 'late', 'excused'];

export const STATUS_META = {
  present: { label: 'Present', badge: 'border-success/30 bg-success/10 text-success' },
  absent: { label: 'Absent', badge: 'border-danger/30 bg-danger/10 text-danger' },
  late: { label: 'Late', badge: 'border-warn/30 bg-warn/10 text-warn' },
  excused: { label: 'Excused', badge: 'border-ink-400/40 bg-ink-400/10 text-ink-600 dark:text-ink-300' },
};

export function cn(...args) {
  return args.filter(Boolean).join(' ');
}

export function todayISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(value) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function percent(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '0%';
  return `${n.toFixed(1).replace(/\.0$/, '')}%`;
}

export function pctColor(value, threshold = 75) {
  const n = Number(value) || 0;
  if (n < threshold) return 'text-danger';
  if (n < threshold + 10) return 'text-warn';
  return 'text-success';
}

export function debounce(fn, delay = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/** Downloads a Blob (used for CSV/Excel/PDF exports). */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function monthLabel(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
