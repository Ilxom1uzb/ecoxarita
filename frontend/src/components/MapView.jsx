import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, ZoomControl, Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api.js';
import { useI18n, useToast, errText } from '../context.jsx';
import { wasteColor } from '../wasteTypes.js';
import { Icon, ICONS, WASTE_ICON } from './Icon.jsx';
import FilterBar, { filterParams } from './FilterBar.jsx';

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const START = { center: [41.38, 64.59], zoom: 6 };
const MAX_MARKERS = 300;

// Marker ikonkalari: rang va ikonka faqat bizning konstantalardan keladi
const iconCache = {};
function pinIcon(type, status) {
  const key = `${type}:${status === 'cleaned' ? 'c' : 'o'}`;
  if (!iconCache[key]) {
    const paths = (ICONS[WASTE_ICON[type]] || []).map((d) => `<path d="${d}"/>`).join('');
    iconCache[key] = L.divIcon({
      className: 'pin-wrap',
      html: `<div class="pin ${status === 'cleaned' ? 'is-cleaned' : ''}" style="--c:${wasteColor(type)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></div>`,
      iconSize: [34, 42],
      iconAnchor: [17, 41],
    });
  }
  return iconCache[key];
}

// Xarita harakatlanganda ko'rinib turgan chegaralar va markazni uzatadi
function MapWatcher({ onChange }) {
  const map = useMap();
  const emit = () => {
    const b = map.getBounds();
    const c = map.getCenter();
    onChange({
      bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(','),
      center: { lat: c.lat, lng: c.lng },
    });
  };
  useMapEvents({ moveend: emit });
  useEffect(emit, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function LocateButton({ onLocated }) {
  const map = useMap();
  const { t } = useI18n();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);

  function locate() {
    if (!navigator.geolocation) return notify(t('locateFail'));
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setBusy(false);
        const pos = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
        onLocated(pos);
        map.flyTo([pos.lat, pos.lng], 17);
        const m = Math.round(coords.accuracy);
        notify(m > 100 ? t('accLow', { m }) : t('locOk', { m }));
      },
      (err) => {
        setBusy(false);
        notify(err.code === 1 ? t('locateDenied') : t('locateFail'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <button className="fab locate" onClick={locate} disabled={busy} aria-label={t('locate')} title={t('locate')}>
      <Icon name="locate" size={22} className={busy ? 'spin' : ''} />
    </button>
  );
}

export default function MapView({ filters, setFilters, refreshKey, onOpen, onPick }) {
  const { t } = useI18n();
  const { notify } = useToast();
  const [view, setView] = useState(null);
  const [reports, setReports] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!view) return;
    let cancelled = false;
    setLoading(true);
    api
      .reports({ bbox: view.bbox, limit: MAX_MARKERS, ...filterParams(filters) })
      .then((d) => !cancelled && setReports(d.items))
      .catch((e) => !cancelled && notify(errText(t, e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [view, filters, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="map-wrap">
      <MapContainer center={START.center} zoom={START.zoom} zoomControl={false} className="map">
        <TileLayer url={TILE_URL} attribution="&copy; OpenStreetMap contributors" maxZoom={19} />
        <ZoomControl position="bottomright" />
        <MapWatcher onChange={setView} />

        {reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={pinIcon(r.waste_type, r.status)}
            eventHandlers={{ click: () => !picking && onOpen(r.id) }}
          />
        ))}

        {me && (
          <Circle
            center={[me.lat, me.lng]}
            radius={me.accuracy}
            pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.12, weight: 1 }}
          />
        )}
        {me && (
          <CircleMarker
            center={[me.lat, me.lng]}
            radius={7}
            pathOptions={{ color: '#fff', fillColor: '#2563EB', fillOpacity: 1, weight: 3 }}
          />
        )}

        <LocateButton onLocated={setMe} />
      </MapContainer>

      {!picking && (
        <div className="map-top">
          <FilterBar filters={filters} setFilters={setFilters} />
        </div>
      )}

      {loading && <div className="map-loading">{t('loading')}</div>}

      {!picking && (
        <button className="add-fab" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} strokeWidth={2.4} />
          {t('addReport')}
        </button>
      )}

      {picking && (
        <>
          <div className="crosshair" aria-hidden="true">
            <div className="pin pin-lg" style={{ '--c': '#1F5C43' }}>
              <Icon name="pin" size={18} className="pin-ico" />
            </div>
          </div>
          <div className="pick-bar">
            <div className="pick-info">
              <b>{t('pickHint')}</b>
              {view && (
                <span className="meta">
                  {t('coords')}: {view.center.lat.toFixed(5)}, {view.center.lng.toFixed(5)}
                </span>
              )}
            </div>
            <div className="row gap">
              <button className="btn ghost" onClick={() => setPicking(false)}>
                {t('cancelPick')}
              </button>
              <button
                className="btn primary grow"
                disabled={!view}
                onClick={() => {
                  setPicking(false);
                  onPick(view.center);
                }}
              >
                {t('pickHere')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
