import {
    Navigate,
    Outlet,
    useLocation
} from "react-router-dom";

import {
    useAuth
} from "../../../context/AuthContext.jsx";

const AdminRoute = () => {
    const {
        sessionError,
        refreshSession,
        user,
        loading
    } = useAuth();

    const location =
        useLocation();

    if (sessionError) return <div role="alert"><p>{sessionError}</p><button onClick={() => refreshSession()}>Thử khôi phục phiên</button></div>;

    if (loading) {
        return (
            <div>
                Đang kiểm tra quyền truy cập...
            </div>
        );
    }

    if (!user) {
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

    if (
        user.role !== "admin"
    ) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }

    return <Outlet />;
};

export default AdminRoute;