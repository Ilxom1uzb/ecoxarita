import { useI18n } from '../context.jsx';

export default function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label="language">
      {['uz', 'ru', 'en'].map((l) => (
        <button key={l} className={`lang-btn ${l === lang ? 'on' : ''}`} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
