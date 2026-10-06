import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { scrollPolicy } from "../../utils/scrollPolicy.js";
const storageKey = "fyce.scroll.positions";
function positions() { try { const value = JSON.parse(sessionStorage.getItem(storageKey) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } }
export default function ScrollPosition() {
  const { pathname, search, hash } = useLocation(), navigationType = useNavigationType(), first = useRef(true);
  useLayoutEffect(() => {
    const url = pathname + search + hash;
    const policy = scrollPolicy({ pathname, hash, initial: first.current, reload: performance.getEntriesByType("navigation")[0]?.type === "reload", navigationType });
    first.current = false;
    const saved = positions()[url];
    let pending = policy === "restore" && Number.isFinite(saved?.y);
    const target = pending ? Math.max(0, saved.y) : 0;
    const apply = () => {
      if (policy === "anchor" || (!pending && target > 0)) return;
      window.scrollTo({ top: target, left: 0, behavior: "instant" });
      if (Math.abs(window.scrollY - target) < 2) pending = false;
    };
    apply();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (pending) apply(); }) : null;
    observer?.observe(document.getElementById("root"));
    const stop = () => { pending = false; };
    const timer = setTimeout(stop, 8000);
    const save = () => {
      if (pending) return;
      const all = positions();
      delete all[url];
      all[url] = { y: window.scrollY };
      try { sessionStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(Object.entries(all).slice(-50)))); } catch { /* private mode may deny storage */ }
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => { save(); observer?.disconnect(); clearTimeout(timer); window.removeEventListener("pagehide", save); window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", stop); };
  }, [pathname, search, hash, navigationType]);
  return null;
}
