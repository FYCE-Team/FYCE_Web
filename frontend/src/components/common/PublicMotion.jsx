import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ConcertAtmosphere from "./ConcertAtmosphere.jsx";
const selector = ".home-event-card, .home-gallery-item, .profile-summary, .event-detail-section-heading";
export default function PublicMotion() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/admin") || typeof IntersectionObserver !== "function") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("concert-revealed"); observer.unobserve(entry.target); }
    }), { rootMargin: "100px", threshold: 0 });
    const scan = root => {
      if (reduced.matches || !root.isConnected) return;
      const elements = [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
      elements.forEach(element => { if (!seen.has(element)) { seen.add(element); observer.observe(element); } });
    };
    scan(document.getElementById("root"));
    // Ignore text/countdown updates; inspect only newly mounted subtrees, once per frame.
    const added = new Set();
    let frame = 0;
    const mutations = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) added.add(node); }));
      if (added.size && !frame) frame = requestAnimationFrame(() => { frame = 0; added.forEach(scan); added.clear(); });
    });
    mutations.observe(document.getElementById("root"), { childList: true, subtree: true });
    const clear = () => observer.disconnect();
    reduced.addEventListener("change", clear);
    return () => { clear(); mutations.disconnect(); cancelAnimationFrame(frame); added.clear(); reduced.removeEventListener("change", clear); };
  }, [pathname]);
  return <ConcertAtmosphere />;
}
