import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  School,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StatCard from '../components/StatCard';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, TableSkeleton } from '../components/ui';
import { ClassPercentageChart, StatusBarChart, StatusPieChart, TrendChart } from '../components/charts/Charts';
import { cn, formatDate, pctColor, percent, relativeTime } from '../lib/format';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const { on } = useSocket();
  const { data, loading, error, reload } = useApi('/dashboard');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Live refresh whenever attendance is marked anywhere.
  useEffect(() => {
    const off = on('dashboard:refresh', () => {
      reload({ silent: true });
      setLastUpdate(new Date());
    });
    return off;
  }, [on, reload]);

  if (loading && !data) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  const cards = data.cards || {};
  const isTeacher = role === 'teacher';

  const kpis = isTeacher
    ? [
        { label: 'My classes', value: cards.myClasses ?? 0, icon: School, hint: `${cards.myStudents ?? 0} students` },
        { label: 'Marked today', value: cards.todayMarked ?? 0, icon: CalendarCheck, hint: `${percent(cards.todayPercentage)} present` },
        { label: 'Present today', value: cards.todayPresent ?? 0, icon: UserCheck, tone: 'success' },
        { label: 'Absent today', value: cards.todayAbsent ?? 0, icon: UserX, tone: 'danger' },
      ]
    : [
        { label: 'Total students', value: cards.totalStudents ?? 0, icon: Users, hint: `${cards.totalClasses ?? 0} classes` },
        { label: 'Present today', value: cards.todayPresent ?? 0, icon: UserCheck, tone: 'success', hint: `${percent(cards.todayPercentage)} of marked` },
        { label: 'Absent today', value: cards.todayAbsent ?? 0, icon: UserX, tone: 'danger', hint: `${cards.todayLate ?? 0} late` },
        { label: 'Overall attendance', value: percent(cards.overallPercentage), icon: CheckCircle2, hint: `${(cards.overallTotal ?? 0).toLocaleString()} records` },
      ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle={
          <>
            {isTeacher ? 'Your classes at a glance' : 'School-wide attendance overview'} ·{' '}
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              updated {relativeTime(lastUpdate)}
            </span>
          </>
        }
        actions={
          <>
            <Link to="/attendance/mark" className="btn-primary">
              <CalendarCheck size={16} /> Mark attendance
            </Link>
            <Link to="/reports" className="btn-secondary">
              <CalendarClock size={16} /> Reports
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>

      {/* Trend */}
      {!isTeacher && (
        <Card className="mt-6">
          <CardHeader
            title="Attendance trend"
            subtitle="Daily attendance percentage over the last 30 days"
            action={
              <span className="badge border-ink-300 bg-ink-100 text-ink-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300">
                {data.trend?.length || 0} days
              </span>
            }
          />
          <TrendChart data={data.trend || []} />
        </Card>
      )}

      <div className={cn('mt-6 grid gap-6', isTeacher ? 'lg:grid-cols-2' : 'lg:grid-cols-3')}>
        <Card className={cn(isTeacher ? '' : 'lg:col-span-2')}>
          <CardHeader
            title={isTeacher ? 'Today by status' : 'Class-wise attendance'}
            subtitle={isTeacher ? 'Snapshot of today' : 'Attendance percentage per class'}
          />
          {isTeacher ? (
            <StatusBarChart
              data={[
                {
                  name: 'Today',
                  present: cards.todayPresent || 0,
                  absent: cards.todayAbsent || 0,
                  late: cards.todayLate || 0,
                  excused: data.today?.excused || 0,
                },
              ]}
            />
          ) : (data.classWise || []).length ? (
            <ClassPercentageChart data={data.classWise} />
          ) : (
            <EmptyState title="No classes yet" description="Create a class and mark attendance to see analytics." icon={School} />
          )}
        </Card>

        <Card>
          <CardHeader title="Today's breakdown" subtitle={formatDate(new Date())} />
          <StatusPieChart counts={data.today || {}} />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ['Present', data.today?.present || 0, 'text-success'],
              ['Absent', data.today?.absent || 0, 'text-danger'],
              ['Late', data.today?.late || 0, 'text-warn'],
              ['Excused', data.today?.excused || 0, 'text-ink-500'],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                <dt className="text-xs uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</dt>
                <dd className={cn('mt-0.5 text-lg font-bold', tone)}>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {/* Low attendance */}
      <Card className="mt-6">
        <CardHeader
          title="Low attendance alerts"
          subtitle={`Students below ${data.settings?.minAttendancePercent ?? 75}% attendance`}
          action={
            <Link to="/reports" className="btn-secondary px-3 py-1.5 text-xs">
              View report
            </Link>
          }
        />
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (data.lowAttendance || []).length === 0 ? (
          <EmptyState
            title="Everyone is above the threshold"
            description="No student is currently below the minimum attendance percentage."
            icon={CheckCircle2}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th className="text-right">Present</th>
                  <th className="text-right">Absent</th>
                  <th className="text-right">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {data.lowAttendance.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <p className="font-medium">{s.name}</p>
                      <p className="font-mono text-xs text-ink-500 dark:text-ink-400">{s.rollNo}</p>
                    </td>
                    <td className="text-ink-600 dark:text-ink-300">
                      {s.class ? `${s.class.name}-${s.class.section}` : '—'}
                    </td>
                    <td className="text-right font-medium text-success">{s.present}</td>
                    <td className="text-right font-medium text-danger">{s.absent}</td>
                    <td className="text-right">
                      <span className={cn('inline-flex items-center gap-1 font-bold', pctColor(s.percentage, data.settings?.minAttendancePercent))}>
                        <AlertTriangle size={13} aria-hidden />
                        {percent(s.percentage)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!isTeacher && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Teachers" value={cards.totalTeachers ?? 0} icon={Users} />
          <StatCard label="Classes" value={cards.totalClasses ?? 0} icon={School} />
          <StatCard label="Subjects" value={cards.totalSubjects ?? 0} icon={BookOpen} />
        </div>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
