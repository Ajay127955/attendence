import { NavLink } from 'react-router-dom';
import { mobileNavFor } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/format';

/** Bottom navigation for phones — the primary way to move around on mobile. */
export default function BottomNav() {
  const { role } = useAuth();
  const items = mobileNavFor(role);
  if (!items.length) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-ink-800 dark:bg-ink-900/95 lg:hidden"
      aria-label="Bottom navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition',
                  isActive ? 'text-ink-900 dark:text-ink-100' : 'text-ink-500 dark:text-ink-500'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-9 w-14 place-items-center rounded-full transition',
                      isActive && 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-950'
                    )}
                  >
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
