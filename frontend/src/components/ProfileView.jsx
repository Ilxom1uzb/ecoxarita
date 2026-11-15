import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n, useToast, errText } from '../context.jsx';
import { Icon } from './Icon.jsx';
import ReportList from './ReportList.jsx';

// Ball: hisobot 10, har bir tasdiqlash 2, tozalangan hisobot +15
const LEVEL_MIN = [0, 50, 150, 400];
const pointsOf = (items) =>
  items.reduce((s, r) => s + 10 + r.confirmations * 2 + (r.status === 'cleaned' ? 15 : 0), 0);

export default function ProfileView({ user, onOpen, refreshKey, onLogout, onDeleted }) {
  const { t } = useI18n();
  const { notify } = useToast();
  const [pts, setPts] = useState(0);

  useEffect(() => {
    api.mine().then((d) => setPts(pointsOf(d.items))).catch(() => {});
  }, [refreshKey]);

  const idx = LEVEL_MIN.reduce((acc, min, i) => (pts >= min ? i : acc), 0);
  const cur = LEVEL_MIN[idx];
  const next = LEVEL_MIN[idx + 1];
  const progress = next ? Math.min(100, ((pts - cur) / (next - cur)) * 100) : 100;

  async function removeAccount() {
    if (!window.confirm(t('deleteAccountConfirm'))) return;
    try {
      await api.deleteMe();
      notify(t('accountDeleted'));
      onDeleted();
    } catch (e) {
      notify(errText(t, e));
    }
  }

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-top">
          <div className="avatar">{user.name.trim().charAt(0).toUpperCase()}</div>
          <div className="hero-text">
            <h2>{user.name}</h2>
            <div className="hero-sub">{user.email}</div>
          </div>
        </div>
        <div className="level-row">
          <span className="level-badge">
            <Icon name="star" size={14} strokeWidth={2.2} /> {t(`lvl${idx}`)}
          </span>
          <span className="hero-points">
            {pts} {t('points')}
          </span>
        </div>
        <div className="progress">
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="hero-sub">{next ? t('nextLevel', { n: next - pts }) : t('maxLevel')}</div>
      </section>

      <div className="row gap actions">
        <button className="btn ghost grow" onClick={onLogout}>
          <Icon name="logout" size={18} />
          {t('logout')}
        </button>
        <button className="btn danger grow" onClick={removeAccount}>
          <Icon name="trash" size={18} />
          {t('deleteAccount')}
        </button>
      </div>

      <h3 className="section">{t('myReports')}</h3>
      <ReportList mine onOpen={onOpen} refreshKey={refreshKey} />
    </div>
  );
}
