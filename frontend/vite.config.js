import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, strictPort: true,
    headers: { "Cross-Origin-Opener-Policy": "same-origin-allow-popups", "Referrer-Policy": "strict-origin-when-cross-origin" },
    proxy: { "/api": { target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3000", changeOrigin: true }, "/uploads": { target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3000", changeOrigin: true } }
  },
})
