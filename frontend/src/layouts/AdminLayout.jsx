import {
    Outlet
} from "react-router-dom";

import AdminHeader from "../components/admin/AdminHeader";
import Footer from "../components/common/Footer";

import "./AdminLayout.css";

const AdminLayout = () => {
    return (
        <div className="admin-layout">

            <AdminHeader />

            <main className="admin-layout-content">
                <Outlet />
            </main>

            <Footer />

        </div>
    );
};

export default AdminLayout;