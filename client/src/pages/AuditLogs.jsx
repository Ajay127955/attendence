import { useEffect, useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { useApi, useDebounced } from '../hooks/useApi';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Pagination, Select, TableSkeleton } from '../components/ui';
import { formatDateTime } from '../lib/format';

const ACTION_TONES = {
  create: 'success',
  update: 'warn',
  delete: 'danger',
  mark: 'success',
  login: 'neutral',
};

function tone(action = '') {
  const key = Object.keys(ACTION_TONES).find((k) => action.includes(k));
  return ACTION_TONES[key] || 'neutral';
}

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const debounced = useDebounced(search);

  const params = useMemo(
    () => ({ page, limit: 20, action: debounced || undefined, entity: entity || undefined }),
    [page, debounced, entity]
  );
  const { data, meta, loading, error, reload } = useApi('/settings/audit-logs', { params }, [params]);

  useEffect(() => setPage(1), [debounced, entity]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Audit log" subtitle="Every create, update, delete and login — who, what and when" />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              className="input pl-9"
              placeholder="Filter by action, e.g. attendance.mark"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search audit actions"
            />
          </div>
          <Select value={entity} onChange={(e) => setEntity(e.target.value)} aria-label="Filter by entity">
            <option value="">All entities</option>
            {['Attendance', 'Student', 'Class', 'Subject', 'User', 'Settings', 'System'].map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <TableSkeleton rows={10} cols={5} />
      ) : (data || []).length === 0 ? (
        <EmptyState title="No audit entries" description="Actions will appear here as users work with the system." icon={ScrollText} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th className="hidden md:table-cell">Entity</th>
                  <th className="hidden lg:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                {data.map((log) => (
                  <tr key={log._id}>
                    <td className="whitespace-nowrap text-ink-600 dark:text-ink-300">{formatDateTime(log.createdAt)}</td>
                    <td>
                      <p className="font-medium">{log.actorName}</p>
                      <p className="text-xs capitalize text-ink-500 dark:text-ink-400">{log.actorRole}</p>
                    </td>
                    <td>
                      <Badge tone={tone(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="hidden md:table-cell">{log.entity}</td>
                    <td className="hidden lg:table-cell text-ink-600 dark:text-ink-300">{log.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
