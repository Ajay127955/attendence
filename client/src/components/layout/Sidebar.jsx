import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { navFor } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/format';

export function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-950">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12.5 9 17.5 20 6.5" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-tight">Attendance</span>
          <span className="block text-[11px] font-medium uppercase tracking-widest text-ink-500 dark:text-ink-400">
            Management
          </span>
        </span>
      )}
    </div>
  );
}

function NavItems({ role, onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
      {navFor(role).map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-950'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
            )
          }
        >
          <Icon size={18} className="shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Desktop sidebar. Hidden on small screens (bottom nav takes over). */
export default function Sidebar({ open, onClose }) {
  const { role } = useAuth();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-200 bg-white px-3 py-4 transition-transform duration-200 dark:border-ink-800 dark:bg-ink-900 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar"
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <Brand />
          <button type="button" className="btn-ghost p-1.5 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavItems role={role} onNavigate={onClose} />
        </div>
        <p className="px-3 pt-4 text-[11px] text-ink-400 dark:text-ink-500">v1.0.0 · AMS</p>
      </aside>
    </>
  );
}
