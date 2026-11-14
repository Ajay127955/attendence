import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Download,
  FileUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import api, { request } from '../lib/api';
import { useApi, useDebounced } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import {
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
  Badge,
} from '../components/ui';
import { cn, pctColor, percent, downloadBlob } from '../lib/format';

const EMPTY = {
  rollNo: '',
  name: '',
  email: '',
  phone: '',
  class: '',
  parentContact: '',
  guardianName: '',
  gender: '',
  address: '',
  createAccount: false,
};

function StudentForm({ open, onClose, onSaved, student, classes }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(student?._id);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      student
        ? {
            ...EMPTY,
            ...student,
            class: student.class?._id || student.class || '',
            gender: student.gender || '',
          }
        : EMPTY
    );
  }, [open, student]);

  const validate = () => {
    const next = {};
    if (!form.rollNo.trim()) next.rollNo = 'Roll number is required';
    if (!form.name.trim() || form.name.trim().length < 2) next.name = 'Enter the full name';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Invalid email address';
    if (!form.class) next.class = 'Select a class';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit) delete payload.createAccount;
      const res = isEdit
        ? await request(api.patch(`/students/${student._id}`, payload))
        : await request(api.post('/students', payload));
      toast.success(isEdit ? 'Student updated' : 'Student created');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save the student');
      if (err.details) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit student' : 'Add student'}
      description={isEdit ? `Updating ${student?.name}` : 'Create a student record and optional login account'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {isEdit ? 'Save changes' : 'Create student'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Roll number"
          required
          value={form.rollNo}
          onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
          error={errors.rollNo}
          placeholder="S0042"
        />
        <Input
          label="Full name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          placeholder="Aarav Sharma"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          placeholder="aarav@example.com"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="9876543210"
        />
        <Select label="Class" required value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} error={errors.class}>
          <option value="">Select a class…</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}-{c.section}
            </option>
          ))}
        </Select>
        <Select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <option value="">Not specified</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </Select>
        <Input
          label="Parent contact"
          value={form.parentContact}
          onChange={(e) => setForm({ ...form, parentContact: e.target.value })}
          placeholder="9876500000"
        />
        <Input
          label="Guardian name"
          value={form.guardianName}
          onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
        />
        <div className="sm:col-span-2">
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        {!isEdit && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-3 sm:col-span-2 dark:border-ink-800">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-ink-300 accent-ink-900 dark:accent-ink-100"
              checked={form.createAccount}
              onChange={(e) => setForm({ ...form, createAccount: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-medium">Create a login account</span>
              <span className="block text-xs text-ink-500 dark:text-ink-400">
                Students sign in with their roll number and the default password.
              </span>
            </span>
          </label>
        )}
      </form>
    </Modal>
  );
}

function ImportModal({ open, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [createAccounts, setCreateAccounts] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setPreview(null);
      setBusy(false);
    }
  }, [open]);

  const upload = async (dryRun) => {
    if (!file) {
      toast.error('Choose a CSV file first');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true);
    try {
      const res = await request(
        api.post(`/students/import?dryRun=${dryRun}&createAccounts=${createAccounts}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      if (dryRun) {
        setPreview(res.data);
        toast.success(`Preview ready — ${res.data.validCount} valid, ${res.data.invalidCount} errors`);
      } else {
        toast.success(res.message);
        onDone?.();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/students/import/template', { responseType: 'blob' });
      downloadBlob(res.data, 'student-import-template.csv');
    } catch {
      toast.error('Could not download the template');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk import students"
      description="Upload a CSV. Every row is validated and errors are reported per line."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button variant="secondary" onClick={() => upload(true)} loading={busy}>
            Validate
          </Button>
          <Button onClick={() => upload(false)} loading={busy} disabled={!preview && !file}>
            Import
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={downloadTemplate}>
            <Download size={15} /> Download template
          </Button>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-ink-900 dark:accent-ink-100"
              checked={createAccounts}
              onChange={(e) => setCreateAccounts(e.target.checked)}
            />
            Create login accounts
          </label>
        </div>

        <label
          className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 px-6 py-10 text-center transition hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
        >
          <FileUp size={26} className="text-ink-500" aria-hidden />
          <span className="text-sm font-medium">{file ? file.name : 'Drop a CSV here or click to browse'}</span>
          <span className="text-xs text-ink-500 dark:text-ink-400">Max 5 MB · .csv only</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone="success">{preview.validCount} valid</Badge>
              <Badge tone={preview.invalidCount ? 'danger' : 'neutral'}>{preview.invalidCount} errors</Badge>
              <Badge>{preview.totalRows} rows</Badge>
            </div>
            {preview.errors?.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">Rows to fix</p>
                <ul className="space-y-0.5 text-xs">
                  {preview.errors.map((e, i) => (
                    <li key={i}>
                      <span className="font-mono">line {e.line}</span> · {e.rollNo || '—'} — {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {preview.preview?.length > 0 && (
              <div className="table-wrap max-h-56 overflow-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((r, i) => (
                      <tr key={i}>
                        <td className="font-mono">{r.rollNo}</td>
                        <td>{r.name}</td>
                        <td>
                          {r.className}-{r.section || 'A'}
                        </td>
                        <td className="text-ink-500 dark:text-ink-400">{r.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Students() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [sort, setSort] = useState('name');
  const debouncedSearch = useDebounced(search);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const params = useMemo(
    () => ({ page, limit: 15, sort, search: debouncedSearch || undefined, classId: classId || undefined }),
    [page, sort, debouncedSearch, classId]
  );

  const { data, meta, loading, error, reload } = useApi('/students', { params }, [params]);
  const { data: classes } = useApi('/classes/options');

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classId, sort]);

  const onDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.delete(`/students/${deleting._id}`);
      toast.success('Student deactivated');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message || 'Could not deactivate the student');
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleSort = useCallback(
    (field) => setSort((s) => (s === field ? `-${field}` : field)),
    []
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Students"
        subtitle="Search, filter and manage every student record"
        actions={
          isAdmin && (
            <>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <FileUp size={16} /> Import CSV
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={16} /> Add student
              </Button>
            </>
          )
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              className="input pl-9"
              placeholder="Search by name, roll number, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search students"
            />
          </div>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Filter by class">
            <option value="">All classes</option>
            {(classes || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}-{c.section}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort students">
            <option value="name">Name (A–Z)</option>
            <option value="-name">Name (Z–A)</option>
            <option value="rollNo">Roll number ↑</option>
            <option value="-rollNo">Roll number ↓</option>
            <option value="-createdAt">Recently added</option>
          </Select>
        </div>
      </Card>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (data || []).length === 0 ? (
        <EmptyState
          title="No students found"
          description={search || classId ? 'Try adjusting your search or filters.' : 'Add your first student or import a CSV to get started.'}
          icon={Users}
          action={
            isAdmin && (
              <Button onClick={() => setFormOpen(true)}>
                <UserPlus size={16} /> Add student
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => toggleSort('rollNo')}>
                      Roll No
                    </button>
                  </th>
                  <th>
                    <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => toggleSort('name')}>
                      Student
                    </button>
                  </th>
                  <th className="hidden md:table-cell">Class</th>
                  <th className="hidden lg:table-cell">Contact</th>
                  <th className="text-right">Attendance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => {
                  const p = s.attendance?.percentage ?? 0;
                  return (
                    <tr key={s._id}>
                      <td className="font-mono text-xs">{s.rollNo}</td>
                      <td>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-ink-500 dark:text-ink-400">{s.email || '—'}</p>
                      </td>
                      <td className="hidden md:table-cell">
                        {s.class ? (
                          <Badge>
                            {s.class.name}-{s.class.section}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="hidden lg:table-cell text-ink-600 dark:text-ink-300">
                        <p>{s.phone || '—'}</p>
                        <p className="text-xs">Parent: {s.parentContact || '—'}</p>
                      </td>
                      <td className="text-right">
                        <span className={cn('font-bold', pctColor(p))}>{percent(p)}</span>
                        <p className="text-xs text-ink-400">{s.attendance?.total ?? 0} records</p>
                      </td>
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
                                aria-label={`Deactivate ${s.name}`}
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
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

      <StudentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        student={editing}
        classes={classes || []}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={reload} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={deleteBusy}
        title="Deactivate student?"
        confirmLabel="Deactivate"
        message={`${deleting?.name} will be marked inactive and their login disabled. Attendance history is preserved.`}
      />
      {!isAdmin && data?.length > 0 && (
        <p className="mt-3 text-xs text-ink-400">
          You can view students in your classes. Editing requires an administrator.
        </p>
      )}
    </div>
  );
}
