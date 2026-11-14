import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import api from '../lib/api';
import { Button, Input } from '../components/ui';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: params.get('email') || '',
    token: params.get('token') || '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.email) next.email = 'Email is required';
    if (!form.token) next.token = 'Reset token is missing from the link';
    if (form.password.length < 8) next.password = 'Use at least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
      next.password = 'Include at least one letter and one number';
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: form.email,
        token: form.token,
        password: form.password,
      });
      toast.success('Password reset — please sign in');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Reset failed');
      setErrors({ token: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 p-6 dark:bg-ink-950">
      <div className="card w-full max-w-md p-8">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-ink-100 dark:bg-ink-800">
          <KeyRound size={22} aria-hidden />
        </span>
        <h1 className="text-xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Choose a strong password you haven&apos;t used before.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Input
            label="Reset token"
            value={form.token}
            onChange={(e) => setForm({ ...form, token: e.target.value })}
            error={errors.token}
            hint="Filled automatically from the link in your email."
            className="font-mono text-xs"
          />
          <Input
            label="New password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            error={errors.confirm}
            autoComplete="new-password"
          />
          <Button type="submit" className="w-full" loading={loading}>
            Reset password
          </Button>
        </form>

        <Link to="/login" className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
