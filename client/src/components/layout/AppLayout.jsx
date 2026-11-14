import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';

/** Authenticated app shell: sidebar (desktop) + topbar + bottom nav (mobile). */
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
