import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CalendarDays, Download, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import { useApi } from '../hooks/useApi';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';
import { StatusPieChart, SubjectLineChart } from '../components/charts/Charts';
import { cn, downloadBlob, monthLabel, percent, STATUS_META } from '../lib/format';

/** Colour per day in the calendar grid. */
const DAY_TONE = {
  present: 'bg-success/15 text-success border-success/30',
  absent: 'bg-danger/15 text-danger border-danger/30',
  late: 'bg-warn/15 text-warn border-warn/30',
  excused: 'bg-ink-400/15 text-ink-600 border-ink-400/30 dark:text-ink-300',
};

function Calendar({ month, days = [] }) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7; // Monday-first grid
  const byDate = new Map(days.map((d) => [d.date, d]));

  const cells = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const key = `${month}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, key, entry: byDate.get(key) });
  }

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) =>
          cell ? (
            <div
              key={cell.key}
              title={cell.entry ? `${cell.key}: ${cell.entry.status}` : cell.key}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-xl border text-sm font-medium',
                cell.entry ? DAY_TONE[cell.entry.status] : 'border-ink-200 text-ink-400 dark:border-ink-800 dark:text-ink-600'
              )}
            >
              {cell.day}
            </div>
          ) : (
            <div key={`empty-${i}`} />
          )
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <span key={key} className={cn('badge', meta.badge)}>
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MyAttendance() {
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error, reload } = useApi('/attendance/me');

  const counts = data?.counts || {};
  const percentage = data?.percentage ?? 0;
  const min = data?.minAttendancePercent ?? 75;

  const trend = useMemo(
    () =>
      (data?.calendar || [])
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({ date: d.date, percentage: d.status === 'absent' ? 0 : 100 })),
    [data]
  );

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/attendance/me/history', { params: { limit: 200 }, responseType: 'json' });
      const rows = res.data.data || [];
      const header = 'Date,Subject,Status,Marked By\n';
      const csv = rows
        .map((r) => [String(r.date).slice(0, 10), r.subject?.name || 'General', r.status, r.markedBy?.name || ''].join(','))
        .join('\n');
      downloadBlob(new Blob([header + csv], { type: 'text/csv' }), 'my-attendance.csv');
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(err.message || 'Could not download the report');
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My attendance"
        subtitle={`${data.student?.class ? `${data.student.class.name}-${data.student.class.section} · ` : ''}${monthLabel(data.month)}`}
        actions={
          <>
            <Button variant="secondary" onClick={downloadReport} loading={downloading}>
              <Download size={16} /> Download report
            </Button>
            <Link to="/history" className="btn-primary">
              <CalendarDays size={16} /> Full history
            </Link>
          </>
        }
      />

      {data.atRisk && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={18} aria-hidden />
          <div>
            <p className="font-semibold text-danger">Attendance below the minimum</p>
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Your overall attendance is {percent(percentage)}, below the required {min}%. Please speak with your
              teacher or guardian.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Overall</p>
            <p className={cn('mt-1 text-3xl font-bold', percentage < min ? 'text-danger' : 'text-success')}>
              {percent(percentage)}
            </p>
            <p className="text-xs text-ink-500 dark:text-ink-400">min {min}%</p>
          </div>
          <TrendingUp className="text-ink-300 dark:text-ink-600" aria-hidden />
        </Card>
        {['present', 'absent', 'late'].map((k) => (
          <Card key={k}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">{STATUS_META[k].label}</p>
            <p className="mt-1 text-3xl font-bold">{counts[k] || 0}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">of {counts.total || 0} records</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Monthly calendar" subtitle={monthLabel(data.month)} />
          {(data.calendar || []).length === 0 ? (
            <EmptyState title="No attendance this month" description="Your marked days will appear here." icon={CalendarDays} />
          ) : (
            <Calendar month={data.month} days={data.calendar} />
          )}
        </Card>

        <Card>
          <CardHeader title="Status breakdown" subtitle="All recorded days" />
          <StatusPieChart counts={counts} />
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Subject-wise attendance" subtitle="How you're doing in each subject" />
        {(data.subjectWise || []).length === 0 ? (
          <EmptyState title="No subject data yet" />
        ) : (
          <>
            <SubjectLineChart data={trend} />
            <div className="table-wrap mt-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th className="text-right">Present</th>
                    <th className="text-right">Absent</th>
                    <th className="text-right">Late</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subjectWise.map((s) => (
                    <tr key={s.subjectId || 'general'}>
                      <td>
                        <p className="font-medium">{s.name}</p>
                        {s.code !== '—' && <p className="font-mono text-xs text-ink-500 dark:text-ink-400">{s.code}</p>}
                      </td>
                      <td className="text-right text-success">{s.present}</td>
                      <td className="text-right text-danger">{s.absent}</td>
                      <td className="text-right text-warn">{s.late}</td>
                      <td className="text-right">{s.total}</td>
                      <td className="text-right">
                        <Badge tone={s.percentage < min ? 'danger' : 'success'}>{percent(s.percentage)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
