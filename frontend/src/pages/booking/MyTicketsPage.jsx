import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import { Link } from "react-router-dom";
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    MapPin,
    Ticket,
    Tickets,
    WalletCards
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext.jsx";
import "./TicketPages.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const formatPrice = (value) =>
    `${new Intl.NumberFormat("vi-VN").format(
        Number(value) || 0
    )}đ`;

const formatDateTime = (value) => {
    if (!value) {
        return "Đang cập nhật";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date(value));
};

const getVisibleBookingState = (booking) => {
    if (
        booking?.status === "confirmed" &&
        booking?.paymentStatus === "paid"
    ) {
        return {
            key: "confirmed",
            label: "Đã thanh toán",
            actionLabel: "Xem vé",
            Icon: CheckCircle2
        };
    }

    return {
        key: "pending",
        label: "Chờ thanh toán",
        actionLabel: "Thanh toán",
        Icon: Clock3
    };
};

const MyTicketsPage = () => {
    const {
        accessToken,
        refreshSession
    } = useAuth();

    const [bookings, setBookings] =
        useState([]);
    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState("");

    const loadBookings = useCallback(
        async () => {
            try {
                setLoading(true);
                setError("");

                let token = accessToken;

                if (!token) {
                    const refreshed =
                        await refreshSession();
                    token =
                        refreshed?.accessToken ||
                        null;
                }

                if (!token) {
                    throw new Error(
                        "Phiên đăng nhập đã hết hạn."
                    );
                }

                const response = await fetch(
                    `${API_BASE_URL}/bookings/my`,
                    {
                        headers: {
                            "Content-Type":
                                "application/json",
                            Authorization:
                                `Bearer ${token}`
                        },
                        credentials: "include"
                    }
                );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.message ||
                            "Không thể tải danh sách vé"
                    );
                }

                setBookings(
                    result.data.bookings || []
                );
            } catch (err) {
                setError(
                    err.message ||
                        "Đã xảy ra lỗi"
                );
            } finally {
                setLoading(false);
            }
        },
        [accessToken, refreshSession]
    );

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    const activeBookings = useMemo(
        () =>
            bookings.filter(
                (booking) =>
                    booking.status ===
                        "confirmed" ||
                    booking.status ===
                        "pending_payment"
            ),
        [bookings]
    );

    const hiddenInactiveCount =
        bookings.length -
        activeBookings.length;

    if (loading) {
        return (
            <section className="ticket-state">
                <div className="ticket-state-card">
                    <div className="ticket-spinner" />
                    <h2>
                        Đang tải vé của bạn
                    </h2>
                    <p>
                        FYCE đang đồng bộ trạng thái các đơn đặt vé.
                    </p>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="ticket-state">
                <div className="ticket-state-card">
                    <Tickets
                        size={38}
                        strokeWidth={1.7}
                    />
                    <h2>
                        Không thể tải vé
                    </h2>
                    <p>{error}</p>
                    <button
                        type="button"
                        className="ticket-action ticket-action--primary"
                        onClick={loadBookings}
                    >
                        Thử lại
                    </button>
                </div>
            </section>
        );
    }

    return (
        <main className="ticket-page">
            <div className="ticket-shell">
                <header className="ticket-page-header">
                    <div>
                        <span className="ticket-page-kicker">
                            <WalletCards
                                size={15}
                            />
                            FYCE WALLET
                        </span>
                        <h1>Vé của tôi</h1>
                        <p>
                            Quản lý các vé đã thanh toán và các đơn vẫn còn thời gian để hoàn tất thanh toán.
                        </p>
                    </div>

                    <Link
                        className="ticket-back-link"
                        to="/"
                    >
                        Khám phá sự kiện
                    </Link>
                </header>

                {hiddenInactiveCount > 0 && (
                    <div className="ticket-alert ticket-alert--info">
                        <Ticket size={18} />
                        <span>
                            {hiddenInactiveCount} đơn đã hủy hoặc hết hạn không được hiển thị ở “Vé của tôi” vì các ghế đó đã được nhả lại hệ thống.
                        </span>
                    </div>
                )}

                {activeBookings.length ===
                0 ? (
                    <section className="ticket-card ticket-empty">
                        <div className="ticket-empty-icon">
                            <Tickets
                                size={30}
                            />
                        </div>
                        <h2>
                            Bạn chưa có vé nào
                        </h2>
                        <p>
                            Khi bạn thanh toán thành công hoặc đang có một đơn còn hiệu lực, vé sẽ xuất hiện tại đây.
                        </p>
                        <Link
                            className="ticket-action ticket-action--primary"
                            to="/"
                        >
                            Khám phá sự kiện
                        </Link>
                    </section>
                ) : (
                    <section className="ticket-list">
                        {activeBookings.map(
                            (booking) => {
                                const state =
                                    getVisibleBookingState(
                                        booking
                                    );
                                const StateIcon =
                                    state.Icon;

                                return (
                                    <article
                                        key={
                                            booking._id
                                        }
                                        className="ticket-card ticket-list-card"
                                    >
                                        <div className="ticket-list-main">
                                            <div className="ticket-list-title-row">
                                                <h2>
                                                    {
                                                        booking
                                                            .eventSnapshot
                                                            .title
                                                    }
                                                </h2>
                                                <span
                                                    className={`ticket-status ticket-status--${state.key}`}
                                                >
                                                    <StateIcon
                                                        size={14}
                                                    />
                                                    {
                                                        state.label
                                                    }
                                                </span>
                                            </div>

                                            <div className="ticket-list-meta">
                                                <span>
                                                    <CalendarDays
                                                        size={14}
                                                    />
                                                    {formatDateTime(
                                                        booking
                                                            .eventSnapshot
                                                            .startAt
                                                    )}
                                                </span>
                                                <span>
                                                    <MapPin
                                                        size={14}
                                                    />
                                                    {booking
                                                        .eventSnapshot
                                                        .venue ||
                                                        "Đang cập nhật"}
                                                </span>
                                                <span>
                                                    Mã đơn: {booking.bookingCode}
                                                </span>
                                            </div>

                                            <div className="ticket-list-bottom">
                                                <span className="ticket-list-price">
                                                    {formatPrice(
                                                        booking.totalAmount
                                                    )}
                                                </span>
                                                <span className="ticket-list-seat-count">
                                                    {booking
                                                        .items
                                                        ?.length ||
                                                        0}{" "}
                                                    ghế
                                                </span>
                                            </div>
                                        </div>

                                        <Link
                                            className="ticket-action ticket-action--primary"
                                            to={`/bookings/${booking.bookingCode}`}
                                        >
                                            {state.actionLabel}
                                        </Link>
                                    </article>
                                );
                            }
                        )}
                    </section>
                )}
            </div>
        </main>
    );
};

export default MyTicketsPage;
