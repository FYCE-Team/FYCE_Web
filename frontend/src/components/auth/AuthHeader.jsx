import {
    ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AuthHeader = () => {
    const navigate = useNavigate();

    return (
        <header className="auth-header">
            <div className="auth-header-left">
                <div className="auth-brand">
                    <div className="auth-brand-symbol">
                        ƒ
                    </div>

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
                    <ArrowLeft size={19} />
                    Về trang chủ
                </button>
            </div>

            <div className="auth-header-right">
                <div className="auth-language-switcher">
                    <button
                        type="button"
                        className="auth-language active"
                    >
                        VN
                    </button>

                    <button
                        type="button"
                        className="auth-language"
                    >
                        EN
                    </button>
                </div>
            </div>
        </header>
    );
};

export default AuthHeader;