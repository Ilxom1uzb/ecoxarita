import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n, errText } from '../context.jsx';
import { WASTE_TYPES, unitLabel } from '../wasteTypes.js';

export default function StatsView() {
  const { t, lang } = useI18n();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.stats().then(setS).catch((e) => setError(errText(t, e)));
  }, [t]);

  if (error) return <div className="empty">{error}</div>;
  if (!s) return <div className="empty">{t('loading')}</div>;

  const byType = WASTE_TYPES.map((w) => ({ ...w, count: s.byType[w.id] || 0 })).filter((w) => w.count > 0);
  const sum = byType.reduce((a, w) => a + w.count, 0);

  let acc = 0;
  const stops = byType.map((w) => {
    const from = (acc / sum) * 100;
    acc += w.count;
    return `${w.color} ${from}% ${(acc / sum) * 100}%`;
  });
  const donut = sum ? { background: `conic-gradient(${stops.join(', ')})` } : { background: 'var(--line)' };

  const maxMonth = Math.max(1, ...s.byMonth.map((m) => m.count));
  const volumes = Object.entries(s.volumeByUnit);

  return (
    <div className="page">
      <div className="kpi-grid">
        <Kpi value={s.totals.total} label={t('totalReports')} />
        <Kpi value={s.totals.open} label={t('openReports')} />
        <Kpi value={s.totals.cleaned} label={t('cleanedReports')} />
        <Kpi value={s.avgCleanHours == null ? '—' : `${s.avgCleanHours.toFixed(1)} ${t('hours')}`} label={t('avgCleanTime')} small />
      </div>

      <h3 className="section">{t('byType')}</h3>
      {sum === 0 ? (
        <p className="muted">{t('noData')}</p>
      ) : (
        <div className="donut-row">
          <div className="donut" style={donut} aria-hidden="true" />
          <ul className="legend">
            {byType.map((w) => (
              <li key={w.id}>
                <i className="dot" style={{ background: w.color }} /> {w.label[lang]}: <b>{w.count}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="section">{t('byMonth')}</h3>
      <div className="bars" role="img" aria-label={t('byMonth')}>
        {s.byMonth.map((m) => (
          <div className="bar-col" key={m.month} title={`${m.month}: ${m.count}`}>
            <div className="bar" style={{ height: `${(m.count / maxMonth) * 100}%` }} />
            <span>{m.month.slice(5)}</span>
          </div>
        ))}
      </div>

      <h3 className="section">{t('totalVolume')}</h3>
      {volumes.length ? (
        <ul className="plain">
          {volumes.map(([unit, v]) => (
            <li key={unit}>
              {Number(v).toFixed(1)} {unitLabel(unit, lang)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('noData')}</p>
      )}
    </div>
  );
}

function Kpi({ value, label, small }) {
  return (
    <div className="kpi">
      <b className={small ? 'small' : ''}>{value}</b>
      <span>{label}</span>
    </div>
  );
}
