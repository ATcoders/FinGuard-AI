import { useState } from 'react';
import { Modal } from './Modal';
import { Field } from './ui';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EMAIL_RE, ROLE_OPTIONS, passwordProblem, inr } from '../utils/format';

const MANAGER_ROLES = ['manager', 'director', 'cfo', 'admin'];

export default function EmployeeForm({ initial, departments, designations, users, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(initial);
  const [f, setF] = useState({
    full_name: initial?.full_name ?? '',
    email: initial?.email ?? '',
    password: '',
    role: initial?.role ?? 'employee',
    employee_code: initial?.employee_code ?? '',
    department_id: initial?.department_id ?? '',
    designation_id: initial?.designation_id ?? '',
    manager_id: initial?.manager_id ?? '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined })); };
  const managers = users.filter((u) => u.is_active && MANAGER_ROLES.includes(u.role) && u.id !== initial?.id);
  const idOrNull = (v) => (v === '' || v === null ? null : Number(v));

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const er = {};
    if (f.full_name.trim().length < 2) er.full_name = 'Enter the full name';
    if (!editing) {
      if (!EMAIL_RE.test(f.email)) er.email = 'Enter a valid email address';
      const pw = passwordProblem(f.password);
      if (pw) er.password = pw;
    } else if (f.password) {
      const pw = passwordProblem(f.password);
      if (pw) er.password = pw;
    }
    setErrors(er);
    if (Object.keys(er).length) return;

    setBusy(true);
    try {
      const common = {
        full_name: f.full_name.trim(),
        role: f.role,
        employee_code: f.employee_code.trim() || null,
        department_id: idOrNull(f.department_id),
        designation_id: idOrNull(f.designation_id),
        manager_id: idOrNull(f.manager_id),
      };
      if (editing) {
        await api.updateUser(initial.id, { ...common, ...(f.password ? { new_password: f.password } : {}) });
        toast.success(`${common.full_name} updated`);
      } else {
        await api.createUser({ ...common, email: f.email.trim(), password: f.password });
        toast.success(`${common.full_name} added`);
      }
      onSaved();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit employee' : 'Add employee'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="employee-form" className="btn btn-primary" disabled={busy}>
            {busy && <span className="spinner" />} {editing ? 'Save changes' : 'Add employee'}
          </button>
        </>
      }
    >
      <form id="employee-form" className="modal-body" onSubmit={submit} noValidate>
        {formError && <div className="form-error" role="alert">{formError}</div>}
        <div className="form-grid">
          <Field label="Full name" error={errors.full_name}>
            <input className="input" value={f.full_name} onChange={set('full_name')} autoFocus />
          </Field>
          <Field label="Employee code" hint="Optional">
            <input className="input" value={f.employee_code} onChange={set('employee_code')} />
          </Field>
          <Field label="Email" error={errors.email} hint={editing ? 'Email cannot be changed' : undefined}>
            <input className="input" type="email" value={f.email} onChange={set('email')} disabled={editing} />
          </Field>
          <Field label={editing ? 'Reset password' : 'Temporary password'} error={errors.password} hint={editing ? 'Leave blank to keep the current one' : 'Ask them to change it after first sign-in'}>
            <input className="input" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <Field label="Access role">
            <select className="select" value={f.role} onChange={set('role')}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select className="select" value={f.department_id} onChange={set('department_id')}>
              <option value="">None</option>
              {departments.filter((d) => d.is_active || d.id === initial?.department_id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Designation" hint="Sets approval authority">
            <select className="select" value={f.designation_id} onChange={set('designation_id')}>
              <option value="">None</option>
              {designations.map((g) => (
                <option key={g.id} value={g.id}>{g.name} · {g.approval_limit == null ? 'unlimited' : inr(g.approval_limit)}</option>
              ))}
            </select>
          </Field>
          <Field label="Reports to">
            <select className="select" value={f.manager_id} onChange={set('manager_id')}>
              <option value="">No one</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
