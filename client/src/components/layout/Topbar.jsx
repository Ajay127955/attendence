import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Moon, Sun, User as UserIcon, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../ui';
import { cn, relativeTime } from '../../lib/format';

/** Small dropdown that closes on outside click / Escape. */
function Dropdown({ open, onClose, children, align = 'right', labelledBy }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      aria-labelledby={labelledBy}
      className={cn(
        'absolute z-40 mt-2 w-64 animate-fade-in overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop dark:border-ink-800 dark:bg-ink-900',
        align === 'right' ? 'right-0' : 'left-0'
      )}
    >
      {children}
    </div>
  );
}

export default function Topbar({ onMenu }) {
  const { user, role, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { connected, on } = useSocket();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Live activity feed from Socket.IO attendance events.
  useEffect(() => {
    const off = on('attendance:updated', (payload) => {
      setNotifications((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            text:
              payload.action === 'bulk'
                ? `${payload.count} records marked for ${payload.date}`
                : `Attendance ${payload.action} · ${payload.date || ''}`,
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 8)
      );
    });
    return off;
  }, [on]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-ink-50/80 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-950/80 sm:px-6">
      <button type="button" className="btn-ghost -ml-2 p-2 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Live connection indicator */}
        <span
          className="hidden items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-500 dark:border-ink-800 dark:text-ink-400 sm:inline-flex"
          title={connected ? 'Real-time connected' : 'Real-time offline'}
        >
          {connected ? <Wifi size={13} className="text-success" /> : <WifiOff size={13} className="text-ink-400" />}
          {connected ? 'Live' : 'Offline'}
        </span>

        <button
          type="button"
          onClick={toggle}
          className="btn-ghost p-2"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="btn-ghost relative p-2"
            aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ''}`}
            aria-haspopup="true"
            aria-expanded={notifOpen}
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" aria-hidden />
            )}
          </button>
          <Dropdown open={notifOpen} onClose={() => setNotifOpen(false)}>
            <div className="border-b border-ink-200 px-4 py-3 text-sm font-semibold dark:border-ink-800">
              Activity
            </div>
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-500 dark:text-ink-400">
                No activity yet. Live updates appear here.
              </p>
            ) : (
              <ul className="max-h-72 divide-y divide-ink-100 overflow-y-auto dark:divide-ink-800">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-2.5">
                    <p className="text-sm">{n.text}</p>
                    <p className="text-xs text-ink-400">{relativeTime(n.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Dropdown>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-ink-100 dark:hover:bg-ink-800"
            aria-label="Account menu"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            id="account-menu-button"
          >
            <Avatar name={user?.name} size={32} />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold">{user?.name}</span>
              <span className="block text-[11px] capitalize text-ink-500 dark:text-ink-400">{role}</span>
            </span>
          </button>
          <Dropdown open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="account-menu-button">
            <div className="border-b border-ink-200 px-4 py-3 dark:border-ink-800">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-ink-500 dark:text-ink-400">{user?.email || user?.rollNo}</p>
            </div>
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              <UserIcon size={16} /> Profile &amp; password
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
            >
              <LogOut size={16} /> Sign out
            </button>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
