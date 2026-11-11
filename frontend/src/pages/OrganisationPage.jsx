import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Icon from '../components/Icon';
import { ConfirmDialog, Modal } from '../components/Modal';
import { EmptyState, ErrorState, Field, SkeletonRows, Stamp } from '../components/ui';
import { inr } from '../utils/format';

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const invalidMoney = (v) => v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0);

/* ---------------- Department form ---------------- */
function DepartmentForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    name: initial?.name ?? '', code: initial?.code ?? '',
    monthly_budget: initial?.monthly_budget ?? '', spending_limit: initial?.spending_limit ?? '',
    is_active: initial?.is_active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter a department name';
    if (f.code.trim().length < 2) er.code = 'Enter a short code';
    if (invalidMoney(f.monthly_budget)) er.monthly_budget = 'Enter a valid amount';
    if (invalidMoney(f.spending_limit)) er.spending_limit = 'Enter a valid amount';
    setErrors(er);
    if (Object.keys(er).length) return;

    setBusy(true);
    const body = {
      name: f.name.trim(), code: f.code.trim(),
      monthly_budget: numOrNull(f.monthly_budget), spending_limit: numOrNull(f.spending_limit),
      is_active: f.is_active,
    };
    try {
      if (initial) await api.updateDepartment(initial.id, body); else await api.createDepartment(body);
      toast.success(initial ? 'Department updated' : 'Department added');
      onSaved();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  return (
    <Modal
      title={initial ? 'Edit department' : 'Add department'} onClose={onClose}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" form="dept-form" className="btn btn-primary" disabled={busy}>{busy && <span className="spinner" />} Save</button>
      </>}
    >
      <form id="dept-form" className="modal-body" onSubmit={submit} noValidate>
        {formError && <div className="form-error" role="alert">{formError}</div>}
        <div className="form-grid">
          <Field label="Name" error={errors.name}><input className="input" value={f.name} onChange={set('name')} autoFocus /></Field>
          <Field label="Code" error={errors.code}><input className="input" value={f.code} onChange={set('code')} style={{ textTransform: 'uppercase' }} /></Field>
          <Field label="Monthly budget (₹)" error={errors.monthly_budget} hint="Optional"><input className="input" inputMode="decimal" value={f.monthly_budget} onChange={set('monthly_budget')} /></Field>
          <Field label="Per-invoice limit (₹)" error={errors.spending_limit} hint="Optional. Invoices above this escalate"><input className="input" inputMode="decimal" value={f.spending_limit} onChange={set('spending_limit')} /></Field>
          <Field label="Status" className="span-2">
            <select className="select" value={f.is_active ? '1' : '0'} onChange={(e) => setF((s) => ({ ...s, is_active: e.target.value === '1' }))}>
              <option value="1">Active</option><option value="0">Inactive</option>
            </select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Designation form ---------------- */
function DesignationForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    name: initial?.name ?? '', level_rank: initial?.level_rank ?? '',
    approval_limit: initial?.approval_limit ?? '', unlimited: initial ? initial.approval_limit == null : false,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter a designation name';
    const rank = Number(f.level_rank);
    if (!Number.isInteger(rank) || rank < 1 || rank > 20) er.level_rank = 'Whole number from 1 to 20';
    if (!f.unlimited && (f.approval_limit === '' || invalidMoney(f.approval_limit))) er.approval_limit = 'Enter an amount, or tick unlimited';
    setErrors(er);
    if (Object.keys(er).length) return;

    setBusy(true);
    const body = { name: f.name.trim(), level_rank: rank, approval_limit: f.unlimited ? null : Number(f.approval_limit) };
    try {
      if (initial) await api.updateDesignation(initial.id, body); else await api.createDesignation(body);
      toast.success(initial ? 'Designation updated' : 'Designation added');
      onSaved();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  return (
    <Modal
      title={initial ? 'Edit designation' : 'Add designation'} onClose={onClose}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" form="desig-form" className="btn btn-primary" disabled={busy}>{busy && <span className="spinner" />} Save</button>
      </>}
    >
      <form id="desig-form" className="modal-body" onSubmit={submit} noValidate>
        {formError && <div className="form-error" role="alert">{formError}</div>}
        <div className="form-grid">
          <Field label="Name" error={errors.name}><input className="input" value={f.name} onChange={set('name')} autoFocus /></Field>
          <Field label="Seniority rank" error={errors.level_rank} hint="Higher number = more senior"><input className="input" inputMode="numeric" value={f.level_rank} onChange={set('level_rank')} /></Field>
          <Field label="Approval limit (₹)" error={errors.approval_limit} className="span-2">
            <input className="input" inputMode="decimal" value={f.unlimited ? '' : f.approval_limit} onChange={set('approval_limit')} disabled={f.unlimited} placeholder={f.unlimited ? 'No limit' : ''} />
          </Field>
          <label className="span-2" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={f.unlimited} onChange={(e) => setF((s) => ({ ...s, unlimited: e.target.checked }))} />
            Unlimited approval authority
          </label>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Page ---------------- */
export default function OrganisationPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === 'admin';

  const [tab, setTab] = useState('departments');
  const [depts, setDepts] = useState(null);
  const [desigs, setDesigs] = useState(null);
  const [error, setError] = useState('');
  const [deptForm, setDeptForm] = useState(null);
  const [desigForm, setDesigForm] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [d, g] = await Promise.all([api.departments(), api.designations()]);
      setDepts(d); setDesigs(g);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteDepartment(removing.id);
      toast.success(`${removing.name} deleted`);
      setRemoving(null);
      await load();
    } catch (e) { toast.error(e.message); setRemoving(null); } finally { setBusy(false); }
  };

  const loading = !depts && !error;

  return (
    <>
      <header className="page-head">
        <div>
          <div className="page-eyebrow">Organisation</div>
          <h1 className="page-title">Departments &amp; authority</h1>
          <p className="page-sub">The structure that approval rules and spending limits are built on.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => (tab === 'departments' ? setDeptForm('new') : setDesigForm('new'))}>
            <Icon name="plus" size={16} /> {tab === 'departments' ? 'Add department' : 'Add designation'}
          </button>
        )}
      </header>

      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={tab === 'departments'} onClick={() => setTab('departments')}>Departments</button>
        <button className="tab" role="tab" aria-selected={tab === 'designations'} onClick={() => setTab('designations')}>Designations &amp; limits</button>
      </div>

      <section className="sheet">
        {error ? <ErrorState message={error} onRetry={load} /> : loading ? <SkeletonRows rows={5} cols={5} /> : tab === 'departments' ? (
          depts.length === 0 ? <EmptyState title="No departments" text="Add the departments your invoices are charged to." /> : (
            <div className="table-wrap">
              <table className="ledger">
                <thead><tr><th>Department</th><th>Code</th><th className="num">Monthly budget</th><th className="num">Per-invoice limit</th><th className="num">Members</th><th>Status</th>{isAdmin && <th />}</tr></thead>
                <tbody>
                  {depts.map((d) => (
                    <tr key={d.id} className={d.is_active ? '' : 'is-inactive'}>
                      <td className="cell-main">{d.name}</td>
                      <td className="mono">{d.code}</td>
                      <td className="num">{d.monthly_budget == null ? '—' : inr(d.monthly_budget)}</td>
                      <td className="num">{d.spending_limit == null ? '—' : inr(d.spending_limit)}</td>
                      <td className="num">{d.member_count}</td>
                      <td><Stamp tone={d.is_active ? 'ok' : 'neutral'}>{d.is_active ? 'Active' : 'Inactive'}</Stamp></td>
                      {isAdmin && (
                        <td><div className="row-actions">
                          <button className="btn btn-quiet btn-sm" onClick={() => setDeptForm(d)} aria-label={`Edit ${d.name}`}><Icon name="edit" size={16} /></button>
                          <button className="btn btn-quiet btn-sm" onClick={() => setRemoving(d)} aria-label={`Delete ${d.name}`}><Icon name="trash" size={16} /></button>
                        </div></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          desigs.length === 0 ? <EmptyState title="No designations" text="Designations carry approval limits." /> : (
            <div className="table-wrap">
              <table className="ledger">
                <thead><tr><th className="num" style={{ width: 90 }}>Rank</th><th>Designation</th><th className="num">Approval limit</th><th className="num">Members</th>{isAdmin && <th />}</tr></thead>
                <tbody>
                  {desigs.map((g) => (
                    <tr key={g.id}>
                      <td className="num">{g.level_rank}</td>
                      <td className="cell-main">{g.name}</td>
                      <td className="num">{g.approval_limit == null ? 'Unlimited' : inr(g.approval_limit)}</td>
                      <td className="num">{g.member_count}</td>
                      {isAdmin && <td><div className="row-actions"><button className="btn btn-quiet btn-sm" onClick={() => setDesigForm(g)} aria-label={`Edit ${g.name}`}><Icon name="edit" size={16} /></button></div></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      {deptForm && <DepartmentForm initial={deptForm === 'new' ? null : deptForm} onClose={() => setDeptForm(null)} onSaved={() => { setDeptForm(null); load(); }} />}
      {desigForm && <DesignationForm initial={desigForm === 'new' ? null : desigForm} onClose={() => setDesigForm(null)} onSaved={() => { setDesigForm(null); load(); }} />}
      {removing && (
        <ConfirmDialog
          title="Delete department?" danger busy={busy} confirmLabel="Delete" onConfirm={remove} onClose={() => setRemoving(null)}
          message={`${removing.name} will be removed permanently. Departments with employees or invoices cannot be deleted; deactivate them instead.`}
        />
      )}
    </>
  );
}
