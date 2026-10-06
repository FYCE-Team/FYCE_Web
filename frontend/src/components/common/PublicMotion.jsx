import { useEffect } from "react";
import { useLocation } from "react-router-dom";
export default function PublicMotion() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/admin") || typeof IntersectionObserver !== "function") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove("concert-reveal-pending"); entry.target.classList.add("concert-revealed"); observer.unobserve(entry.target); }
    }), { threshold: .08, rootMargin: "0px 0px -24px 0px" });
    const scan = () => {
      if (reduced.matches) return;
      document.querySelectorAll(".main-layout-content section, .home-event-card, .home-gallery-item, .profile-panels > *, .auth-card").forEach((element, index) => {
        if (seen.has(element)) return;
        seen.add(element);
        element.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
        if (element.getBoundingClientRect().top > window.innerHeight - 24) element.classList.add("concert-reveal-pending");
        observer.observe(element);
      });
    };
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.getElementById("root"), { childList: true, subtree: true });
    const clear = () => { observer.disconnect(); document.querySelectorAll(".concert-reveal-pending").forEach(e => e.classList.remove("concert-reveal-pending")); };
    reduced.addEventListener("change", clear);
    return () => { clear(); mutations.disconnect(); reduced.removeEventListener("change", clear); };
  }, [pathname]);
  return null;
}
