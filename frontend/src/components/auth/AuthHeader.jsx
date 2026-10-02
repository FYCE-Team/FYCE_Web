import { useLanguage } from "../../i18n/useLanguage.js";
import LanguageSwitcher from "../../i18n/LanguageSwitcher.jsx";
import {
    ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AuthHeader = () => {
    const { t } = useLanguage();

    const navigate = useNavigate();

    return (
        <header className="auth-header">
            <div className="auth-header-left">
                <div className="auth-brand">
                    <div className="auth-brand-symbol"> ƒ </div>

                    <div className="auth-brand-name">
                        FYCE
                    </div>
                </div>

                <div className="auth-header-divider" />

                <button
                    type="button"
                    className="auth-home-link"
                    onClick={() => navigate("/")}
                >
                    <ArrowLeft size={19} /> {t("Về trang chủ")} </button>
            </div>

            <div className="auth-header-right">
                <LanguageSwitcher auth />
            </div>
        </header>
    );
};

export default AuthHeader;
