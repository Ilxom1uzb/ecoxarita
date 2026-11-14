import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, ZoomControl, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api.js';
import { useI18n, useToast, errText } from '../context.jsx';
import { wasteColor } from '../wasteTypes.js';
import FilterBar, { filterParams } from './FilterBar.jsx';

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const START = { center: [41.38, 64.59], zoom: 6 }; // O'zbekiston markazi
const MAX_MARKERS = 300;

// Rang faqat o'zimizning konstantalardan keladi, foydalanuvchi kiritmaydi
const iconCache = {};
const pinIcon = (color) =>
  (iconCache[color] ??= L.divIcon({
    className: 'pin-wrap',
    html: `<div class="pin" style="background:${color}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  }));

// Xarita harakatlanganda ko'rinib turgan chegaralar va markazni yuqoriga uzatadi
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
        const pos = [coords.latitude, coords.longitude];
        onLocated(pos);
        map.flyTo(pos, 15);
      },
      (err) => {
        setBusy(false);
        notify(err.code === 1 ? t('locateDenied') : t('locateFail'));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <button className="fab locate" onClick={locate} disabled={busy} aria-label={t('locate')} title={t('locate')}>
      {busy ? '…' : '◎'}
    </button>
  );
}

export default function MapView({ filters, setFilters, refreshKey, onOpen, onCenter, onAdd }) {
  const { t } = useI18n();
  const { notify } = useToast();
  const [view, setView] = useState(null);
  const [reports, setReports] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (view) onCenter(view.center);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

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
            icon={pinIcon(wasteColor(r.waste_type))}
            eventHandlers={{ click: () => onOpen(r.id) }}
          />
        ))}
        {me && <CircleMarker center={me} radius={8} pathOptions={{ color: '#fff', fillColor: '#2563EB', fillOpacity: 1, weight: 3 }} />}
        <LocateButton onLocated={setMe} />
      </MapContainer>

      <div className="map-top">
        <FilterBar filters={filters} setFilters={setFilters} />
      </div>
      {loading && <div className="map-loading">{t('loading')}</div>}
      {reports.length >= MAX_MARKERS && <div className="map-hint">{`${MAX_MARKERS}+`}</div>}
      <button className="add-fab" onClick={onAdd}>
        + {t('addReport')}
      </button>
    </div>
  );
}
