import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../../context/AuthContext.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const BookingDetailsPage = () => {
    const { bookingCode } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const paymentStatusQuery = queryParams.get("payment");
    
    const { accessToken, refreshSession } = useAuth();
    
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadBooking = useCallback(async () => {
        try {
            setLoading(true);
            let token = accessToken;

            if (!token) {
                const refreshed = await refreshSession();
                token = refreshed?.accessToken;
            }

            if (!token) throw new Error("Chưa đăng nhập");

            const response = await fetch(`${API_BASE_URL}/bookings/${bookingCode}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể tải thông vị vé");
            }

            setBooking(result.data.booking);
        } catch (err) {
            setError(err.message || "Đã xảy ra lỗi");
        } finally {
            setLoading(false);
        }
    }, [bookingCode, accessToken, refreshSession]);

    useEffect(() => {
        if (bookingCode) {
            loadBooking();
        }
    }, [bookingCode, loadBooking]);

    // Poll for payment status if redirected from SePay success but DB is still pending
    useEffect(() => {
        if (paymentStatusQuery === 'success' && booking && booking.paymentStatus !== "paid") {
            const pollInterval = setInterval(() => {
                loadBooking();
            }, 5000);

            return () => clearInterval(pollInterval);
        }
    }, [paymentStatusQuery, booking, loadBooking]);

    const handlePay = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/bookings/${bookingCode}/pay`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể tạo link thanh toán");
            }

            if (result.data?.sepayCheckout) {
                const form = document.createElement("form");
                form.method = "POST";
                form.action = result.data.sepayCheckout.checkoutURL;
                
                Object.keys(result.data.sepayCheckout.formFields).forEach(key => {
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = key;
                    input.value = result.data.sepayCheckout.formFields[key];
                    form.appendChild(input);
                });
                
                document.body.appendChild(form);
                form.submit();
            }
        } catch (err) {
            setError(err.message || "Đã xảy ra lỗi khi tạo thanh toán");
            setLoading(false);
        }
    };

    if (loading) return <div style={{padding: 40, textAlign: "center"}}>Đang tải vé...</div>;
    if (error) return <div style={{padding: 40, textAlign: "center", color: "red"}}>{error}</div>;
    if (!booking) return null;

    return (
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
            {paymentStatusQuery === 'success' && (
                <div style={{ padding: 10, background: '#d4edda', color: '#155724', marginBottom: 20, borderRadius: 4, textAlign: 'center' }}>
                    Thanh toán thành công (hoặc đang chờ xác nhận)! Vui lòng chờ hệ thống cập nhật trạng thái.
                </div>
            )}
            {paymentStatusQuery === 'cancel' && (
                <div style={{ padding: 10, background: '#fff3cd', color: '#856404', marginBottom: 20, borderRadius: 4, textAlign: 'center' }}>
                    Bạn đã hủy thanh toán tại cổng SePay.
                </div>
            )}
            {paymentStatusQuery === 'error' && (
                <div style={{ padding: 10, background: '#f8d7da', color: '#721c24', marginBottom: 20, borderRadius: 4, textAlign: 'center' }}>
                    Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.
                </div>
            )}
            
            <div style={{ textAlign: "center", marginBottom: 40 }}>
                <h1 style={{ marginBottom: 10 }}>Vé điện tử của bạn</h1>
                <p>Mã đơn đặt vé: <strong>{booking.bookingCode}</strong></p>
                {booking.paymentStatus === "paid" ? (
                    <span style={{ color: "green", fontWeight: "bold" }}>Đã thanh toán</span>
                ) : (
                    <div>
                        <span style={{ color: "red", fontWeight: "bold" }}>Chưa thanh toán</span>
                        <div style={{ marginTop: 15 }}>
                            <button 
                                onClick={handlePay}
                                style={{
                                    background: "#e84c3d", color: "#fff", border: "none", 
                                    padding: "10px 20px", borderRadius: 4, cursor: "pointer", 
                                    fontWeight: "bold"
                                }}
                            >
                                Thanh toán ngay qua SePay
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ background: "#f9f9f9", padding: 20, borderRadius: 8, marginBottom: 40 }}>
                <h2>{booking.eventSnapshot.title}</h2>
                <p>{booking.eventSnapshot.venue}</p>
                <p>{new Date(booking.eventSnapshot.startAt).toLocaleString("vi-VN")}</p>
            </div>

            <h3>Danh sách vé ({booking.items.length})</h3>
            <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", marginTop: 20 }}>
                {booking.items.map((item, idx) => (
                    <div key={idx} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, textAlign: "center", background: "#fff" }}>
                        <div style={{ marginBottom: 15 }}>
                            <strong>{item.ticketCategoryName}</strong>
                            <p style={{ margin: "5px 0" }}>Khu vực: {item.section}</p>
                            <p style={{ margin: "5px 0" }}>Hàng: {item.row} - Ghế: {item.number}</p>
                        </div>
                        
                        {booking.paymentStatus === "paid" ? (
                            <div style={{ background: "#fff", display: "inline-block", padding: 10, border: "1px solid #eee", borderRadius: 8 }}>
                                <QRCodeSVG value={item.ticketCode} size={150} level="M" />
                                <p style={{ fontSize: "0.8rem", marginTop: 10, color: "#666" }}>{item.ticketCode}</p>
                            </div>
                        ) : (
                            <div style={{ padding: "40px 0", color: "#999", border: "1px dashed #ccc", borderRadius: 8 }}>
                                QR Code sẽ hiển thị sau khi thanh toán
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 40 }}>
                <Link to="/" style={{ color: "#333", textDecoration: "underline" }}>← Về trang chủ</Link>
            </div>
        </main>
    );
};

export default BookingDetailsPage;
