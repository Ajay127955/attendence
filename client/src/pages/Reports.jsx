import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, BarChart3, FileSpreadsheet, FileText, Printer, Table2 } from 'lucide-react';
import api from '../lib/api';
import { useApi } from '../hooks/useApi';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  TableSkeleton,
} from '../components/ui';
import StatCard from '../components/StatCard';
import { ClassPercentageChart } from '../components/charts/Charts';
import { cn, downloadBlob, pctColor, percent } from '../lib/format';

const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function Reports() {
  const [filters, setFilters] = useState({ from: isoDaysAgo(29), to: new Date().toISOString().slice(0, 10), classId: '', subjectId: '', search: '' });
  const [type, setType] = useState('summary');
  const [exporting, setExporting] = useState('');

  const params = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    [filters]
  );

  const { data, loading, error, reload } = useApi('/reports/summary', { params }, [params]);
  const { data: classes } = useApi('/classes/options');
  const { data: subjects } = useApi('/subjects/options', { params: { classId: filters.classId } }, [filters.classId]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const doExport = async (format) => {
    setExporting(format);
    try {
      const res = await api.get('/reports/export', {
        params: { ...params, format, type },
        responseType: 'blob',
      });
      const ext = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' }[format];
      downloadBlob(res.data, `attendance-${type}-${filters.from || 'all'}_${filters.to || 'all'}.${ext}`);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting('');
    }
  };

  const students = data?.students || [];
  const below = students.filter((s) => s.belowThreshold);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports"
        subtitle="Filter by date range, class and subject, then export or print"
        className="no-print"
        actions={
          <>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </Button>
            <Button variant="secondary" onClick={() => doExport('csv')} loading={exporting === 'csv'}>
              <Table2 size={16} /> CSV
            </Button>
            <Button variant="secondary" onClick={() => doExport('excel')} loading={exporting === 'excel'}>
              <FileSpreadsheet size={16} /> Excel
            </Button>
            <Button onClick={() => doExport('pdf')} loading={exporting === 'pdf'}>
              <FileText size={16} /> PDF
            </Button>
          </>
        }
      />

      <Card className="no-print mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label" htmlFor="r-from">
              From
            </label>
            <input id="r-from" type="date" className="input" value={filters.from} onChange={set('from')} />
          </div>
          <div>
            <label className="label" htmlFor="r-to">
              To
            </label>
            <input id="r-to" type="date" className="input" value={filters.to} onChange={set('to')} />
          </div>
          <Select label="Class" value={filters.classId} onChange={set('classId')}>
            <option value="">All classes</option>
            {(classes || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}-{c.section}
              </option>
            ))}
          </Select>
          <Select label="Subject" value={filters.subjectId} onChange={set('subjectId')}>
            <option value="">All subjects</option>
            {(subjects || []).map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select label="Report type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="summary">Per-student summary</option>
            <option value="detailed">Detailed daily records</option>
          </Select>
        </div>
        <div className="mt-3 max-w-md">
          <input
            className="input"
            placeholder="Filter results by student name or roll number…"
            value={filters.search}
            onChange={set('search')}
            aria-label="Search report"
          />
        </div>
      </Card>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Overall attendance" value={percent(data?.overall?.percentage)} hint={`${data?.overall?.total ?? 0} records`} />
            <StatCard label="Students" value={students.length} hint={`${data?.classWise?.length ?? 0} classes`} />
            <StatCard label="Present" value={data?.overall?.present ?? 0} tone="success" hint={`${data?.overall?.late ?? 0} late`} />
            <StatCard label="Absent" value={data?.overall?.absent ?? 0} tone="danger" hint={`${data?.overall?.excused ?? 0} excused`} />
          </div>

          {(data?.classWise || []).length > 0 && (
            <Card className="mt-6">
              <CardHeader title="Class comparison" subtitle="Attendance percentage by class for the selected range" />
              <ClassPercentageChart data={data.classWise} />
            </Card>
          )}

          {below.length > 0 && (
            <Card className="mt-6 border-warn/40">
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle size={16} className="text-warn" /> Below minimum ({data?.settings?.minAttendancePercent ?? 75}%)
                  </span>
                }
                subtitle={`${below.length} student(s) need attention`}
              />
              <div className="flex flex-wrap gap-2">
                {below.map((s) => (
                  <span key={s.studentId} className="badge border-warn/30 bg-warn/10 text-warn">
                    {s.name} · {percent(s.percentage)}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {students.length === 0 ? (
            <EmptyState title="No data for this range" description="Adjust the filters or mark some attendance first." icon={BarChart3} />
          ) : type === 'summary' ? (
            <div className="mt-6 table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student</th>
                    <th className="hidden md:table-cell">Class</th>
                    <th className="text-right">Present</th>
                    <th className="text-right">Absent</th>
                    <th className="text-right">Late</th>
                    <th className="text-right">Excused</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.studentId}>
                      <td className="font-mono text-xs">{s.rollNo}</td>
                      <td className="font-medium">{s.name}</td>
                      <td className="hidden md:table-cell">
                        <Badge>{s.className || '—'}</Badge>
                      </td>
                      <td className="text-right text-success">{s.present}</td>
                      <td className="text-right text-danger">{s.absent}</td>
                      <td className="text-right text-warn">{s.late}</td>
                      <td className="text-right text-ink-500">{s.excused}</td>
                      <td className="text-right">{s.total}</td>
                      <td className={cn('text-right font-bold', pctColor(s.percentage, data?.settings?.minAttendancePercent))}>
                        {percent(s.percentage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink-300 font-semibold dark:border-ink-700">
                    <td colSpan={3} className="px-4 py-3">
                      Overall
                    </td>
                    <td className="px-4 py-3 text-right">{data.overall.present}</td>
                    <td className="px-4 py-3 text-right">{data.overall.absent}</td>
                    <td className="px-4 py-3 text-right">{data.overall.late}</td>
                    <td className="px-4 py-3 text-right">{data.overall.excused}</td>
                    <td className="px-4 py-3 text-right">{data.overall.total}</td>
                    <td className="px-4 py-3 text-right">{percent(data.overall.percentage)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="mt-6">
              <Card className="mb-3">
                <p className="text-sm text-ink-500 dark:text-ink-400">
                  Detailed daily records are exported as CSV, Excel or PDF. Choose &quot;Detailed daily records&quot; above
                  and use an export button to download the full row-level data.
                </p>
              </Card>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th className="text-right">Records</th>
                      <th className="text-right">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.studentId}>
                        <td className="font-medium">
                          {s.name} <span className="font-mono text-xs text-ink-400">{s.rollNo}</span>
                        </td>
                        <td>{s.className || '—'}</td>
                        <td className="text-right">{s.total}</td>
                        <td className={cn('text-right font-bold', pctColor(s.percentage, data?.settings?.minAttendancePercent))}>
                          {percent(s.percentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
