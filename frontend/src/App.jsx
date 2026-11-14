import { useCallback, useEffect, useState } from 'react';
import { api, getToken, clearToken } from './api.js';
import { useI18n, useToast, errText } from './context.jsx';
import AuthScreen, { Logo } from './components/AuthScreen.jsx';
import MapView from './components/MapView.jsx';
import ReportList from './components/ReportList.jsx';
import ReportSheet from './components/ReportSheet.jsx';
import AddReportSheet from './components/AddReportSheet.jsx';
import StatsView from './components/StatsView.jsx';
import AdminView from './components/AdminView.jsx';
import LangSwitch from './components/LangSwitch.jsx';
import FilterBar from './components/FilterBar.jsx';

const EMPTY_FILTERS = { type: null, onlyOpen: false, status: null };

export default function App() {
  const { t } = useI18n();
  const { notify } = useToast();

  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(() => Boolean(getToken()));
  const [tab, setTab] = useState('map');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [center, setCenter] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
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

  // Sessiyani tiklash
  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setBooting(false));
  }, []);

  // Token muddati tugaganda (api.js signali) ilova login ekraniga qaytadi
  useEffect(() => {
    const onLogout = () => {
      resetSession();
      notify(t('err_unauthorized'));
    };
    window.addEventListener('ex:logout', onLogout);
    return () => window.removeEventListener('ex:logout', onLogout);
  }, [resetSession, notify, t]);

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

  const deleteAccount = async () => {
    if (!window.confirm(t('deleteAccountConfirm'))) return;
    try {
      await api.deleteMe();
      notify(t('accountDeleted'));
      clearToken();
      resetSession();
    } catch (e) {
      notify(errText(t, e));
    }
  };

  const tabs = [
    { id: 'map', icon: '🗺', label: t('tabMap') },
    { id: 'list', icon: '📋', label: t('tabList') },
    { id: 'mine', icon: '👤', label: t('tabMine') },
    { id: 'stats', icon: '📊', label: t('tabStats') },
    ...(isMod ? [{ id: 'admin', icon: '🛡', label: t('tabAdmin') }] : []),
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <Logo size={26} />
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
            onCenter={setCenter}
            onAdd={() => setAddOpen(true)}
          />
        )}

        {tab === 'list' && (
          <div className="page">
            <FilterBar filters={filters} setFilters={setFilters} />
            <ReportList filters={filters} onOpen={setOpenId} refreshKey={refreshKey} />
          </div>
        )}

        {tab === 'mine' && (
          <div className="page">
            <div className="card profile">
              <b>{user.name}</b>
              <div className="meta">{user.email} · {t(`role_${user.role}`)}</div>
              <div className="row gap">
                <button className="btn ghost grow" onClick={logout}>{t('logout')}</button>
                <button className="btn danger grow" onClick={deleteAccount}>{t('deleteAccount')}</button>
              </div>
            </div>
            <ReportList mine onOpen={setOpenId} refreshKey={refreshKey} />
          </div>
        )}

        {tab === 'stats' && <StatsView />}
        {tab === 'admin' && isMod && <AdminView user={user} onOpen={setOpenId} refreshKey={refreshKey} />}
      </main>

      <nav className="tabbar" aria-label="navigation">
        {tabs.map((x) => (
          <button key={x.id} className={`tab ${tab === x.id ? 'on' : ''}`} onClick={() => setTab(x.id)}>
            <span aria-hidden="true">{x.icon}</span>
            <span>{x.label}</span>
          </button>
        ))}
      </nav>

      {openId && (
        <ReportSheet id={openId} user={user} onClose={() => setOpenId(null)} onChanged={bump} />
      )}
      {addOpen && (
        <AddReportSheet
          center={center}
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
