import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EmptyState, ErrorState, useCountUp } from '../components/ui';
import SpendChart from '../components/SpendChart';
import { inrCompact, STATUS_LABEL } from '../utils/format';

function Figure({ label, value, money = false, note }) {
  const shown = useCountUp(value);
  return (
    <div className="figure">
      <div className="figure-label">{label}</div>
      <div className="figure-value">{money ? inrCompact(shown) : Math.round(shown).toLocaleString('en-IN')}</div>
      {note && <div className="figure-note">{note}</div>}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api.summary().then(setData).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const first = user.full_name.split(' ')[0];

  const t = data?.totals;
  const maxStatus = data ? Math.max(1, ...data.by_status.map((s) => s.count)) : 1;

  return (
    <>
      <header className="page-head">
        <div>
          <div className="page-eyebrow">{today}</div>
          <h1 className="page-title">{greeting()}, <em>{first}</em></h1>
          <p className="page-sub">
            {data?.scope === 'personal' ? 'The invoices you have submitted, at a glance.' : `The books at ${user.company_name}, at a glance.`}
          </p>
        </div>
      </header>

      {error && <div className="sheet"><ErrorState message={error} onRetry={load} /></div>}

      {!error && (
        <>
          <section className="figures" aria-label="Key figures">
            <Figure label="Invoices" value={t?.invoices} note="all time" />
            <Figure label="Invoice value" value={t?.invoice_value} money note="across all statuses" />
            <Figure label="Pending approval" value={t?.pending_approval} note="awaiting a decision" />
            <Figure label="Amount on hold" value={t?.amount_on_hold} money note="under investigation" />
          </section>

          <div className="dash-grid">
            <section className="sheet">
              <div className="sheet-head">
                <h2 className="sheet-title">Monthly spend</h2>
                <span className="sheet-note">LAST 12 MONTHS</span>
              </div>
              <div className="sheet-body">
                {!data ? (
                  <span className="skeleton" style={{ height: 300 }} />
                ) : data.monthly.length === 0 ? (
                  <EmptyState title="No invoices on the books yet" text="Once invoices are recorded, spend by month will appear here." />
                ) : (
                  <SpendChart data={data.monthly} />
                )}
              </div>
            </section>

            <div style={{ display: 'grid', gap: 24 }}>
              <section className="sheet">
                <div className="sheet-head"><h2 className="sheet-title">Status ledger</h2></div>
                <div className="sheet-body">
                  {!data ? (
                    <span className="skeleton" style={{ height: 80 }} />
                  ) : data.by_status.length === 0 ? (
                    <p className="muted">Nothing to tally yet.</p>
                  ) : (
                    <div className="status-list">
                      {data.by_status.map((s) => (
                        <div className="status-row" key={s.status}>
                          <span>{STATUS_LABEL[s.status] || s.status}</span>
                          <span className="mono">{s.count}</span>
                          <div className="status-bar"><i style={{ width: `${(s.count / maxStatus) * 100}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {data?.organisation && (
                <section className="sheet">
                  <div className="sheet-head"><h2 className="sheet-title">Organisation</h2></div>
                  <div className="sheet-body org-lines">
                    <div className="org-line"><span>Active employees</span><b>{data.organisation.employees}</b></div>
                    <div className="org-line"><span>Departments</span><b>{data.organisation.departments}</b></div>
                    <div className="org-line"><span>Vendors</span><b>{data.organisation.vendors}</b></div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
