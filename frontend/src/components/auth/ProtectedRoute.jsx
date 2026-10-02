import { useLanguage } from "../../i18n/useLanguage.js";
import {
    Navigate,
    Outlet,
    useLocation
} from "react-router-dom";

import {
    useAuth
} from "../../../context/AuthContext.jsx";

const ProtectedRoute = () => {
    const { t } = useLanguage();

    const {
        sessionError,
        refreshSession,
        user,
        loading,
        isAuthenticated
    } = useAuth();

    const location =
        useLocation();

    if (sessionError) return <div role="alert"><p>{t(sessionError)}</p><button onClick={() => refreshSession()}>{t("Thử khôi phục phiên")}</button></div>;

    if (loading) {
        return (
            <div> {t("Đang kiểm tra đăng nhập...")} </div>
        );
    }

    if (
        !isAuthenticated ||
        !user
    ) {
        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from: location
                }}
            />
        );
    }

    return <Outlet />;
};

export default ProtectedRoute;
