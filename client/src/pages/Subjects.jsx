import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import api, { request } from '../lib/api';
import { useApi, useDebounced } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
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

const EMPTY = { name: '', code: '', class: '', teacher: '', credits: 0 };

function SubjectForm({ open, onClose, onSaved, subject, classes, teachers }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(subject?._id);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      subject
        ? {
            name: subject.name,
            code: subject.code,
            class: subject.class?._id || subject.class || '',
            teacher: subject.teacher?._id || subject.teacher || '',
            credits: subject.credits || 0,
          }
        : EMPTY
    );
  }, [open, subject]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Subject name is required';
    if (!form.code.trim()) next.code = 'Subject code is required';
    if (!form.class) next.class = 'Select a class';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload = { ...form, teacher: form.teacher || null };
      if (isEdit) await request(api.patch(`/subjects/${subject._id}`, payload));
      else await request(api.post('/subjects', payload));
      toast.success(isEdit ? 'Subject updated' : 'Subject created');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save the subject');
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit subject' : 'Add subject'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {isEdit ? 'Save changes' : 'Create subject'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Subject name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Mathematics" />
        <Input label="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} error={errors.code} placeholder="MATH10" />
        <Select label="Class" required value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} error={errors.class}>
          <option value="">Select a class…</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}-{c.section}
            </option>
          ))}
        </Select>
        <Select label="Teacher" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}>
          <option value="">Unassigned</option>
          {teachers.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Input label="Credits" type="number" min="0" max="20" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
      </form>
    </Modal>
  );
}

export default function Subjects() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const debounced = useDebounced(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const params = useMemo(
    () => ({ page, limit: 15, search: debounced || undefined, classId: classId || undefined, sort: 'name' }),
    [page, debounced, classId]
  );
  const { data, meta, loading, error, reload } = useApi('/subjects', { params }, [params]);
  const { data: classes } = useApi('/classes/options');
  const { data: teachers } = useApi('/users/teachers');

  useEffect(() => setPage(1), [debounced, classId]);

  const onDelete = async () => {
    setBusy(true);
    try {
      const res = await request(api.delete(`/subjects/${deleting._id}`));
      toast.success(res.message || 'Subject removed');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message || 'Could not delete the subject');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Subjects"
        subtitle="Subjects belong to a class and can be assigned to a teacher"
        actions={
          isAdmin && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} /> Add subject
            </Button>
          )
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
            <input className="input pl-9" placeholder="Search subjects…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search subjects" />
          </div>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Filter by class">
            <option value="">All classes</option>
            {(classes || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}-{c.section}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (data || []).length === 0 ? (
        <EmptyState title="No subjects yet" description="Add subjects so teachers can mark attendance per subject." icon={BookOpen} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Class</th>
                  <th className="hidden md:table-cell">Teacher</th>
                  <th className="hidden lg:table-cell">Credits</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <p className="font-medium">{s.name}</p>
                      <p className="font-mono text-xs text-ink-500 dark:text-ink-400">{s.code}</p>
                    </td>
                    <td>{s.class ? <Badge>{s.class.name}-{s.class.section}</Badge> : '—'}</td>
                    <td className="hidden md:table-cell text-ink-600 dark:text-ink-300">{s.teacher?.name || 'Unassigned'}</td>
                    <td className="hidden lg:table-cell">{s.credits || 0}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              className="btn-ghost p-2"
                              aria-label={`Edit ${s.name}`}
                              onClick={() => {
                                setEditing(s);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-ghost p-2 text-danger hover:bg-danger/10"
                              aria-label={`Delete ${s.name}`}
                              onClick={() => setDeleting(s)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-ink-400">Read only</span>
                        )}
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

      <SubjectForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} subject={editing} classes={classes || []} teachers={teachers || []} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={busy}
        title="Delete subject?"
        confirmLabel="Delete"
        message={`${deleting?.name} will be removed. If attendance records reference it, it will be archived instead.`}
      />
    </div>
  );
}
