import { createContext, useContext } from "react";
export const LanguageContext = createContext({
  language: "vi",
  locale: "vi-VN",
  t: (value) => value,
  setLanguage: () => {},
});
export const useLanguage = () => useContext(LanguageContext);
