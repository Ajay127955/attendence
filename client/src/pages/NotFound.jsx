import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 p-6 dark:bg-ink-950">
      <div className="text-center">
        <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-ink-100 dark:bg-ink-800">
          <Compass size={28} aria-hidden />
        </span>
        <p className="font-mono text-sm text-ink-500 dark:text-ink-400">404</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-500 dark:text-ink-400">
          The page you were looking for doesn&apos;t exist or has moved.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
