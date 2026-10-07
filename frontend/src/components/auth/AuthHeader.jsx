import { useLanguage } from "../../i18n/useLanguage.js";
import LanguageSwitcher from "../../i18n/LanguageSwitcher.jsx";
import {
    ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

const AuthHeader = () => {
    const { t } = useLanguage();

    return (
        <header className="auth-header">
            <div className="auth-header-left">
                <Link to="/#top" className="auth-brand" aria-label="FYCE - Fantasy Youth Chamber Ensemble">
                    <div className="auth-brand-symbol"> ƒ </div>

                    <div className="auth-brand-name">
                        FYCE
                    </div>
                </Link>

                <div className="auth-header-divider" />

                <Link
                    to="/#top"
                    className="auth-home-link"
                >
                    <ArrowLeft size={19} /> {t("Về trang chủ")} </Link>
            </div>

            <div className="auth-header-right">
                <LanguageSwitcher auth />
            </div>
        </header>
    );
};

export default AuthHeader;
