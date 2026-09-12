import {
    Navigate,
    Outlet,
    useLocation
} from "react-router-dom";

import {
    useAuth
} from "../../../context/AuthContext.jsx";

const ProtectedRoute = () => {
    const {
        user,
        loading,
        isAuthenticated
    } = useAuth();

    const location =
        useLocation();

    if (loading) {
        return (
            <div>
                Đang kiểm tra đăng nhập...
            </div>
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
