import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n, useToast, errText } from '../context.jsx';
import { WASTE_TYPES, UNITS, wasteColor } from '../wasteTypes.js';
import { Icon, WASTE_ICON } from './Icon.jsx';
import Sheet from './Sheet.jsx';

const MAX_PHOTO = 5 * 1024 * 1024;
const MAX_VOL = 100000;

export default function AddReportSheet({ center, onClose, onCreated }) {
  const { t, lang } = useI18n();
  const { notify } = useToast();
  const [form, setForm] = useState({ waste_type: 'plastic', volume_value: '', volume_unit: 'kg', address: '', description: '' });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
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
    // Ondalik vergul (1,5) ham qabul qilinadi
    const vol = Number(String(form.volume_value).trim().replace(',', '.'));
    if (!(vol > 0) || vol > MAX_VOL) return setError(t('volErr'));
    if (!center) return setError(t('locateFail'));

    const fd = new FormData();
    fd.append('waste_type', form.waste_type);
    fd.append('volume_value', String(vol));
    fd.append('volume_unit', form.volume_unit);
    fd.append('lat', String(center.lat));
    fd.append('lng', String(center.lng));
    fd.append('address', form.address.trim());
    fd.append('description', form.description.trim());
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
        {center && (
          <div className="coord-chip">
            <Icon name="pin" size={15} />
            {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
          </div>
        )}

        <div className="field">
          <span>{t('type')}</span>
          <div className="type-grid">
            {WASTE_TYPES.map((w) => (
              <button
                type="button"
                key={w.id}
                className={`type-opt ${form.waste_type === w.id ? 'on' : ''}`}
                style={{ '--c': wasteColor(w.id) }}
                onClick={() => setForm((f) => ({ ...f, waste_type: w.id }))}
              >
                <Icon name={WASTE_ICON[w.id]} size={20} />
                <small>{w.label[lang]}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="row gap">
          <label className="field grow">
            <span>{t('volume')}</span>
            <input inputMode="decimal" placeholder="0" value={form.volume_value} onChange={set('volume_value')} required />
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
              <Icon name="camera" size={20} />
              {t('choosePhoto')}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={pickPhoto} hidden />
            </label>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary block" disabled={busy}>
          <Icon name="check" size={18} strokeWidth={2.4} />
          {t('submit')}
        </button>
      </form>
    </Sheet>
  );
}
