// CORS controls browser reads; cookie-authenticated mutations also reject foreign origins.
export const requireCookieOrigin = (req, res, next) => {
  const origin = req.get("Origin");
  if (!origin) return next(); // Non-browser clients still need the actual refresh cookie.
  const allowed = new Set([process.env.CLIENT_URL, ...(process.env.CLIENT_URLS || "").split(",")].map(value => value?.trim()).filter(Boolean));
  if (process.env.NODE_ENV === "development") {
    allowed.add("http://localhost:5173");
    allowed.add("http://127.0.0.1:5173");
  }
  if (allowed.has(origin)) return next();
  return res.status(403).json({ success: false, message: "Nguồn yêu cầu không được phép." });
};
