import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/**
 * Route guard: requires authentication and (optionally) one of `roles`.
 * Unauthenticated users are sent to /login with a `from` so they land back
 * where they were headed after signing in.
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50 dark:bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-7 w-7" />
          <p className="text-sm text-ink-500 dark:text-ink-400">Restoring your session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
