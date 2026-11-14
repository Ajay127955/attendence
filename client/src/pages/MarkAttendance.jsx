import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarCheck, CheckCheck, Save, Search, Users } from 'lucide-react';
import api, { request } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useLocalState } from '../hooks/useLocalState';
import { Button, Card, EmptyState, ErrorState, Select, Skeleton, StatusBadge } from '../components/ui';
import { cn, STATUSES, STATUS_META, todayISO } from '../lib/format';

/** The four status buttons — big tap targets for phones. */
function StatusToggle({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Attendance status">
      {STATUSES.map((s) => {
        const active = value === s;
        const meta = STATUS_META[s];
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(s)}
            className={cn(
              'rounded-xl border px-1 py-2 text-xs font-semibold transition disabled:opacity-50',
              active
                ? meta.badge
                : 'border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800'
            )}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

export default function MarkAttendance() {
  const [classId, setClassId] = useLocalState('ams-mark-class', '');
  const [subjectId, setSubjectId] = useLocalState('ams-mark-subject', '');
  const [date, setDate] = useState(todayISO());
  const [statuses, setStatuses] = useState({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: classes } = useApi('/classes/options');
  const { data: settings } = useApi('/settings');

  // Keep the chosen class valid once options load.
  useEffect(() => {
    if (classes && classes.length && !classes.some((c) => c._id === classId)) {
      setClassId(classes[0]._id);
    }
  }, [classes, classId, setClassId]);

  const { data: subjects } = useApi('/subjects/options', { params: { classId } }, [classId]);

  useEffect(() => {
    if (subjects && !subjects.some((s) => s._id === subjectId)) setSubjectId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects]);

  const rosterUrl = classId ? '/attendance/roster' : null;
  const rosterParams = useMemo(() => ({ date, classId, subjectId: subjectId || undefined }), [date, classId, subjectId]);
  const { data: roster, loading, error, reload } = useApi(rosterUrl, { params: rosterParams }, [rosterParams]);

  // Seed local state from the server roster whenever it loads.
  useEffect(() => {
    if (!roster?.students) return;
    const next = {};
    roster.students.forEach((s) => {
      next[s._id] = s.status || null;
    });
    setStatuses(next);
  }, [roster]);

  const students = useMemo(() => roster?.students || [], [roster]);
  const filtered = useMemo(
    () =>
      search
        ? students.filter(
            (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase())
          )
        : students,
    [students, search]
  );

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    students.forEach((s) => {
      const st = statuses[s._id];
      if (st) c[st] += 1;
      else c.unmarked += 1;
    });
    return c;
  }, [students, statuses]);

  const setAll = useCallback(
    (status) => {
      const next = {};
      students.forEach((s) => {
        next[s._id] = status;
      });
      setStatuses(next);
    },
    [students]
  );

  const onSave = async () => {
    const records = students
      .filter((s) => statuses[s._id])
      .map((s) => ({ studentId: s._id, status: statuses[s._id] }));

    if (!records.length) {
      toast.error('Mark at least one student before saving');
      return;
    }
    setSaving(true);
    try {
      const res = await request(
        api.post('/attendance/bulk', { date, classId, subjectId: subjectId || null, records })
      );
      toast.success(res.message || 'Attendance saved');
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Could not save attendance');
    } finally {
      setSaving(false);
    }
  };

  const editWindow = settings?.editWindowDays ?? 7;
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - editWindow);
    return d.toISOString().slice(0, 10);
  }, [editWindow]);

  return (
    <div className="animate-fade-in pb-24 lg:pb-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Mark attendance</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Pick a class and date, then set each student&apos;s status. Re-saving updates existing records.
        </p>
      </div>

      {/* Sticky filter bar */}
      <Card className="sticky top-16 z-10 mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select a class…</option>
            {(classes || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}-{c.section}
              </option>
            ))}
          </Select>
          <Select label="Subject (optional)" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Class-wide (no subject)</option>
            {(subjects || []).map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
          <div>
            <label className="label" htmlFor="mark-date">
              Date
            </label>
            <input
              id="mark-date"
              type="date"
              className="input"
              value={date}
              max={todayISO()}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              Editable within the last {editWindow} day(s)
            </p>
          </div>
        </div>
      </Card>

      {!classId ? (
        <EmptyState title="Select a class" description="Choose a class to load its student roster." icon={Users} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <EmptyState title="No students in this class" description="Add students to this class before marking attendance." icon={Users} />
      ) : (
        <>
          {/* Quick actions + live counts */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAll('present')}>
              <CheckCheck size={15} /> Mark all present
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAll(null)}>
              Clear
            </Button>
            <div className="ml-auto flex flex-wrap gap-1.5 text-xs">
              <span className="badge border-success/30 bg-success/10 text-success">{counts.present} present</span>
              <span className="badge border-danger/30 bg-danger/10 text-danger">{counts.absent} absent</span>
              <span className="badge border-warn/30 bg-warn/10 text-warn">{counts.late} late</span>
              <span className="badge border-ink-300 bg-ink-100 text-ink-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300">
                {counts.unmarked} unmarked
              </span>
            </div>
          </div>

          <div className="relative mb-3 max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
            <input className="input pl-9" placeholder="Find a student…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search roster" />
          </div>

          <ul className="space-y-2">
            {filtered.map((s) => (
              <li
                key={s._id}
                className={cn(
                  'card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between',
                  statuses[s._id] === 'absent' && 'border-danger/30',
                  statuses[s._id] === 'present' && 'border-success/30'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-100 font-mono text-xs font-semibold dark:bg-ink-800">
                    {s.rollNo?.replace(/[^0-9]/g, '').slice(-3) || '—'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="font-mono text-xs text-ink-500 dark:text-ink-400">
                      {s.rollNo}
                      {s.recorded && <span className="ml-2 text-ink-400">· previously recorded</span>}
                    </p>
                  </div>
                </div>
                <div className="sm:w-[320px]">
                  <StatusToggle value={statuses[s._id]} onChange={(v) => setStatuses((prev) => ({ ...prev, [s._id]: v }))} />
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop save bar */}
          <div className="mt-5 hidden items-center justify-between rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900 lg:flex">
            <p className="text-sm text-ink-500 dark:text-ink-400">
              <StatusBadge status={counts.absent > 0 ? 'absent' : 'present'} /> Saving writes {students.length} records for{' '}
              {new Date(date).toLocaleDateString()}.
            </p>
            <Button onClick={onSave} loading={saving}>
              <Save size={16} /> Save attendance
            </Button>
          </div>

          {/* Mobile sticky save bar */}
          <div className="fixed inset-x-0 bottom-16 z-20 border-t border-ink-200 bg-white/95 p-3 backdrop-blur dark:border-ink-800 dark:bg-ink-900/95 lg:hidden">
            <Button onClick={onSave} loading={saving} className="w-full">
              <Save size={16} /> Save {counts.unmarked === 0 ? `(${students.length})` : ''}
            </Button>
          </div>
        </>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-ink-400">
        <CalendarCheck size={13} aria-hidden />
        Attendance is saved with a unique (date, student, subject) key — re-marking updates the record.
      </div>
    </div>
  );
}
