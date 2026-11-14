import { useState } from 'react';
import { api, setToken } from '../api.js';
import { useI18n, errText } from '../context.jsx';
import LangSwitch from './LangSwitch.jsx';

export default function AuthScreen({ onAuth }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (form.name.trim().length < 2) return setError(t('err_validation'));
      if (form.password.length < 8) return setError(t('pwdShort'));
      if (form.password !== form.password2) return setError(t('passMismatch'));
    }
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await api.login({ email: form.email, password: form.password })
          : await api.register({ name: form.name.trim(), email: form.email, password: form.password });
      setToken(res.token);
      onAuth(res.user);
    } catch (err) {
      setError(errText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-top">
          <LangSwitch />
        </div>
        <div className="brand big">
          <Logo />
          <div>
            <h1>EcoXarita</h1>
            <p className="muted">{t('tagline')}</p>
          </div>
        </div>

        <form onSubmit={submit} noValidate>
          {mode === 'register' && (
            <Field label={t('name')}>
              <input value={form.name} onChange={set('name')} autoComplete="name" maxLength={60} required />
            </Field>
          )}
          <Field label={t('email')}>
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
          </Field>
          <Field label={t('password')}>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </Field>
          {mode === 'register' && (
            <Field label={t('confirmPassword')}>
              <input type="password" value={form.password2} onChange={set('password2')} autoComplete="new-password" required />
            </Field>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary block" disabled={busy}>
            {mode === 'login' ? t('signIn') : t('signUp')}
          </button>
        </form>

        <p className="switch muted">
          {mode === 'login' ? t('noAccount') : ''}{' '}
          <button className="link" onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
            {mode === 'login' ? t('signUp') : t('haveAccount')}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="17" fill="#2F6E4E" />
      <path d="M9 20c3-7 10-10 16-9-1 6-6 11-13 12-2 .3-3.3-1.3-3-3z" fill="#fff" />
    </svg>
  );
}
