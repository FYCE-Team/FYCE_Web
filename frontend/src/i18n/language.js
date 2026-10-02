export const normalizeLanguage = (value) => (value === "en" ? "en" : "vi");
export const resolveLanguage = (pathname, preference) =>
  /^\/admin(?:\/|$)/.test(pathname) ? "vi" : normalizeLanguage(preference);
