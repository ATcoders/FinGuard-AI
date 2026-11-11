import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Icon from '../components/Icon';
import { ConfirmDialog } from '../components/Modal';
import { EmptyState, ErrorState, SkeletonRows, Stamp } from '../components/ui';
import EmployeeForm from '../components/EmployeeForm';
import { ROLE_LABEL, ROLE_OPTIONS, ROLE_TONE, dateTime, inr } from '../utils/format';

export default function EmployeesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === 'admin';

  const [users, setUsers] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [dept, setDept] = useState('');
  const [form, setForm] = useState(null); // null | 'new' | user
  const [toggle, setToggle] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [u, d, g] = await Promise.all([api.users(), api.departments(), api.designations()]);
      setUsers(u); setDepartments(d); setDesignations(g);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    if (!users) return [];
    const needle = q.trim().toLowerCase();
    return users.filter((u) =>
      (!role || u.role === role) &&
      (!dept || String(u.department_id) === dept) &&
      (!needle || [u.full_name, u.email, u.employee_code].some((v) => v && v.toLowerCase().includes(needle))));
  }, [users, q, role, dept]);

  const confirmToggle = async () => {
    setBusy(true);
    try {
      await api.updateUser(toggle.id, { is_active: !toggle.is_active });
      toast.success(`${toggle.full_name} ${toggle.is_active ? 'deactivated' : 'reactivated'}`);
      setToggle(null);
      await load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <header className="page-head">
        <div>
          <div className="page-eyebrow">Organisation</div>
          <h1 className="page-title">Employees</h1>
          <p className="page-sub">Who can sign in, what they can do, and how far their approval authority reaches.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setForm('new')}><Icon name="plus" size={16} /> Add employee</button>
        )}
      </header>

      <section className="sheet">
        <div className="toolbar">
          <div className="search grow">
            <Icon name="search" size={16} />
            <input className="input" placeholder="Search name, email or code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search employees" />
          </div>
          <select className="select" style={{ width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {error ? <ErrorState message={error} onRetry={load} />
          : !users ? <SkeletonRows rows={6} cols={6} />
          : rows.length === 0 ? (
            <EmptyState
              title={users.length === 0 ? 'No employees yet' : 'No one matches those filters'}
              text={users.length === 0 ? 'Add your first colleague to get started.' : 'Try a different search or clear a filter.'}
              action={users.length > 0 ? <button className="btn" onClick={() => { setQ(''); setRole(''); setDept(''); }}>Clear filters</button> : null}
            />
          ) : (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Employee</th><th>Access</th><th>Department</th><th>Designation</th>
                    <th className="num">Approval limit</th><th>Reports to</th><th>Last sign-in</th>
                    {isAdmin && <th />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className={u.is_active ? '' : 'is-inactive'}>
                      <td>
                        <div className="cell-main">{u.full_name} {!u.is_active && <Stamp>Inactive</Stamp>}</div>
                        <div className="cell-sub">{u.email}{u.employee_code ? ` · ${u.employee_code}` : ''}</div>
                      </td>
                      <td><Stamp tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Stamp></td>
                      <td>{u.department_name || <span className="muted">—</span>}</td>
                      <td>{u.designation_name || <span className="muted">—</span>}</td>
                      <td className="num">{u.designation_name ? (u.approval_limit == null ? 'Unlimited' : inr(u.approval_limit)) : '—'}</td>
                      <td>{u.manager_name || <span className="muted">—</span>}</td>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{dateTime(u.last_login_at)}</td>
                      {isAdmin && (
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-quiet btn-sm" onClick={() => setForm(u)} aria-label={`Edit ${u.full_name}`}><Icon name="edit" size={16} /></button>
                            {u.id !== user.id && (
                              <button className="btn btn-quiet btn-sm" onClick={() => setToggle(u)}>{u.is_active ? 'Deactivate' : 'Reactivate'}</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      {form && (
        <EmployeeForm
          initial={form === 'new' ? null : form}
          departments={departments}
          designations={designations}
          users={users || []}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(); }}
        />
      )}

      {toggle && (
        <ConfirmDialog
          title={toggle.is_active ? 'Deactivate employee?' : 'Reactivate employee?'}
          message={toggle.is_active
            ? `${toggle.full_name} will be signed out and will no longer be able to sign in. Their history stays on record.`
            : `${toggle.full_name} will be able to sign in again.`}
          confirmLabel={toggle.is_active ? 'Deactivate' : 'Reactivate'}
          danger={toggle.is_active}
          busy={busy}
          onConfirm={confirmToggle}
          onClose={() => setToggle(null)}
        />
      )}
    </>
  );
}
