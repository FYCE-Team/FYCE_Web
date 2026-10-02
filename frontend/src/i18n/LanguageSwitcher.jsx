import { useLanguage } from "./useLanguage.js";
export default function LanguageSwitcher({ auth = false }) {
  const { language, setLanguage, t } = useLanguage();
  const option = auth ? "auth-language" : "site-language-option";
  return (
    <div
      className={auth ? "auth-language-switcher" : "site-language-switcher"}
      role="group"
      aria-label={t("Ngôn ngữ")}
    >
      {[
        ["vi", "VN"],
        ["en", "EN"],
      ].map(([code, label]) => (
        <button
          key={code}
          type="button"
          lang={code}
          className={`${option}${language === code ? " active" : ""}`}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
