import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarSearch, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  TableSkeleton,
} from '../components/ui';
import { formatDate, STATUSES, STATUS_META } from '../lib/format';

export default function AttendanceList() {
  const { role } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ date: '', from: '', to: '', classId: '', subjectId: '', status: '' });
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      sort: '-date',
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    }),
    [page, filters]
  );

  const { data, meta, loading, error, reload } = useApi('/attendance', { params }, [params]);
  const { data: classes } = useApi('/classes/options');
  const { data: subjects } = useApi('/subjects/options', { params: { classId: filters.classId } }, [filters.classId]);

  useEffect(() => setPage(1), [filters]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/attendance/${deleting._id}`);
      toast.success('Record deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message || 'Could not delete the record');
    } finally {
      setBusy(false);
    }
  };

  const clearFilters = () => setFilters({ date: '', from: '', to: '', classId: '', subjectId: '', status: '' });
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Attendance records" subtitle="Browse, filter and correct individual attendance entries" />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="label" htmlFor="f-date">
              Exact date
            </label>
            <input id="f-date" type="date" className="input" value={filters.date} onChange={set('date')} />
          </div>
          <div>
            <label className="label" htmlFor="f-from">
              From
            </label>
            <input id="f-from" type="date" className="input" value={filters.from} onChange={set('from')} />
          </div>
          <div>
            <label className="label" htmlFor="f-to">
              To
            </label>
            <input id="f-to" type="date" className="input" value={filters.to} onChange={set('to')} />
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
          <Select label="Status" value={filters.status} onChange={set('status')}>
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
        </div>
        {hasFilters && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : (data || []).length === 0 ? (
        <EmptyState
          title="No attendance records"
          description={hasFilters ? 'No records match these filters. Try widening the date range.' : 'Mark attendance to see records here.'}
          icon={CalendarSearch}
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th className="hidden md:table-cell">Class</th>
                  <th className="hidden lg:table-cell">Subject</th>
                  <th>Status</th>
                  <th className="hidden xl:table-cell">Marked by</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a._id}>
                    <td className="whitespace-nowrap font-medium">{formatDate(a.date)}</td>
                    <td>
                      <p className="font-medium">{a.student?.name || '—'}</p>
                      <p className="font-mono text-xs text-ink-500 dark:text-ink-400">{a.student?.rollNo}</p>
                    </td>
                    <td className="hidden md:table-cell">{a.class ? <Badge>{a.class.name}-{a.class.section}</Badge> : '—'}</td>
                    <td className="hidden lg:table-cell text-ink-600 dark:text-ink-300">{a.subject ? a.subject.name : '—'}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="hidden xl:table-cell text-ink-600 dark:text-ink-300">{a.markedBy?.name || '—'}</td>
                    <td>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="btn-ghost p-2 text-danger hover:bg-danger/10"
                          aria-label="Delete record"
                          onClick={() => setDeleting(a)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

      {role !== 'student' && (
        <p className="mt-3 text-xs text-ink-400">
          Tip: use the Reports page to see per-student percentages and export CSV, Excel or PDF.
        </p>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={busy}
        title="Delete attendance record?"
        confirmLabel="Delete"
        message={`${deleting?.student?.name || 'This record'} on ${formatDate(deleting?.date)} will be removed. This is written to the audit log.`}
      />
    </div>
  );
}
