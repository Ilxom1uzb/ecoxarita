import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n, useToast, errText } from '../context.jsx';
import { wasteColor, wasteLabel, unitLabel } from '../wasteTypes.js';
import { filterParams } from './FilterBar.jsx';

const PAGE = 20;

export default function ReportList({ filters, mine = false, onOpen, refreshKey }) {
  const { t, lang } = useI18n();
  const { notify } = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const key = JSON.stringify(filters);

  // Filtr yoki ma'lumot o'zgarganda birinchi sahifani qayta yuklash
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const req = mine
      ? api.mine().then((d) => ({ items: d.items, hasMore: false }))
      : api.reports({ limit: PAGE, page: 1, ...filterParams(filters) });
    req
      .then((d) => {
        if (cancelled) return;
        setItems(d.items);
        setPage(1);
        setHasMore(d.hasMore);
      })
      .catch((e) => !cancelled && notify(errText(t, e)))
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, mine, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    const next = page + 1;
    setLoading(true);
    try {
      const d = await api.reports({ limit: PAGE, page: next, ...filterParams(filters) });
      setItems((x) => [...x, ...d.items]);
      setPage(next);
      setHasMore(d.hasMore);
    } catch (e) {
      notify(errText(t, e));
    } finally {
      setLoading(false);
    }
  }, [page, key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ready && !items.length) return <div className="empty">{t('emptyList')}</div>;

  return (
    <div className="report-list">
      {items.map((r) => (
        <button key={r.id} className="card report-card" onClick={() => onOpen(r.id)}>
          <div className="card-top">
            <span className="badge" style={{ background: wasteColor(r.waste_type) }}>
              {wasteLabel(r.waste_type, lang)}
            </span>
            <span className="pill">{t(`status${camel(r.status)}`)}</span>
          </div>
          <div className="meta">
            {r.volume_value} {unitLabel(r.volume_unit, lang)}
            {r.address ? ` · ${r.address}` : ''}
          </div>
          <div className="meta row-between">
            <span>{new Date(r.created_at).toLocaleDateString(lang)}</span>
            <span>
              👍 {r.confirmations}
              {r.is_mine && <b className="mine"> · {t('you')}</b>}
            </span>
          </div>
        </button>
      ))}
      {loading && <div className="muted center">{t('loading')}</div>}
      {hasMore && !loading && (
        <button className="btn ghost block" onClick={loadMore}>
          {t('loadMore')}
        </button>
      )}
    </div>
  );
}

const camel = (s) => ({ new: 'New', in_progress: 'InProgress', cleaned: 'Cleaned', hidden: 'Hidden' }[s] || 'New');
