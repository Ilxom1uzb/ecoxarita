import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n, useToast, errText } from '../context.jsx';
import { WASTE_TYPES, UNITS } from '../wasteTypes.js';
import Sheet from './Sheet.jsx';

const MAX_PHOTO = 5 * 1024 * 1024;

export default function AddReportSheet({ center, onClose, onCreated }) {
  const { t, lang } = useI18n();
  const { notify } = useToast();
  const [form, setForm] = useState({ waste_type: 'plastic', volume_value: '', volume_unit: 'kg', address: '', description: '' });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null);
  const [busy, setBusy] = useState(false);

  // Oldindan ko'rish URL'i xotira oqishisiz tozalanadi
  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError(t('err_unsupported_file'));
    if (file.size > MAX_PHOTO) return setError(t('err_file_too_large'));
    setError('');
    setPhoto(file);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const vol = Number(form.volume_value);
    if (!(vol > 0) || vol > 100000) return setError(t('volErr'));
    if (!center) return setError(t('locateFail'));

    const fd = new FormData();
    fd.append('waste_type', form.waste_type);
    fd.append('volume_value', String(vol));
    fd.append('volume_unit', form.volume_unit);
    fd.append('lat', String(center.lat));
    fd.append('lng', String(center.lng));
    fd.append('address', form.address);
    fd.append('description', form.description);
    if (photo) fd.append('photo', photo);

    setBusy(true);
    try {
      const report = await api.createReport(fd);
      notify(t('toastAdded'));
      onCreated(report);
    } catch (err) {
      if (err.code === 'duplicate') setDuplicate(err.data.duplicate);
      else setError(errText(t, err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmExisting() {
    setBusy(true);
    try {
      await api.confirm(duplicate.id);
      notify(t('confirmedOk'));
      onCreated(duplicate);
    } catch (err) {
      setError(errText(t, err));
      setDuplicate(null);
    } finally {
      setBusy(false);
    }
  }

  if (duplicate) {
    return (
      <Sheet title={t('existing')} onClose={onClose}>
        <p>{t('duplicateBody')}</p>
        <p className="meta">
          {duplicate.volume_value} {duplicate.volume_unit} · 👍 {duplicate.confirmations}
        </p>
        {error && <p className="error">{error}</p>}
        <div className="row gap">
          <button className="btn ghost grow" onClick={() => setDuplicate(null)}>{t('cancel')}</button>
          <button className="btn primary grow" onClick={confirmExisting} disabled={busy}>{t('confirm')}</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={t('addReport')} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <p className="meta">
          {t('pinHint')}
          {center && <> · {t('coords')}: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}</>}
        </p>

        <label className="field">
          <span>{t('type')}</span>
          <select value={form.waste_type} onChange={set('waste_type')}>
            {WASTE_TYPES.map((w) => <option key={w.id} value={w.id}>{w.label[lang]}</option>)}
          </select>
        </label>

        <div className="row gap">
          <label className="field grow">
            <span>{t('volume')}</span>
            <input inputMode="decimal" value={form.volume_value} onChange={set('volume_value')} required />
          </label>
          <label className="field">
            <span>{t('unit')}</span>
            <select value={form.volume_unit} onChange={set('volume_unit')}>
              {UNITS.map((u) => <option key={u.id} value={u.id}>{u.label[lang]}</option>)}
            </select>
          </label>
        </div>

        <label className="field">
          <span>{t('address')}</span>
          <input maxLength={200} value={form.address} onChange={set('address')} />
        </label>

        <label className="field">
          <span>{t('description')}</span>
          <textarea rows={3} maxLength={500} value={form.description} onChange={set('description')} />
          <small className="muted">{form.description.length}/500</small>
        </label>

        <div className="field">
          <span>{t('photo')}</span>
          {preview ? (
            <div className="preview">
              <img src={preview} alt="" />
              <button type="button" className="chip" onClick={() => setPhoto(null)}>{t('removePhoto')}</button>
            </div>
          ) : (
            <label className="file-pick">
              {t('choosePhoto')}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={pickPhoto} hidden />
            </label>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary block" disabled={busy}>{t('submit')}</button>
      </form>
    </Sheet>
  );
}
