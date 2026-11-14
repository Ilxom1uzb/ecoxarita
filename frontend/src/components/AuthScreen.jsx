import { useEffect, useState } from 'react';
import { api, setToken } from '../api.js';
import { useI18n, errText } from '../context.jsx';
import LangSwitch from './LangSwitch.jsx';
import { Icon } from './Icon.jsx';

const RESEND_SEC = 60;

export default function AuthScreen({ onAuth }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('login'); // login | register
  const [step, setStep] = useState('form'); // form | code
  const [purpose, setPurpose] = useState(null); // login | register (serverdan keladi)
  const [form, setForm] = useState({ name: '', email: '', password: '', password2: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const email = form.email.trim().toLowerCase();

  // Kod so'rovi: parol tekshiriladi va kod yuboriladi
  async function requestCode() {
    const res =
      mode === 'register'
        ? await api.register({ name: form.name.trim(), email, password: form.password })
        : await api.login({ email, password: form.password });
    setPurpose(res.pending);
    setCooldown(RESEND_SEC);
    return res;
  }

  async function submitForm(e) {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (form.name.trim().length < 2) return setError(t('err_validation'));
      if (form.password.length < 8) return setError(t('pwdShort'));
      if (form.password !== form.password2) return setError(t('passMismatch'));
    }
    setBusy(true);
    try {
      await requestCode();
      setCode('');
      setStep('code');
    } catch (err) {
      setError(errText(t, err));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) return setError(t('err_code_invalid'));
    setBusy(true);
    try {
      const verify = purpose === 'register' ? api.registerVerify : api.loginVerify;
      const res = await verify({ email, code });
      setToken(res.token);
      onAuth(res.user);
    } catch (err) {
      setError(errText(t, err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    setBusy(true);
    try {
      await requestCode();
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
          <span className="brand-mark">
            <Icon name="leaf" size={22} strokeWidth={2.2} />
          </span>
          <div>
            <h1>EcoXarita</h1>
            <p className="muted">{t('tagline')}</p>
          </div>
        </div>

        {step === 'form' && (
          <form onSubmit={submitForm} noValidate>
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
            <p className="switch muted">
              {mode === 'login' ? t('noAccount') : ''}{' '}
              <button
                type="button"
                className="link"
                onClick={() => {
                  setError('');
                  setMode(mode === 'login' ? 'register' : 'login');
                }}
              >
                {mode === 'login' ? t('signUp') : t('haveAccount')}
              </button>
            </p>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} noValidate>
            <div className="code-head">
              <span className="code-ico">
                <Icon name="shield" size={22} />
              </span>
              <div>
                <h3>{t('codeTitle')}</h3>
                <p className="muted">{t('codeSent', { email })}</p>
                <p className="muted small">{t('codeSpam')}</p>
              </div>
            </div>

            <Field label={t('enterCode')}>
              <input
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
            </Field>

            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn primary block" disabled={busy || code.length !== 6}>
              {t('verify')}
            </button>

            <div className="row-between code-foot">
              <button type="button" className="link" onClick={() => { setStep('form'); setError(''); }}>
                {t('back')}
              </button>
              <button type="button" className="link" onClick={resend} disabled={busy || cooldown > 0}>
                {cooldown > 0 ? t('resendIn', { s: cooldown }) : t('resend')}
              </button>
            </div>
          </form>
        )}
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
