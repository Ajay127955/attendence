import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { GraduationCap, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import api, { request } from '../lib/api';
import { useApi, useDebounced } from '../hooks/useApi';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  TableSkeleton,
} from '../components/ui';
import { relativeTime } from '../lib/format';

const EMPTY = { name: '', email: '', phone: '', password: '', role: 'teacher', isActive: true };

function TeacherForm({ open, onClose, onSaved, teacher }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(teacher?._id);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(teacher ? { ...EMPTY, ...teacher, password: '' } : EMPTY);
  }, [open, teacher]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim() || form.name.trim().length < 2) next.name = 'Enter the full name';
    if (!form.email.trim()) next.email = 'Email is required for teacher accounts';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Invalid email address';
    if (!isEdit && form.password.length < 8) next.password = 'At least 8 characters';
    if (!isEdit && form.password && (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)))
      next.password = 'Include a letter and a number';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      if (isEdit) {
        await request(api.patch(`/users/${teacher._id}`, payload));
        toast.success('Teacher updated');
      } else {
        await request(api.post('/users', payload));
        toast.success('Teacher created');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save the teacher');
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit teacher' : 'Add teacher'}
      description={isEdit ? `Updating ${teacher?.name}` : 'Create a teacher login account'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {isEdit ? 'Save changes' : 'Create teacher'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          label={isEdit ? 'New password (optional)' : 'Password'}
          type="password"
          required={!isEdit}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          autoComplete="new-password"
          hint={isEdit ? 'Leave blank to keep the current password.' : 'Minimum 8 characters, letters and numbers.'}
        />
        {isEdit && (
          <Select label="Status" value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        )}
      </form>
    </Modal>
  );
}

export default function Teachers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({ page, limit: 15, role: 'teacher', search: debounced || undefined, sort: 'name' }), [page, debounced]);
  const { data, meta, loading, error, reload } = useApi('/users', { params }, [params]);

  useEffect(() => setPage(1), [debounced]);

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/users/${deleting._id}`);
      toast.success('Teacher deactivated');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message || 'Could not deactivate the teacher');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Teachers"
        subtitle="Manage teacher accounts and access"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add teacher
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="relative max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
          <input className="input pl-9" placeholder="Search teachers…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search teachers" />
        </div>
      </Card>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (data || []).length === 0 ? (
        <EmptyState title="No teachers yet" description="Add teachers so they can mark attendance for their classes." icon={GraduationCap} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Last login</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400">{t.email}</p>
                    </td>
                    <td className="hidden md:table-cell text-ink-600 dark:text-ink-300">{t.phone || '—'}</td>
                    <td>
                      <Badge tone={t.isActive ? 'success' : 'danger'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="hidden lg:table-cell text-ink-600 dark:text-ink-300">{t.lastLoginAt ? relativeTime(t.lastLoginAt) : 'Never'}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="btn-ghost p-2"
                          aria-label={`Edit ${t.name}`}
                          onClick={() => {
                            setEditing(t);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-2 text-danger hover:bg-danger/10"
                          aria-label={`Deactivate ${t.name}`}
                          onClick={() => setDeleting(t)}
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

      <TeacherForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} teacher={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={busy}
        title="Deactivate teacher?"
        confirmLabel="Deactivate"
        message={`${deleting?.name} will no longer be able to sign in. You can reactivate them later.`}
      />
    </div>
  );
}
