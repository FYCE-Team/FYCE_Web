import {
    Link,
    useParams
} from "react-router-dom";

import AdminSeatManager from "../../../components/admin/AdminSeatManager.jsx";
import "./AdminSeatManagementPage.css";

const AdminSeatManagementPage = () => {
    const {
        id
    } = useParams();

    return (
        <main className="admin-seat-page">
            <div className="admin-seat-page__topbar">
                <div>
                    <span className="admin-seat-page__eyebrow">
                        FYCE ADMINISTRATION
                    </span>
                    <h1>
                        Quản lý chỗ ngồi
                    </h1>
                    <p>
                        Quản lý trạng thái ghế độc lập với phần chỉnh sửa nội dung sự kiện. Lịch sử thao tác được lưu riêng để sau này nối trực tiếp với Booking, Payment và Refund.
                    </p>
                </div>

                <div className="admin-seat-page__actions">
                    <Link
                        to="/admin/events"
                        className="admin-seat-page__button admin-seat-page__button--secondary"
                    >
                        ← Danh sách sự kiện
                    </Link>

                    <Link
                        to={`/admin/events/${id}/edit`}
                        className="admin-seat-page__button"
                    >
                        Sửa sự kiện
                    </Link>
                </div>
            </div>

            <AdminSeatManager
                eventId={id}
            />
        </main>
    );
};

export default AdminSeatManagementPage;
