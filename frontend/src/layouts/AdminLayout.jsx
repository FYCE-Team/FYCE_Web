import {
    NavLink,
    Outlet
} from "react-router-dom";

import AdminHeader from "../components/admin/AdminHeader";
import Footer from "../components/common/Footer";

import "./AdminLayout.css";

const AdminLayout = () => {
    return (
        <div className="admin-layout">

            <AdminHeader />
            <div className="admin-workspace">
            <nav className="admin-workspace-nav" aria-label="Điều hướng quản trị">
                {[["/admin", "Tổng quan"], ["/admin/events", "Sự kiện & ghế"], ["/admin/users", "Người dùng"], ["/admin/homepage", "Trang chủ"], ["/admin/bookings", "Đơn vé & thanh toán"], ["/admin/tickets", "Danh sách vé"], ["/admin/check-in", "Check-in"], ["/admin/trash", "Thùng rác"]].map(([path, label]) => <NavLink key={path} to={path} end={path === "/admin"}>{label}</NavLink>)}
            </nav>

            <main className="admin-layout-content">
                <Outlet />
            </main>
            </div>

            <Footer />

        </div>
    );
};

export default AdminLayout;