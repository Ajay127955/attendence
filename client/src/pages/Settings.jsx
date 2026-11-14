import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Plus, Save, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import api, { request } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { Badge, Button, Card, CardHeader, Input, PageHeader, Skeleton } from '../components/ui';
import { formatDate } from '../lib/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Settings() {
  const { data, loading, reload } = useApi('/settings');
  const { data: sheets } = useApi('/settings/google-sheets');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [holiday, setHoliday] = useState({ date: '', name: '' });

  useEffect(() => {
    if (data) setForm({ ...data, holidays: data.holidays || [] });
  }, [data]);

  if (loading || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const toggleDay = (d) =>
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(d) ? f.workingDays.filter((x) => x !== d) : [...f.workingDays, d].sort(),
    }));

  const addHoliday = () => {
    if (!holiday.date || !holiday.name.trim()) {
      toast.error('Enter a date and a name for the holiday');
      return;
    }
    setForm((f) => ({ ...f, holidays: [...f.holidays, holiday] }));
    setHoliday({ date: '', name: '' });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await request(
        api.patch('/settings', {
          academicYear: form.academicYear,
          minAttendancePercent: Number(form.minAttendancePercent),
          lateCountsAsPresent: form.lateCountsAsPresent,
          editWindowDays: Number(form.editWindowDays),
          workingDays: form.workingDays,
          holidays: form.holidays.map((h) => ({ date: String(h.date).slice(0, 10), name: h.name })),
          schoolName: form.schoolName,
          timezone: form.timezone,
        })
      );
      toast.success('Settings saved');
      reload();
    } catch (err) {
      toast.error(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Academic year, attendance rules and working days"
        actions={
          <Button onClick={onSave} loading={saving}>
            <Save size={16} /> Save settings
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Attendance rules" subtitle="These drive every percentage and alert in the app" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Minimum attendance %"
              type="number"
              min="0"
              max="100"
              value={form.minAttendancePercent}
              onChange={(e) => setForm({ ...form, minAttendancePercent: e.target.value })}
              hint="Students below this are flagged."
            />
            <Input
              label="Edit window (days)"
              type="number"
              min="0"
              max="90"
              value={form.editWindowDays}
              onChange={(e) => setForm({ ...form, editWindowDays: e.target.value })}
              hint="How far back teachers may edit."
            />
            <Input
              label="Academic year"
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              placeholder="2025-2026"
            />
            <Input
              label="School / organisation name"
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
            />
            <Input
              label="Timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              hint="IANA name, e.g. Asia/Kolkata"
            />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-3 dark:border-ink-800">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded accent-ink-900 dark:accent-ink-100"
                checked={form.lateCountsAsPresent}
                onChange={(e) => setForm({ ...form, lateCountsAsPresent: e.target.checked })}
              />
              <span>
                <span className="block text-sm font-medium">Late counts as present</span>
                <span className="block text-xs text-ink-500 dark:text-ink-400">
                  When on, a &quot;late&quot; mark counts towards the percentage.
                </span>
              </span>
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Working days" subtitle="Attendance is expected only on these days" />
          <div className="flex flex-wrap gap-2">
            {DAYS.map((label, idx) => {
              const active = form.workingDays.includes(idx);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  aria-pressed={active}
                  className={
                    active
                      ? 'rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white dark:bg-ink-100 dark:text-ink-950'
                      : 'rounded-xl border border-ink-300 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800'
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <p className="label">
              <CalendarDays size={14} className="mr-1 inline" aria-hidden /> Holidays
            </p>
            {form.holidays.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-ink-400">No holidays configured.</p>
            ) : (
              <ul className="mb-3 divide-y divide-ink-100 rounded-xl border border-ink-200 dark:divide-ink-800 dark:border-ink-800">
                {form.holidays.map((h, i) => (
                  <li key={`${h.date}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium">{h.name}</span>{' '}
                      <span className="text-ink-500 dark:text-ink-400">{formatDate(h.date)}</span>
                    </span>
                    <button
                      type="button"
                      className="btn-ghost p-1.5 text-danger hover:bg-danger/10"
                      aria-label={`Remove ${h.name}`}
                      onClick={() => setForm((f) => ({ ...f, holidays: f.holidays.filter((_, idx) => idx !== i) }))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="date"
                className="input max-w-[160px]"
                value={holiday.date}
                onChange={(e) => setHoliday({ ...holiday, date: e.target.value })}
                aria-label="Holiday date"
              />
              <input
                className="input max-w-[220px]"
                placeholder="Holiday name"
                value={holiday.name}
                onChange={(e) => setHoliday({ ...holiday, name: e.target.value })}
                aria-label="Holiday name"
              />
              <Button variant="secondary" onClick={addHoliday}>
                <Plus size={15} /> Add
              </Button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Integrations"
            subtitle="Optional services that mirror or extend attendance data"
            action={
              <Badge tone={sheets?.enabled ? 'success' : 'neutral'}>
                {sheets?.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            }
          />
          <div className="flex flex-wrap items-start gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-100 dark:bg-ink-800">
              <SettingsIcon size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Google Sheets sync</p>
              <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
                When enabled, every attendance record is mirrored to a Google Sheet via a service account. Toggle with
                the <code className="font-mono text-xs">GOOGLE_SHEETS_ENABLED</code> environment variable.
              </p>
              {sheets?.enabled && (
                <dl className="mt-3 grid gap-1 text-xs text-ink-500 dark:text-ink-400">
                  <div>
                    <dt className="inline font-medium">Spreadsheet: </dt>
                    <dd className="inline font-mono">{sheets.spreadsheetId || 'not set'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Service account: </dt>
                    <dd className="inline font-mono">{sheets.serviceAccount || 'not set'}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
