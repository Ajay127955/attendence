import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, MailCheck } from 'lucide-react';
import api from '../lib/api';
import { Button, Input } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Could not send the reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 p-6 dark:bg-ink-950">
      <div className="card w-full max-w-md p-8">
        {sent ? (
          <div className="text-center">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-success/10">
              <MailCheck className="text-success" size={26} aria-hidden />
            </span>
            <h1 className="text-xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
              If an account exists for <span className="font-medium text-ink-800 dark:text-ink-200">{email}</span>, a
              reset link is on its way. It expires in 30 minutes.
            </p>
            <Link to="/login" className="btn-secondary mt-6 inline-flex">
              <ArrowLeft size={16} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              Enter the email on your account and we&apos;ll send a reset link.
            </p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <Input
                label="Email address"
                type="email"
                name="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" className="w-full" loading={loading}>
                Send reset link
              </Button>
            </form>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
