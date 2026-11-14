import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { DICT } from './i18n.js';

const I18nCtx = createContext(null);
const ToastCtx = createContext(null);

export function Providers({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('ex_lang') || 'uz');
  const setLang = useCallback((l) => {
    localStorage.setItem('ex_lang', l);
    setLangState(l);
  }, []);

  const i18n = useMemo(() => {
    const dict = DICT[lang] || DICT.uz;
    const t = (key, vars) => {
      let s = dict[key] ?? DICT.uz[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
      return s;
    };
    return { lang, setLang, t };
  }, [lang, setLang]);

  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const notify = useCallback((msg) => {
    setToast({ msg, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  const toastValue = useMemo(() => ({ notify }), [notify]);

  return (
    <I18nCtx.Provider value={i18n}>
      <ToastCtx.Provider value={toastValue}>
        {children}
        {toast && (
          <div className="toast" role="status" key={toast.id}>
            {toast.msg}
          </div>
        )}
      </ToastCtx.Provider>
    </I18nCtx.Provider>
  );
}

export const useI18n = () => useContext(I18nCtx);
export const useToast = () => useContext(ToastCtx);

// Xato kodini tarjimaga aylantiradi (noma'lum kod uchun umumiy xabar)
export function errText(t, err) {
  const key = `err_${err?.code}`;
  const s = t(key);
  return s === key ? t('err_server') : s;
}
