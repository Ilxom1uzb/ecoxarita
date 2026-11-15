import { WASTE_TYPES, wasteColor } from '../wasteTypes.js';
import { useI18n } from '../context.jsx';
import { Icon, WASTE_ICON } from './Icon.jsx';

export const filterParams = (f) => ({
  ...(f.type && { type: f.type }),
  ...(f.onlyOpen && { onlyOpen: '1' }),
  ...(f.status && { status: f.status }),
});

export default function FilterBar({ filters, setFilters }) {
  const { t, lang } = useI18n();
  const pick = (id) => setFilters({ ...filters, type: filters.type === id ? null : id });
  return (
    <div className="chips" role="toolbar">
      <button className={`chip ${!filters.type ? 'on' : ''}`} onClick={() => setFilters({ ...filters, type: null })}>
        <Icon name="map" size={15} />
        {t('all')}
      </button>
      {WASTE_TYPES.map((w) => (
        <button
          key={w.id}
          className={`chip ${filters.type === w.id ? 'on' : ''}`}
          style={{ '--c': wasteColor(w.id) }}
          onClick={() => pick(w.id)}
        >
          <Icon name={WASTE_ICON[w.id]} size={15} />
          {w.label[lang]}
        </button>
      ))}
      <button
        className={`chip ${filters.onlyOpen ? 'on' : ''}`}
        onClick={() => setFilters({ ...filters, onlyOpen: !filters.onlyOpen })}
      >
        <Icon name="clock" size={15} />
        {t('onlyOpen')}
      </button>
    </div>
  );
}
