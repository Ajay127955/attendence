import { forwardRef, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, X } from 'lucide-react';
import { cn, STATUS_META, initials } from '../lib/format';

/* ─────────────────────────── Button ─────────────────────────── */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, ...props },
  ref
) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: '', lg: 'px-5 py-3 text-base' };
  return (
    <button
      ref={ref}
      className={cn(variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* ─────────────────────────── Form fields ─────────────────────────── */
export function Field({ label, htmlFor, error, hint, required, children, className }) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, required, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn('input', error && 'border-danger focus:border-danger focus:ring-danger', className)}
        {...props}
      />
    </Field>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, required, className, id, children, ...props },
  ref
) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <Field label={label} htmlFor={selectId} error={error} hint={hint} required={required}>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error)}
        className={cn('input appearance-none pr-9', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
        }}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, className, id, ...props }, ref) {
  const autoId = useId();
  const textId = id || autoId;
  return (
    <Field label={label} htmlFor={textId} error={error} hint={hint} required={required}>
      <textarea ref={ref} id={textId} rows={3} className={cn('input resize-y', className)} {...props} />
    </Field>
  );
});

/* ─────────────────────────── Card ─────────────────────────── */
export function Card({ className, children, ...props }) {
  return (
    <div className={cn('card p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─────────────────────────── Badge / Avatar ─────────────────────────── */
export function Badge({ children, className, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-ink-300 bg-ink-100 text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300',
    success: 'border-success/30 bg-success/10 text-success',
    danger: 'border-danger/30 bg-danger/10 text-danger',
    warn: 'border-warn/30 bg-warn/10 text-warn',
  };
  return <span className={cn('badge', tones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.excused;
  return <span className={cn('badge', meta.badge)}>{meta.label}</span>;
}

export function Avatar({ name, size = 36, className }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-ink-900 font-semibold text-white dark:bg-ink-100 dark:text-ink-950',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  );
}

/* ─────────────────────────── Feedback ─────────────────────────── */
export function Spinner({ className }) {
  return <Loader2 className={cn('animate-spin text-ink-500', className)} aria-label="Loading" />;
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c}>
                  <Skeleton className="h-4" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, action, icon: Icon = Inbox, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-300 px-6 py-14 text-center dark:border-ink-700', className)}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 dark:bg-ink-800">
        <Icon size={22} className="text-ink-500 dark:text-ink-400" aria-hidden />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-12 text-center">
      <AlertTriangle className="text-danger" aria-hidden />
      <p className="font-medium text-danger">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ─────────────────────────── Modal ─────────────────────────── */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the dialog for keyboard users.
    setTimeout(() => ref.current?.focus(), 20);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full animate-fade-in rounded-t-2xl border border-ink-200 bg-white shadow-pop dark:border-ink-800 dark:bg-ink-900 sm:rounded-2xl',
          sizes[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 p-5 dark:border-ink-800">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost -mr-2 -mt-1 p-2" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-200 p-4 dark:border-ink-800">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', loading, danger = true }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-600 dark:text-ink-300">{message}</p>
    </Modal>
  );
}

/* ─────────────────────────── Pagination ─────────────────────────── */
export function Pagination({ meta, onPageChange, className }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let i = start; i < start + 5 && i <= totalPages; i += 1) pages.push(i);

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-between gap-3 pt-4', className)}
      aria-label="Pagination"
    >
      <p className="text-sm text-ink-500 dark:text-ink-400">
        Showing <span className="font-medium text-ink-800 dark:text-ink-200">{from}</span>–
        <span className="font-medium text-ink-800 dark:text-ink-200">{to}</span> of{' '}
        <span className="font-medium text-ink-800 dark:text-ink-200">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-secondary px-2.5 py-2"
          onClick={() => onPageChange(page - 1)}
          disabled={!meta.hasPrevPage}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'min-w-9 rounded-xl px-3 py-2 text-sm font-semibold transition',
              p === page
                ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-950'
                : 'border border-ink-300 text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800'
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="btn-secondary px-2.5 py-2"
          onClick={() => onPageChange(page + 1)}
          disabled={!meta.hasNextPage}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

/* ─────────────────────────── Page header ─────────────────────────── */
export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
