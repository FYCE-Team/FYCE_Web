// Production traffic stays on the frontend origin; Vercel proxies /api to Render.
// Only public video bytes bypass this proxy; authentication always stays first-party.
export const PUBLIC_VIDEO_ORIGIN = import.meta.env.PROD
    ? (import.meta.env.VITE_PUBLIC_VIDEO_ORIGIN || "https://fyce-web.onrender.com")
    : "";
// This keeps HttpOnly session cookies first-party, including after gateway redirects.
export const API_BASE_URL = import.meta.env.PROD
    ? "/api"
    : (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
