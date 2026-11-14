import { useMemo, useState } from 'react';
import { CalendarRange, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useApi } from '../hooks/useApi';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Select, StatusBadge, TableSkeleton } from '../components/ui';
import { downloadBlob, formatDate, STATUSES, STATUS_META } from '../lib/format';

export default function History() {
  const [page, setPage] = useState(1);
  const [subjectId, setSubjectId] = useState('');
  const [downloading, setDownloading] = useState(false);

  const { data: subjects } = useApi('/subjects/options');
  const params = useMemo(() => ({ page, limit: 20, subjectId: subjectId || undefined }), [page, subjectId]);
  const { data, meta, loading, error, reload } = useApi('/attendance/me/history', { params }, [params]);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/attendance/me/history', { params: { limit: 200 }, responseType: 'json' });
      const rows = res.data.data || [];
      const header = 'Date,Subject,Status,Remarks,Marked By\n';
      const csv = rows
        .map((r) =>
          [String(r.date).slice(0, 10), r.subject?.name || 'General', r.status, r.remarks || '', r.markedBy?.name || ''].join(',')
        )
        .join('\n');
      downloadBlob(new Blob([header + csv], { type: 'text/csv' }), 'my-attendance-history.csv');
      toast.success('History downloaded');
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Attendance history"
        subtitle="Every day your attendance was recorded"
        actions={
          <Button variant="secondary" onClick={download} loading={downloading}>
            <Download size={16} /> Download CSV
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="max-w-xs">
          <Select label="Subject" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}>
            <option value="">All subjects</option>
            {(subjects || []).map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <TableSkeleton rows={10} cols={4} />
      ) : (data || []).length === 0 ? (
        <EmptyState title="No history yet" description="Your attendance records will appear here once marked." icon={CalendarRange} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th className="hidden md:table-cell">Remarks</th>
                  <th className="hidden lg:table-cell">Marked by</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r._id}>
                    <td className="whitespace-nowrap font-medium">{formatDate(r.date)}</td>
                    <td>{r.subject ? <Badge>{r.subject.name}</Badge> : <span className="text-ink-500">General</span>}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="hidden md:table-cell text-ink-600 dark:text-ink-300">{r.remarks || '—'}</td>
                    <td className="hidden lg:table-cell text-ink-600 dark:text-ink-300">{r.markedBy?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {STATUSES.map((s) => (
          <span key={s} className={`badge ${STATUS_META[s].badge}`}>
            {STATUS_META[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}
