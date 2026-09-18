import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const MyTicketsPage = () => {
    const { accessToken, refreshSession } = useAuth();
    const navigate = useNavigate();
    
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadBookings = useCallback(async () => {
        try {
            setLoading(true);
            let token = accessToken;

            if (!token) {
                const refreshed = await refreshSession();
                token = refreshed?.accessToken;
            }

            if (!token) throw new Error("Chưa đăng nhập");

            const response = await fetch(`${API_BASE_URL}/bookings/my`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể tải danh sách vé");
            }

            setBookings(result.data.bookings || []);
        } catch (err) {
            setError(err.message || "Đã xảy ra lỗi");
        } finally {
            setLoading(false);
        }
    }, [accessToken, refreshSession]);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    if (loading) return <div style={{padding: 40, textAlign: "center"}}>Đang tải danh sách vé...</div>;
    if (error) return <div style={{padding: 40, textAlign: "center", color: "red"}}>{error}</div>;

    return (
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
            <div style={{ marginBottom: 40 }}>
                <h1 style={{ marginBottom: 10 }}>Vé của tôi</h1>
                <p>Danh sách các đơn đặt vé và sự kiện bạn đã tham gia.</p>
            </div>

            {bookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", background: "#f9f9f9", borderRadius: 8 }}>
                    <p style={{ color: "#666", marginBottom: 20 }}>Bạn chưa có đơn đặt vé nào.</p>
                    <Link to="/" style={{ background: "#333", color: "#fff", padding: "10px 20px", borderRadius: 4, textDecoration: "none" }}>
                        Khám phá sự kiện
                    </Link>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {bookings.map((booking) => (
                        <div key={booking._id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <h3 style={{ margin: "0 0 10px 0" }}>{booking.eventSnapshot.title}</h3>
                                <p style={{ margin: "0 0 5px 0", fontSize: "0.9rem", color: "#666" }}>
                                    Mã đơn: <strong>{booking.bookingCode}</strong>
                                </p>
                                <p style={{ margin: "0 0 5px 0", fontSize: "0.9rem", color: "#666" }}>
                                    Ngày đặt: {new Date(booking.createdAt).toLocaleString("vi-VN")}
                                </p>
                                <div style={{ marginTop: 10 }}>
                                    {booking.paymentStatus === "paid" ? (
                                        <span style={{ background: "#d4edda", color: "#155724", padding: "4px 8px", borderRadius: 4, fontSize: "0.8rem", fontWeight: "bold" }}>
                                            Đã thanh toán
                                        </span>
                                    ) : (
                                        <span style={{ background: "#f8d7da", color: "#721c24", padding: "4px 8px", borderRadius: 4, fontSize: "0.8rem", fontWeight: "bold" }}>
                                            Chưa thanh toán
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <button 
                                    onClick={() => navigate(`/bookings/${booking.bookingCode}`)}
                                    style={{
                                        background: "#e84c3d", color: "#fff", border: "none", 
                                        padding: "10px 20px", borderRadius: 4, cursor: "pointer", 
                                        fontWeight: "bold"
                                    }}
                                >
                                    Xem chi tiết
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
};

export default MyTicketsPage;
