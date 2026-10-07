import "./Logo.css";
import { Link } from "react-router-dom";
const Logo = ({
  variant = "default",
  href = "/#top"
}) => {
  return (
    <Link
      to={href}
      className={`fyce-logo fyce-logo-${variant}`}
      aria-label="FYCE - Fantasy Youth Chamber Ensemble"
      onClick={event => {
        if (href !== "/#top" || window.location.pathname !== "/" || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }}
    >
      <img className="fyce-logo-mark" src="/fyce-icon.svg?v=2" alt="" width="33" height="33" aria-hidden="true" />

      <span className="fyce-logo-text">
        <strong>FYCE</strong>

        <span>
          Fantasy Youth Chamber Ensemble
        </span>
      </span>
    </Link>
  );
};

export default Logo;
