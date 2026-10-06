export const preserveReloadPosition = path => /^\/admin(?:\/|$)/.test(path) || /^\/events\/[^/]+\/seats\/?$/.test(path) || /^\/(checkout|bookings)\/[^/]+\/?$/.test(path) || path === "/my-tickets";
export function scrollPolicy({ pathname, hash, initial, reload, navigationType }) {
  if (initial && reload) return preserveReloadPosition(pathname) ? "restore" : "top";
  if (hash) return "anchor";
  return navigationType === "POP" ? "restore" : "top";
}
