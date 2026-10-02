import { useLanguage } from "../../i18n/useLanguage.js";
import AuthHeader from "./AuthHeader";
import AuthFooter from "./AuthFooter";

const AuthLayout = ({
    children,
    className = ""
}) => {
    const { t } = useLanguage();

    return (
        <div
            className={`auth-layout ${className}`}
        >
            <AuthHeader />

            <main className="auth-content">
                {t(children)}
            </main>

            <AuthFooter />
        </div>
    );
};

export default AuthLayout;
