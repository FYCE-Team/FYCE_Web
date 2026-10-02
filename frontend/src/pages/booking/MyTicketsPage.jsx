import { useLanguage } from "../../i18n/useLanguage.js";
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

import { API_BASE_URL } from "../../config/api.js";

const formatPrice = (value, locale = "vi-VN") =>
    `${new Intl.NumberFormat(locale).format(
        Number(value) || 0
    )}đ`;

const formatDateTime = (value, locale = "vi-VN") => {
    if (!value) {
        return "Đang cập nhật";
    }

    return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date(value));
};

const getVisibleBookingState = (booking) => {
    if (booking?.paymentStatus === "refunded") {
        return { key: "cancelled", label: "Đã hoàn tiền · Vé đã hủy", actionLabel: "Xem lịch sử", Icon: Clock3 };
    }
    if (
        booking?.status === "confirmed" &&
        booking?.paymentStatus === "paid"
    ) {
        return {
            key: "confirmed",
            label: booking.refundedAmount > 0 ? "Đã hoàn một phần" : "Đã thanh toán",
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
    const { t, locale } = useLanguage();

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
                        "pending_payment" ||
                    booking.paymentStatus === "refunded"
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
                    <h2> {t("Đang tải vé của bạn")} </h2>
                    <p> {t("FYCE đang đồng bộ trạng thái các đơn đặt vé.")} </p>
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
                    <h2> {t("Không thể tải vé")} </h2>
                    <p>{t(error)}</p>
                    <button
                        type="button"
                        className="ticket-action ticket-action--primary"
                        onClick={loadBookings}
                    > {t("Thử lại")} </button>
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
                        <h1>{t("Vé của tôi")}</h1>
                        <p> {t("Quản lý vé, đơn đang chờ thanh toán và lịch sử hoàn vé.")} </p>
                    </div>

                    <Link
                        className="ticket-back-link"
                        to="/"
                    > {t("Khám phá sự kiện")} </Link>
                </header>

                {t(hiddenInactiveCount > 0 && (
                    <div className="ticket-alert ticket-alert--info">
                        <Ticket size={18} />
                        <span>
                            {t(hiddenInactiveCount)} {t("đơn đã hủy hoặc hết hạn không được hiển thị ở “Vé của tôi” vì các ghế đó đã được nhả lại hệ thống.")} </span>
                    </div>
                ))}

                {t(activeBookings.length ===
                0 ? (
                    <section className="ticket-card ticket-empty">
                        <div className="ticket-empty-icon">
                            <Tickets
                                size={30}
                            />
                        </div>
                        <h2> {t("Bạn chưa có vé nào")} </h2>
                        <p> {t("Khi bạn thanh toán thành công hoặc đang có một đơn còn hiệu lực, vé sẽ xuất hiện tại đây.")} </p>
                        <Link
                            className="ticket-action ticket-action--primary"
                            to="/"
                        > {t("Khám phá sự kiện")} </Link>
                    </section>
                ) : (
                    <section className="ticket-list">
                        {t(activeBookings.map(
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
                                                        t(booking
                                                            .eventSnapshot
                                                            .title)
                                                    }
                                                </h2>
                                                <span
                                                    className={`ticket-status ticket-status--${state.key}`}
                                                >
                                                    <StateIcon
                                                        size={14}
                                                    />
                                                    {
                                                        t(state.label)
                                                    }
                                                </span>
                                            </div>

                                            <div className="ticket-list-meta">
                                                <span>
                                                    <CalendarDays
                                                        size={14}
                                                    />
                                                    {t(formatDateTime(
                                                        booking
                                                            .eventSnapshot
                                                            .startAt, locale
                                                    ))}
                                                </span>
                                                <span>
                                                    <MapPin
                                                        size={14}
                                                    />
                                                    {t(booking
                                                        .eventSnapshot
                                                        .venue ||
                                                        "Đang cập nhật")}
                                                </span>
                                                <span> {t("Mã đơn:")} {t(booking.bookingCode)}
                                                </span>
                                            </div>

                                            <div className="ticket-list-bottom">
                                                <span className="ticket-list-price">
                                                    {t(formatPrice(
                                                        booking.totalAmount, locale
                                                    ))}
                                                </span>
                                                <span className="ticket-list-seat-count">
                                                    {t(booking
                                                        .items
                                                        ?.length ||
                                                        0)}{t(" ")} {t("ghế")} </span>
                                            </div>
                                        </div>

                                        <Link
                                            className="ticket-action ticket-action--primary"
                                            to={`/bookings/${booking.bookingCode}`}
                                        >
                                            {t(state.actionLabel)}
                                        </Link>
                                    </article>
                                );
                            }
                        ))}
                    </section>
                ))}
            </div>
        </main>
    );
};

export default MyTicketsPage;
