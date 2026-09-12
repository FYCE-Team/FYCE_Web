import "./Logo.css";
const Logo = ({
  variant = "default",
  href = "/"
}) => {
  return (
    <a
      href={href}
      className={`fyce-logo fyce-logo-${variant}`}
      aria-label="FYCE - Fantasy Youth Chamber Ensemble"
    >
      <span className="fyce-logo-mark">
        ƒ
      </span>

      <span className="fyce-logo-text">
        <strong>FYCE</strong>

        <span>
          Fantasy Youth Chamber Ensemble
        </span>
      </span>
    </a>
  );
};

export default Logo;