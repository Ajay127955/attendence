import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Save, ShieldCheck } from 'lucide-react';
import api, { request } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Button, Card, CardHeader, Input, PageHeader } from '../components/ui';
import { formatDateTime } from '../lib/format';

export default function Profile() {
  const { user, student, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (profile.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    setSavingProfile(true);
    try {
      await request(api.patch('/auth/me', profile));
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const next = {};
    if (!pw.currentPassword) next.currentPassword = 'Enter your current password';
    if (pw.newPassword.length < 8) next.newPassword = 'At least 8 characters';
    else if (!/[A-Za-z]/.test(pw.newPassword) || !/[0-9]/.test(pw.newPassword))
      next.newPassword = 'Include a letter and a number';
    if (pw.newPassword !== pw.confirm) next.confirm = 'Passwords do not match';
    setPwErrors(next);
    if (Object.keys(next).length) return;

    setSavingPw(true);
    try {
      await request(api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword }));
      toast.success('Password changed — please sign in again');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not change the password');
      setPwErrors({ currentPassword: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile" subtitle="Your account details and security" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar name={user?.name} size={72} />
            <h2 className="mt-3 text-lg font-bold">{user?.name}</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">{user?.email || user?.rollNo}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge tone="neutral" className="capitalize">
                {user?.role}
              </Badge>
              <Badge tone={user?.isActive ? 'success' : 'danger'}>{user?.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
          <dl className="mt-6 space-y-3 border-t border-ink-200 pt-4 text-sm dark:border-ink-800">
            <div className="flex justify-between">
              <dt className="text-ink-500 dark:text-ink-400">Roll number</dt>
              <dd className="font-mono">{user?.rollNo || '—'}</dd>
            </div>
            {student?.class && (
              <div className="flex justify-between">
                <dt className="text-ink-500 dark:text-ink-400">Class</dt>
                <dd>
                  {student.class.name}-{student.class.section}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500 dark:text-ink-400">Last login</dt>
              <dd>{user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500 dark:text-ink-400">Member since</dt>
              <dd>{formatDateTime(user?.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Personal details" subtitle="Update how your name and phone appear" />
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
              <Input label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              <div className="sm:col-span-2">
                <Button type="submit" loading={savingProfile}>
                  <Save size={16} /> Save changes
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} /> Change password
                </span>
              }
              subtitle="You'll be signed out of all devices after changing it"
            />
            <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={pw.currentPassword}
                  onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                  error={pwErrors.currentPassword}
                />
              </div>
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                error={pwErrors.newPassword}
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                error={pwErrors.confirm}
              />
              <div className="sm:col-span-2">
                <Button type="submit" variant="secondary" loading={savingPw}>
                  <KeyRound size={16} /> Update password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
