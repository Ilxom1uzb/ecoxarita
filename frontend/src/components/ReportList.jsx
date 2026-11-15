import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n, useToast, errText } from '../context.jsx';
import { wasteColor, wasteLabel, unitLabel } from '../wasteTypes.js';
import { filterParams } from './FilterBar.jsx';
import { Icon, WASTE_ICON } from './Icon.jsx';

const PAGE = 20;
const statusKey = (s) => ({ new: 'statusNew', in_progress: 'statusInProgress', cleaned: 'statusCleaned', hidden: 'statusHidden' }[s] || 'statusNew');

export default function ReportList({ filters, mine = false, onOpen, refreshKey }) {
  const { t, lang } = useI18n();
  const { notify } = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const key = JSON.stringify(filters);

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

  if (ready && !items.length) {
    return (
      <div className="empty">
        <span className="empty-ico">
          <Icon name="leaf" size={34} />
        </span>
        <p>{t('emptyList')}</p>
      </div>
    );
  }

  return (
    <div className="report-list">
      {items.map((r) => (
        <button key={r.id} className="card report-card" style={{ '--c': wasteColor(r.waste_type) }} onClick={() => onOpen(r.id)}>
          <span className="rc-icon">
            <Icon name={WASTE_ICON[r.waste_type]} size={22} />
          </span>
          <span className="rc-body">
            <span className="card-top">
              <span className="rc-title">{wasteLabel(r.waste_type, lang)}</span>
              <span className={`pill s-${r.status}`}>{t(statusKey(r.status))}</span>
            </span>
            <span className="meta-line">
              <b>
                {r.volume_value} {unitLabel(r.volume_unit, lang)}
              </b>
              {r.address && (
                <span className="addr">
                  <Icon name="pin" size={13} /> {r.address}
                </span>
              )}
            </span>
            <span className="foot">
              <span>
                <Icon name="clock" size={13} /> {new Date(r.created_at).toLocaleDateString(lang)}
              </span>
              <span>
                <Icon name="thumb" size={13} /> {r.confirmations}
              </span>
              {r.is_mine && <span className="mine-tag">{t('you')}</span>}
            </span>
          </span>
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
