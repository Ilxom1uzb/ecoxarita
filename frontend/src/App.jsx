import { useCallback, useEffect, useState } from 'react';
import { api, getToken, clearToken } from './api.js';
import { useI18n } from './context.jsx';
import AuthScreen, { Logo } from './components/AuthScreen.jsx';
import MapView from './components/MapView.jsx';
import ReportList from './components/ReportList.jsx';
import ReportSheet from './components/ReportSheet.jsx';
import AddReportSheet from './components/AddReportSheet.jsx';
import StatsView from './components/StatsView.jsx';
import AdminView from './components/AdminView.jsx';
import ProfileView from './components/ProfileView.jsx';
import LangSwitch from './components/LangSwitch.jsx';
import FilterBar from './components/FilterBar.jsx';
import { Icon } from './components/Icon.jsx';

const EMPTY_FILTERS = { type: null, onlyOpen: false, status: null };

export default function App() {
  const { t } = useI18n();

  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(() => Boolean(getToken()));
  const [tab, setTab] = useState('map');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addCenter, setAddCenter] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  const isMod = user && (user.role === 'moderator' || user.role === 'admin');
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  const resetSession = useCallback(() => {
    setUser(null);
    setTab('map');
    setOpenId(null);
    setAddOpen(false);
    setFilters(EMPTY_FILTERS);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setBooting(false));
  }, []);

  // Token muddati tugasa (api.js signali), login ekraniga qaytish
  useEffect(() => {
    window.addEventListener('ex:logout', resetSession);
    return () => window.removeEventListener('ex:logout', resetSession);
  }, [resetSession]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (booting) return <div className="splash"><Logo size={48} /></div>;
  if (!user) return <AuthScreen onAuth={(u) => { setUser(u); setTab('map'); }} />;

  const logout = () => {
    clearToken();
    resetSession();
  };

  const tabs = [
    { id: 'map', icon: 'map', label: t('tabMap') },
    { id: 'list', icon: 'list', label: t('tabList') },
    { id: 'mine', icon: 'user', label: t('tabMine') },
    { id: 'stats', icon: 'chart', label: t('tabStats') },
    ...(isMod ? [{ id: 'admin', icon: 'shield', label: t('tabAdmin') }] : []),
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="leaf" size={18} strokeWidth={2.2} />
          </span>
          <h1>EcoXarita</h1>
        </div>
        <LangSwitch />
      </header>

      {!online && <div className="offline-banner" role="status">{t('offline')}</div>}

      <main className={`main ${tab === 'map' ? 'is-map' : ''}`}>
        {tab === 'map' && (
          <MapView
            filters={filters}
            setFilters={setFilters}
            refreshKey={refreshKey}
            onOpen={setOpenId}
            onPick={(center) => {
              setAddCenter(center);
              setAddOpen(true);
            }}
          />
        )}

        {tab === 'list' && (
          <div className="page">
            <FilterBar filters={filters} setFilters={setFilters} />
            <ReportList filters={filters} onOpen={setOpenId} refreshKey={refreshKey} />
          </div>
        )}

        {tab === 'mine' && (
          <ProfileView
            user={user}
            onOpen={setOpenId}
            refreshKey={refreshKey}
            onLogout={logout}
            onDeleted={() => {
              clearToken();
              resetSession();
            }}
          />
        )}

        {tab === 'stats' && <StatsView />}
        {tab === 'admin' && isMod && <AdminView user={user} onOpen={setOpenId} refreshKey={refreshKey} />}
      </main>

      <nav className="tabbar" aria-label="navigation">
        {tabs.map((x) => (
          <button key={x.id} className={`tab ${tab === x.id ? 'on' : ''}`} onClick={() => setTab(x.id)}>
            <span className="tab-ico">
              <Icon name={x.icon} size={20} />
            </span>
            <span>{x.label}</span>
          </button>
        ))}
      </nav>

      {openId && <ReportSheet id={openId} user={user} onClose={() => setOpenId(null)} onChanged={bump} />}
      {addOpen && (
        <AddReportSheet
          center={addCenter}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            bump();
          }}
        />
      )}
    </div>
  );
}
