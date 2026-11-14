import { cn } from '../lib/format';

/** Compact KPI tile used across dashboards. */
export default function StatCard({ label, value, hint, icon: Icon, tone = 'neutral', className }) {
  const tones = {
    neutral: 'text-ink-900 dark:text-ink-100',
    success: 'text-success',
    danger: 'text-danger',
    warn: 'text-warn',
  };
  return (
    <div className={cn('card p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</p>
        {Icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            <Icon size={17} aria-hidden />
          </span>
        )}
      </div>
      <p className={cn('mt-2 text-2xl font-bold tracking-tight sm:text-3xl', tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{hint}</p>}
    </div>
  );
}
