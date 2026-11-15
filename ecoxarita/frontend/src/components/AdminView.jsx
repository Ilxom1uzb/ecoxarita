import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n, useToast, errText } from '../context.jsx';
import { ROLES } from '../wasteTypes.js';
import ReportList from './ReportList.jsx';

export default function AdminView({ user, onOpen, refreshKey }) {
  const { t } = useI18n();
  const [section, setSection] = useState('queue');
  const isAdmin = user.role === 'admin';

  const filters =
    section === 'hidden' ? { type: null, onlyOpen: false, status: 'hidden' } : { type: null, onlyOpen: true, status: null };

  return (
    <div className="page">
      <div className="chips" role="tablist">
        <button role="tab" className={`chip ${section === 'queue' ? 'on' : ''}`} onClick={() => setSection('queue')}>
          {t('queue')}
        </button>
        <button role="tab" className={`chip ${section === 'hidden' ? 'on' : ''}`} onClick={() => setSection('hidden')}>
          {t('hiddenList')}
        </button>
        {isAdmin && (
          <button role="tab" className={`chip ${section === 'users' ? 'on' : ''}`} onClick={() => setSection('users')}>
            {t('users')}
          </button>
        )}
      </div>

      {section === 'users' && isAdmin ? (
        <UsersPanel currentId={user.id} />
      ) : (
        <ReportList filters={filters} onOpen={onOpen} refreshKey={refreshKey} />
      )}
    </div>
  );
}

function UsersPanel({ currentId }) {
  const { t } = useI18n();
  const { notify } = useToast();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.users().then((d) => setUsers(d.items)).catch((e) => setError(errText(t, e)));
  }, [t]);

  async function changeRole(id, role) {
    try {
      await api.setRole(id, { role });
      setUsers((list) => list.map((u) => (u.id === id ? { ...u, role } : u)));
      notify(t('saved'));
    } catch (e) {
      notify(errText(t, e));
    }
  }

  if (error) return <p className="error">{error}</p>;
  return (
    <div className="user-list">
      {users.map((u) => (
        <div className="card row-between" key={u.id}>
          <div>
            <b>{u.name}</b>
            <div className="meta">
              {u.email} · {u.report_count} {t('reportsCount')}
            </div>
          </div>
          <select
            aria-label={t('changeRole')}
            value={u.role}
            disabled={u.id === currentId}
            onChange={(e) => changeRole(u.id, e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{t(`role_${r}`)}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
