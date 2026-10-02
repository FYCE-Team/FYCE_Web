import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { translate } from "./translate.js";
import { LanguageContext } from "./useLanguage.js";
import { normalizeLanguage, resolveLanguage } from "./language.js";
export function LanguageProvider({ children }) {
  const { pathname } = useLocation();
  const [preference, setPreference] = useState(() => {
    try {
      return normalizeLanguage(localStorage.getItem("fyce.language"));
    } catch {
      return "vi";
    }
  });
  const language = resolveLanguage(pathname, preference);
  const value = useMemo(
    () => ({
      language,
      locale: language === "en" ? "en-GB" : "vi-VN",
      t: (text) => translate(text, language),
      setLanguage: (next) => {
        if (!["vi", "en"].includes(next)) return;
        setPreference(next);
        try {
          localStorage.setItem("fyce.language", next);
        } catch {
          /* language remains usable without storage */
        }
      },
    }),
    [language],
  );
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === "fyce.language")
        setPreference(normalizeLanguage(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
