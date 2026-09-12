import {
    useNavigate
} from "react-router-dom";

import {
    useAuth
} from "../../../context/AuthContext.jsx";

import Logo from "../common/Logo";

import "./AdminHeader.css";

const AdminHeader = () => {
    const navigate = useNavigate();

    const {
        user,
        logout
    } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            navigate("/login", {
                replace: true
            });
        }
    };

    const handleHome = () => {
        navigate("/", {
            replace: false
        });
    };

    return (
        <header className="admin-header">

            <div className="admin-header-inner">

                <div className="admin-header-brand">
                    <Logo />

                    <div className="admin-header-divider" />

                    <div className="admin-header-section">
                        <span>
                            FYCE
                        </span>

                        <strong>
                            ADMINISTRATION
                        </strong>
                    </div>
                </div>

                <nav className="admin-header-nav">

                    <button
                        type="button"
                        className="admin-header-nav-item admin-header-nav-active"
                        onClick={() =>
                            navigate("/admin/events")
                        }
                    >
                        Sự kiện
                    </button>

                    <button
                        type="button"
                        className="admin-header-nav-item"
                        onClick={handleHome}
                    >
                        Về trang chủ
                    </button>

                </nav>

                <div className="admin-header-account">

                    <div className="admin-header-user">

                        <div className="admin-header-avatar">
                            {(
                                user?.fullName ||
                                user?.username ||
                                "A"
                            )
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div className="admin-header-user-info">

                            <strong>
                                {
                                    user?.fullName ||
                                    user?.username ||
                                    "Administrator"
                                }
                            </strong>

                            <span>
                                Quản trị viên
                            </span>

                        </div>

                    </div>

                    <button
                        type="button"
                        className="admin-header-logout"
                        onClick={handleLogout}
                    >
                        Đăng xuất
                    </button>

                </div>

            </div>

        </header>
    );
};

export default AdminHeader;