import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, School, Search, Trash2, UserCog, Users } from 'lucide-react';
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
} from '../components/ui';

const EMPTY = { name: '', section: 'A', academicYear: '', room: '', teachers: [] };

function ClassForm({ open, onClose, onSaved, klass, teachers }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(klass?._id);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      klass
        ? {
            name: klass.name,
            section: klass.section,
            academicYear: klass.academicYear,
            room: klass.room || '',
            teachers: (klass.teachers || []).map((t) => t._id || t),
          }
        : EMPTY
    );
  }, [open, klass]);

  const toggleTeacher = (id) =>
    setForm((f) => ({
      ...f,
      teachers: f.teachers.includes(id) ? f.teachers.filter((t) => t !== id) : [...f.teachers, id],
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Class name is required';
    if (!form.section.trim()) next.section = 'Section is required';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      if (isEdit) {
        await request(api.patch(`/classes/${klass._id}`, { name: form.name, section: form.section, academicYear: form.academicYear, room: form.room }));
        await request(api.put(`/classes/${klass._id}/teachers`, { teachers: form.teachers }));
        toast.success('Class updated');
      } else {
        await request(api.post('/classes', form));
        toast.success('Class created');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save the class');
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit class' : 'Add class'}
      description="Set the class details and assign teachers"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {isEdit ? 'Save changes' : 'Create class'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Class name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Grade 10" />
        <Input label="Section" required value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })} error={errors.section} placeholder="A" maxLength={4} />
        <Input label="Academic year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-2026" />
        <Input label="Room" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="R-201" />
        <div className="sm:col-span-2">
          <p className="label">Assigned teachers</p>
          {teachers.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">No teachers available yet.</p>
          ) : (
            <div className="grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-ink-200 p-3 sm:grid-cols-2 dark:border-ink-800">
              {teachers.map((t) => (
                <label key={t._id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-ink-900 dark:accent-ink-100"
                    checked={form.teachers.includes(t._id)}
                    onChange={() => toggleTeacher(t._id)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default function Classes() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({ page, limit: 12, search: debounced || undefined, sort: 'name' }), [page, debounced]);
  const { data, meta, loading, error, reload } = useApi('/classes', { params }, [params]);
  const { data: teachers } = useApi('/users/teachers');

  useEffect(() => setPage(1), [debounced]);

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/classes/${deleting._id}`);
      toast.success('Class deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message || 'Could not delete the class');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Classes"
        subtitle="Organise students into classes and assign teachers"
        actions={
          isAdmin && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} /> Add class
            </Button>
          )
        }
      />

      <Card className="mb-4 p-4">
        <div className="relative max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
          <input className="input pl-9" placeholder="Search classes…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search classes" />
        </div>
      </Card>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : (data || []).length === 0 ? (
        <EmptyState title="No classes yet" description="Create a class to start organising students." icon={School} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => (
              <Card key={c._id} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">
                      {c.name}-{c.section}
                    </h3>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {c.academicYear} {c.room ? `· ${c.room}` : ''}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn-ghost p-2"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost p-2 text-danger hover:bg-danger/10"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>
                    <Users size={12} /> {c.studentCount ?? c.students?.length ?? 0} students
                  </Badge>
                  <Badge>
                    <UserCog size={12} /> {c.teacherCount ?? c.teachers?.length ?? 0} teachers
                  </Badge>
                </div>

                {c.teachers?.length > 0 && (
                  <div className="mt-4 border-t border-ink-200 pt-3 dark:border-ink-800">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
                      Teachers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.teachers.map((t) => (
                        <span key={t._id} className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs dark:bg-ink-800">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

      <ClassForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} klass={editing} teachers={teachers || []} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={busy}
        title="Delete class?"
        confirmLabel="Delete class"
        message={`${deleting?.name}-${deleting?.section} and its subjects will be removed. Classes with active students cannot be deleted.`}
      />
    </div>
  );
}
