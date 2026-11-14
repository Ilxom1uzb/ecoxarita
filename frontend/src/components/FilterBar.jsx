import { WASTE_TYPES } from '../wasteTypes.js';
import { useI18n } from '../context.jsx';

export const filterParams = (f) => ({
  ...(f.type && { type: f.type }),
  ...(f.onlyOpen && { onlyOpen: '1' }),
  ...(f.status && { status: f.status }),
});

export default function FilterBar({ filters, setFilters }) {
  const { t, lang } = useI18n();
  const toggleType = (id) => setFilters({ ...filters, type: filters.type === id ? null : id });
  return (
    <div className="chips" role="toolbar">
      <button className={`chip ${!filters.type ? 'on' : ''}`} onClick={() => setFilters({ ...filters, type: null })}>
        {t('all')}
      </button>
      {WASTE_TYPES.map((w) => (
        <button key={w.id} className={`chip ${filters.type === w.id ? 'on' : ''}`} onClick={() => toggleType(w.id)}>
          <i className="dot" style={{ background: w.color }} />
          {w.label[lang]}
        </button>
      ))}
      <button
        className={`chip ${filters.onlyOpen ? 'on' : ''}`}
        onClick={() => setFilters({ ...filters, onlyOpen: !filters.onlyOpen })}
      >
        {t('onlyOpen')}
      </button>
    </div>
  );
}
