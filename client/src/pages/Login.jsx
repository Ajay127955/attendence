import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Input } from '../components/ui';

const DEMO = [
  { role: 'Admin', id: 'admin@ams.dev', pw: 'Admin@12345' },
  { role: 'Teacher', id: 'priya.menon@ams.dev', pw: 'Teacher@12345' },
  { role: 'Student', id: 'S0001', pw: 'Student@12345' },
];

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  if (!loading && isAuthenticated) return <Navigate to={from} replace />;

  const validate = () => {
    const next = {};
    if (!form.identifier.trim()) next.identifier = 'Enter your email or roll number';
    if (!form.password) next.password = 'Enter your password';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const user = await login(form.identifier.trim(), form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not sign in');
      setErrors({ password: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (d) => {
    setForm({ identifier: d.id, password: d.pw });
    setErrors({});
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Brand panel (desktop) ── */}
      <div className="relative hidden flex-col justify-between bg-ink-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-ink-950">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12.5 9 17.5 20 6.5" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="font-bold tracking-tight">Attendance Management System</p>
            <p className="text-xs uppercase tracking-widest text-ink-400">Real-time attendance platform</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Attendance that updates as you mark it.
          </h1>
          <p className="mt-4 text-ink-300">
            Live dashboards, per-student percentages, class-wise analytics and one-click CSV, Excel and PDF reports —
            for admins, teachers and students.
          </p>
          <ul className="mt-8 space-y-2.5 text-sm text-ink-300">
            {[
              'Mark a whole class in seconds — on your phone',
              'Automatic low-attendance alerts below 75%',
              'Audit log of every change, with exports',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12.5 9 17.5 20 6.5" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-ink-500">© {new Date().getFullYear()} AMS · Built with React, Express &amp; MongoDB</p>
      </div>

      {/* ── Form panel ── */}
      <div className="relative flex items-center justify-center bg-ink-50 p-6 dark:bg-ink-950">
        <button
          type="button"
          onClick={toggle}
          className="btn-ghost absolute right-4 top-4 p-2"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-950">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12.5 9 17.5 20 6.5" />
              </svg>
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Use your email, or a student roll number.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
            <div className="relative">
              <Input
                label="Email or roll number"
                name="identifier"
                autoComplete="username"
                autoFocus
                placeholder="admin@ams.dev"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                error={errors.identifier}
              />
              <Mail size={16} className="pointer-events-none absolute right-3 top-[38px] text-ink-400" aria-hidden />
            </div>

            <div className="relative">
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-[32px] rounded-lg p-1.5 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <Link to="/forgot-password" className="text-sm font-medium underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={submitting}>
              <Lock size={16} /> Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-ink-300 p-4 dark:border-ink-700">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
              Demo accounts — tap to fill
            </p>
            <div className="grid gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => fillDemo(d)}
                  className="flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2 text-left text-xs transition hover:bg-ink-100 dark:border-ink-800 dark:hover:bg-ink-800"
                >
                  <span className="font-semibold">{d.role}</span>
                  <span className="font-mono text-ink-500 dark:text-ink-400">{d.id}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-400">Requires the seed script: <code className="font-mono">npm run seed</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
