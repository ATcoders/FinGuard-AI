import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Field } from '../components/ui';
import Icon from '../components/Icon';
import { EMAIL_RE, passwordProblem } from '../utils/format';

const POINTS = [
  ['01', 'Every invoice read, matched and checked against your own policy.'],
  ['02', 'Approvals that follow your hierarchy, enforced on the server.'],
  ['03', 'Anomalies flagged for a human, never paid on a model’s say-so.'],
];

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ company_name: '', full_name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!EMAIL_RE.test(form.email)) er.email = 'Enter a valid email address';
    if (mode === 'register') {
      if (form.company_name.trim().length < 2) er.company_name = 'Enter your company name';
      if (form.full_name.trim().length < 2) er.full_name = 'Enter your full name';
      const pw = passwordProblem(form.password);
      if (pw) er.password = pw;
    } else if (!form.password) er.password = 'Enter your password';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m) => { setMode(m); setErrors({}); setFormError(''); };

  return (
    <div className="auth">
      <section className="auth-aside">
        <div className="brand" style={{ padding: 0, border: 0 }}>
          <div className="brand-mark" style={{ color: 'var(--brass)' }}><Icon name="mark" size={18} stroke={2} /></div>
          <div className="brand-name">Fin<em>Guard</em></div>
        </div>
        <div>
          <h1 className="auth-headline">Every rupee, <em>accounted for.</em></h1>
          <div className="auth-points">
            {POINTS.map(([n, t]) => (
              <div className="auth-point" key={n}><span>{n}</span><p>{t}</p></div>
            ))}
          </div>
        </div>
        <div className="auth-foot">Invoice intelligence &amp; financial governance</div>
      </section>

      <section className="auth-main">
        <div className="auth-card">
          <h2>{mode === 'login' ? 'Sign in' : 'Open a workspace'}</h2>
          <p className="lede">
            {mode === 'login'
              ? 'Pick up where your team left off.'
              : 'Create your company workspace. You will be its administrator.'}
          </p>

          <form className="auth-form" onSubmit={submit} noValidate>
            {formError && <div className="form-error" role="alert">{formError}</div>}

            {mode === 'register' && (
              <>
                <Field label="Company" error={errors.company_name}>
                  <input className="input" value={form.company_name} onChange={set('company_name')} autoComplete="organization" />
                </Field>
                <Field label="Your name" error={errors.full_name}>
                  <input className="input" value={form.full_name} onChange={set('full_name')} autoComplete="name" />
                </Field>
              </>
            )}

            <Field label="Work email" error={errors.email}>
              <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
            </Field>
            <Field label="Password" error={errors.password} hint={mode === 'register' ? 'At least 8 characters, mixing letters and numbers' : undefined}>
              <input
                className="input" type="password" value={form.password} onChange={set('password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </Field>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy && <span className="spinner" />}
              {mode === 'login' ? 'Sign in' : 'Create workspace'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? (
              <>New company? <button type="button" onClick={() => switchMode('register')}>Open a workspace</button></>
            ) : (
              <>Already registered? <button type="button" onClick={() => switchMode('login')}>Sign in</button></>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
