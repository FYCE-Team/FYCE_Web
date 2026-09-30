// Production traffic stays on the frontend origin; Vercel proxies /api to Render.
// This keeps HttpOnly session cookies first-party, including after gateway redirects.
export const API_BASE_URL = import.meta.env.PROD
    ? "/api"
    : (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
