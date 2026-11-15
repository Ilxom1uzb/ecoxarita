import { useCallback, useEffect, useState } from 'react';
import { api, mediaUrl } from '../api.js';
import { useI18n, useToast, errText } from '../context.jsx';
import { UNITS, STATUS_IDS, wasteColor, wasteLabel, unitLabel } from '../wasteTypes.js';
import Sheet from './Sheet.jsx';

const STATUS_ACTIONS = { new: 'markNew', in_progress: 'markInProgress', cleaned: 'markCleaned', hidden: 'markHidden' };

export default function ReportSheet({ id, user, onClose, onChanged }) {
  const { t, lang } = useI18n();
  const { notify } = useToast();
  const [r, setR] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const isMod = user.role === 'moderator' || user.role === 'admin';

  const load = useCallback(() => {
    api.report(id).then(setR).catch((e) => setError(errText(t, e)));
    api.events(id).then((d) => setEvents(d.items)).catch(() => {});
  }, [id, t]);

  useEffect(load, [load]);

  // Har qanday amaldan keyin: ro'yxatni yangilash va sheetni qayta yuklash
  async function run(action, successMsg) {
    setBusy(true);
    setError('');
    try {
      await action();
      if (successMsg) notify(successMsg);
      onChanged();
      load();
      return true;
    } catch (e) {
      setError(errText(t, e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const confirmReport = () => run(() => api.confirm(id), t('confirmedOk'));

  const removeReport = async () => {
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusy(true);
    try {
      await api.deleteReport(id);
      notify(t('delete'));
      onChanged();
      onClose();
    } catch (e) {
      setError(errText(t, e));
      setBusy(false);
    }
  };

  const saveEdit = () => {
    const vol = Number(edit.volume_value);
    if (!(vol > 0) || vol > 100000) return setError(t('volErr'));
    run(
      () => api.updateReport(id, { volume_value: vol, volume_unit: edit.volume_unit, address: edit.address, description: edit.description }),
      t('saved')
    ).then((ok) => ok && setEditing(false));
  };

  const setStatus = (status) => {
    if (status === r.status) return;
    run(() => api.setStatus(id, { status, note }), t('saved')).then((ok) => ok && setNote(''));
  };

  if (!r) {
    return (
      <Sheet title={t('loading')} onClose={onClose}>
        {error && <p className="error">{error}</p>}
      </Sheet>
    );
  }

  const isOwner = r.is_mine;
  const canEdit = isOwner && r.status === 'new';

  return (
    <Sheet title={wasteLabel(r.waste_type, lang)} onClose={onClose}>
      <div className="detail">
        <span className="badge" style={{ background: wasteColor(r.waste_type) }}>
          {wasteLabel(r.waste_type, lang)}
        </span>
        <span className="pill">{t('status')}: {t(`status${label(r.status)}`)}</span>

        {r.photo_url && <img className="photo" src={mediaUrl(r.photo_url)} alt="" loading="lazy" />}

        {!editing && (
          <>
            <p className="big-line">
              {r.volume_value} {unitLabel(r.volume_unit, lang)}
            </p>
            {r.address && <p>{r.address}</p>}
            {r.description && <p className="pre">{r.description}</p>}
            <p className="meta">
              {t('createdAt')}: {new Date(r.created_at).toLocaleString(lang)}
              {r.cleaned_at && ` · ${t('cleanedAt')}: ${new Date(r.cleaned_at).toLocaleString(lang)}`}
            </p>
            <p className="meta">
              {t('coords')}: {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
            </p>
          </>
        )}

        {editing && edit && (
          <div className="form">
            <div className="row gap">
              <label className="field grow">
                <span>{t('volume')}</span>
                <input inputMode="decimal" value={edit.volume_value} onChange={(e) => setEdit({ ...edit, volume_value: e.target.value })} />
              </label>
              <label className="field">
                <span>{t('unit')}</span>
                <select value={edit.volume_unit} onChange={(e) => setEdit({ ...edit, volume_unit: e.target.value })}>
                  {UNITS.map((u) => <option key={u.id} value={u.id}>{u.label[lang]}</option>)}
                </select>
              </label>
            </div>
            <label className="field">
              <span>{t('address')}</span>
              <input maxLength={200} value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
            </label>
            <label className="field">
              <span>{t('description')}</span>
              <textarea rows={3} maxLength={500} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </label>
            <div className="row gap">
              <button className="btn ghost grow" onClick={() => setEditing(false)}>{t('cancel')}</button>
              <button className="btn primary grow" onClick={saveEdit} disabled={busy}>{t('save')}</button>
            </div>
          </div>
        )}

        <p className="meta">👍 {t('confirmations')}: {r.confirmations}</p>

        {error && <p className="error" role="alert">{error}</p>}

        {!isOwner && r.status !== 'cleaned' && (
          r.confirmed_by_me ? (
            <p className="muted">{t('confirmedAlready')}</p>
          ) : (
            <button className="btn primary block" onClick={confirmReport} disabled={busy}>
              {t('confirmThis')}
            </button>
          )
        )}

        {isOwner && !editing && (
          <div className="row gap">
            {canEdit ? (
              <>
                <button className="btn ghost grow" onClick={() => { setEdit({ volume_value: String(r.volume_value), volume_unit: r.volume_unit, address: r.address, description: r.description }); setEditing(true); }}>
                  {t('edit')}
                </button>
                <button className="btn danger grow" onClick={removeReport} disabled={busy}>{t('delete')}</button>
              </>
            ) : (
              <p className="muted">{t('ownLocked')}</p>
            )}
          </div>
        )}

        {isMod && (
          <section className="mod">
            <h4>{t('tabAdmin')}</h4>
            <label className="field">
              <span>{t('reason')}</span>
              <input value={note} maxLength={300} placeholder={t('reasonPlaceholder')} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="chips">
              {STATUS_IDS.filter((s) => s !== r.status).map((s) => (
                <button key={s} className="chip" onClick={() => setStatus(s)} disabled={busy}>
                  {t(STATUS_ACTIONS[s])}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="history">
          <h4>{t('history')}</h4>
          {!events.length && <p className="muted">{t('noHistory')}</p>}
          <ul>
            {events.map((e, i) => (
              <li key={i}>
                <b>{t(`status${label(e.new_status)}`)}</b>
                <span className="meta"> · {new Date(e.created_at).toLocaleString(lang)} · {t(`role_${e.actor_role}`)}</span>
                {e.note && <div className="meta">{e.note}</div>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Sheet>
  );
}

const label = (s) => ({ new: 'New', in_progress: 'InProgress', cleaned: 'Cleaned', hidden: 'Hidden' }[s] || 'New');
