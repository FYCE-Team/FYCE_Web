import { useLanguage } from "../../i18n/useLanguage.js";
import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import {
    Link,
    useLocation,
    useParams
} from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    Armchair,
    CalendarDays,
    CheckCircle2,
    Clock3,
    CreditCard,
    MapPin,
    ReceiptText,
    Ticket,
    XCircle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date(value));
};

const getBookingState = (booking) => {
    if (booking?.paymentStatus === "refunded") return { key: "cancelled", label: "Đã hoàn tiền · Vé đã hủy", Icon: XCircle };
    if (
        booking?.status === "confirmed" &&
        booking?.paymentStatus === "paid"
    ) {
        return {
            key: "confirmed",
            label: booking.refundedAmount > 0 ? "Đã hoàn một phần" : "Đã thanh toán",
            Icon: CheckCircle2
        };
    }

    if (booking?.status === "cancelled") {
        return {
            key: "cancelled",
            label: "Đã hủy",
            Icon: XCircle
        };
    }

    if (booking?.status === "expired") {
        return {
            key: "expired",
            label: "Đã hết hạn",
            Icon: Clock3
        };
    }

    if (booking?.status === "pending_payment") {
        return {
            key: "pending",
            label: "Chờ thanh toán",
            Icon: Clock3
        };
    }

    return {
        key: "failed",
        label: "Không khả dụng",
        Icon: AlertTriangle
    };
};

const BookingDetailsPage = () => {
    const { t, locale } = useLanguage();

    const [bookingPass,setBookingPass]=useState(null);
    const { bookingCode } = useParams();
    const location = useLocation();
    const paymentStatusQuery = useMemo(
        () =>
            new URLSearchParams(
                location.search
            ).get("payment"),
        [location.search]
    );

    const {
        accessToken,
        refreshSession
    } = useAuth();

    const [syncError, setSyncError] = useState("");
    const [clockNow, setClockNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const [booking, setBooking] =
        useState(null);
    const [issuedTickets, setIssuedTickets] =
        useState([]);
    const [ticketsLoading, setTicketsLoading] =
        useState(false);
    const [loading, setLoading] =
        useState(true);
    const [actionLoading, setActionLoading] =
        useState(false);
    const [error, setError] =
        useState("");

    const authenticatedRequest = useCallback(
        async (path, options = {}) => {
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

            const makeRequest = async (
                currentToken
            ) => {
                const response = await fetch(
                    `${API_BASE_URL}${path}`,
                    {
                        ...options,
                        headers: {
                            "Content-Type":
                                "application/json",
                            ...(options.headers || {}),
                            Authorization:
                                `Bearer ${currentToken}`
                        },
                        credentials: "include"
                    }
                );

                let result = null;

                try {
                    result =
                        await response.json();
                } catch {
                    result = null;
                }

                if (
                    !response.ok ||
                    !result?.success
                ) {
                    const requestError =
                        new Error(
                            result?.message ||
                                "Không thể xử lý yêu cầu"
                        );
                    requestError.status =
                        response.status;
                    requestError.code =
                        result?.code || null;
                    throw requestError;
                }

                return result.data;
            };

            try {
                return await makeRequest(token);
            } catch (requestError) {
                if (
                    requestError.status !== 401
                ) {
                    throw requestError;
                }

                const refreshed =
                    await refreshSession();
                const nextToken =
                    refreshed?.accessToken ||
                    null;

                if (!nextToken) {
                    throw requestError;
                }

                return makeRequest(nextToken);
            }
        },
        [accessToken, refreshSession]
    );

    const loadBooking = useCallback(
        async ({ silent = false } = {}) => {
            try {
                if (!silent) {
                    setLoading(true);
                }
                setError("");

                const data =
                    await authenticatedRequest(
                        `/bookings/${bookingCode}`,
                        {
                            method: "GET"
                        }
                    );

                setBooking(
                    data?.booking || null
                );
            } catch (err) {
                setError(
                    err.message ||
                        "Không thể tải thông tin vé"
                );
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        },
        [
            authenticatedRequest,
            bookingCode
        ]
    );

    const loadIssuedTickets = useCallback(
        async ({ silent = false } = {}) => {
            try {
                if (!silent) {
                    setTicketsLoading(true);
                }

                const data =
                    await authenticatedRequest(
                        `/tickets/booking/${bookingCode}?pass=booking`,
                        {
                            method: "GET"
                        }
                    );

                setBookingPass(data?.bookingPass || null);
                setIssuedTickets(
                    Array.isArray(data?.tickets)
                        ? data.tickets
                        : []
                );
            } catch (err) {
                if (!silent) {
                    setError(
                        err.message ||
                            "Không thể tải QR vé đã phát hành"
                    );
                }
            } finally {
                if (!silent) {
                    setTicketsLoading(false);
                }
            }
        },
        [
            authenticatedRequest,
            bookingCode
        ]
    );

    const syncPayment = useCallback(
        async ({ silent = false } = {}) => {
            try {
                if (!silent) {
                    setLoading(true);
                }

                const data =
                    await authenticatedRequest(
                        `/bookings/${bookingCode}/sync-payment`,
                        {
                            method: "POST"
                        }
                    );

                if (data?.booking) {
                    setBooking(
                        data.booking
                    );
                }

                setSyncError("");
                setError("");
                return data;
            } catch (err) {
                setSyncError(err.message || "Chưa kết nối được SePay để đối chiếu. Hệ thống sẽ thử lại; không chuyển khoản lại.");
                if (!silent) {
                    setError(
                        err.message ||
                            "Chưa thể đối chiếu thanh toán với SePay"
                    );
                }

                return null;
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        },
        [
            authenticatedRequest,
            bookingCode
        ]
    );

    useEffect(() => {
        if (!bookingCode) {
            return;
        }

        if (
            ["success", "cancel", "error"].includes(paymentStatusQuery)
        ) {
            syncPayment().then(
                (data) => {
                    if (!data?.booking) {
                        loadBooking({
                            silent: true
                        });
                    }
                }
            );
            return;
        }

        loadBooking();
    }, [
        bookingCode,
        loadBooking,
        paymentStatusQuery,
        syncPayment
    ]);

    useEffect(() => {
        const shouldPoll =
            ["pending_payment", "expired"].includes(booking?.status) &&
            booking?.paymentStatus !== "paid";

        if (!shouldPoll) {
            return undefined;
        }

        let running = false;
        const pollInterval = window.setInterval(async () => {
            if (running || document.hidden) return;
            running = true;
            try { await syncPayment({ silent: true }); } finally { running = false; }
        }, 10000);

        return () =>
            window.clearInterval(
                pollInterval
            );
    }, [
        paymentStatusQuery,
        booking?.status,
        booking?.paymentStatus,
        syncPayment
    ]);

    useEffect(() => {
        const paidAndConfirmed =
            booking?.status === "confirmed" &&
            booking?.paymentStatus === "paid";

        if (!paidAndConfirmed) {
            setIssuedTickets([]);
            return;
        }

        loadIssuedTickets();
    }, [
        booking?.status,
        booking?.paymentStatus,
        loadIssuedTickets
    ]);

    useEffect(() => {
        if (
            booking?.status !==
                "pending_payment" ||
            !booking?.holdExpiresAt
        ) {
            return undefined;
        }

        const remainingMs =
            new Date(
                booking.holdExpiresAt
            ).getTime() - Date.now();

        if (remainingMs <= 0) {
            loadBooking({
                silent: true
            });
            return undefined;
        }

        const expiryTimer =
            window.setTimeout(() => {
                loadBooking({
                    silent: true
                });
            }, remainingMs + 250);

        return () =>
            window.clearTimeout(
                expiryTimer
            );
    }, [
        booking?.status,
        booking?.holdExpiresAt,
        loadBooking
    ]);

    const handlePay = async () => {
        try {
            setActionLoading(true);
            setError("");

            const data =
                await authenticatedRequest(
                    `/bookings/${bookingCode}/pay`,
                    {
                        method: "POST"
                    }
                );

            if (!data?.sepayCheckout) {
                throw new Error(
                    "Cổng thanh toán chưa được cấu hình. Vui lòng thử lại sau."
                );
            }

            const form =
                document.createElement(
                    "form"
                );
            form.method = "POST";
            form.action =
                data.sepayCheckout.checkoutURL;

            Object.entries(
                data.sepayCheckout.formFields ||
                    {}
            ).forEach(([key, value]) => {
                const input =
                    document.createElement(
                        "input"
                    );
                input.type = "hidden";
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
        } catch (err) {
            await loadBooking({
                silent: true
            });
            setError(
                err.message ||
                    "Đã xảy ra lỗi khi tạo thanh toán"
            );
            setActionLoading(false);
        }
    };

    const handleCancelBooking =
        async () => {
            const accepted =
                window.confirm(
                    t("Hủy đơn này sẽ nhả ghế để người khác có thể đặt. Bạn có chắc muốn tiếp tục?")
                );

            if (!accepted) {
                return;
            }

            try {
                setActionLoading(true);
                setError("");

                const data =
                    await authenticatedRequest(
                        `/bookings/${bookingCode}/cancel`,
                        {
                            method: "POST"
                        }
                    );

                setBooking(
                    data?.booking || null
                );
            } catch (err) {
                await loadBooking({
                    silent: true
                });
                setError(
                    err.message ||
                        "Không thể hủy đơn đặt vé"
                );
            } finally {
                setActionLoading(false);
            }
        };

    if (loading) {
        return (
            <section className="ticket-state">
                <div className="ticket-state-card">
                    <div className="ticket-spinner" />
                    <h2>{t("Đang tải vé")}</h2>
                    <p> {t("FYCE đang kiểm tra trạng thái đơn và thanh toán của bạn.")} </p>
                </div>
            </section>
        );
    }

    if (error && !booking) {
        return (
            <section className="ticket-state">
                <div className="ticket-state-card">
                    <AlertTriangle
                        size={36}
                        strokeWidth={1.8}
                    />
                    <h2> {t("Không thể mở vé")} </h2>
                    <p>{t(error)}</p>
                    <Link
                        className="ticket-action ticket-action--primary"
                        to="/my-tickets"
                    > {t("Về Vé của tôi")} </Link>
                </div>
            </section>
        );
    }

    if (!booking) {
        return null;
    }

    const bookingState =
        getBookingState(booking);
    const StatusIcon =
        bookingState.Icon;
    const isValidTicket =
        booking.status === "confirmed" &&
        booking.paymentStatus === "paid";
    const isInactive = [
        "cancelled",
        "expired"
    ].includes(booking.status);
    const canPay =
        booking.status ===
            "pending_payment" &&
        booking.paymentStatus !== "paid" &&
        (!booking.holdExpiresAt ||
            new Date(
                booking.holdExpiresAt
            ).getTime() > clockNow);

    return (
        <main className="ticket-page">
            <div className="ticket-shell">
                <header className="ticket-page-header">
                    <div>
                        <span className="ticket-page-kicker">
                            <Ticket size={15} />
                            FYCE E-TICKET
                        </span>
                        <h1> {t("Chi tiết vé")} </h1>
                        <p> {t("Thông tin đơn đặt vé, trạng thái thanh toán và mã QR vào cửa của bạn.")} </p>
                    </div>

                    <Link
                        className="ticket-back-link"
                        to="/my-tickets"
                    >
                        <ArrowLeft
                            size={16}
                        /> {t("Vé của tôi")} </Link>
                </header>

                {t(paymentStatusQuery ===
                    "success" &&
                    !isValidTicket &&
                    !isInactive && (
                        <div className="ticket-alert ticket-alert--info">
                            <Clock3
                                size={18}
                            />
                            <span> {t("Giao dịch đã quay về từ SePay. FYCE đang đối chiếu trực tiếp trạng thái đơn hàng với SePay; vé sẽ tự chuyển sang đã thanh toán ngay khi SePay xác nhận giao dịch.")} </span>
                        </div>
                    ))}

                {t(isValidTicket && (
                        <div className="ticket-alert ticket-alert--success">
                            <CheckCircle2
                                size={18}
                            />
                            <span> {t("Thanh toán đã được xác nhận. Vé của bạn đã sẵn sàng sử dụng.")} </span>
                        </div>
                    ))}

                {t(paymentStatusQuery ===
                    "cancel" &&
                    booking.status ===
                        "pending_payment" && (
                        <div className="ticket-alert ticket-alert--warning">
                            <AlertTriangle
                                size={18}
                            />
                            <span> {t("Bạn đã đóng hoặc hủy thao tác tại cổng thanh toán. Đơn vẫn còn hiệu lực trong thời gian giữ ghế; bạn có thể thanh toán lại hoặc hủy đơn để nhả ghế.")} </span>
                        </div>
                    ))}

                {t(paymentStatusQuery ===
                    "error" && !isValidTicket && !booking.paymentReviewRequired && (
                        <div className="ticket-alert ticket-alert--danger">
                            <XCircle
                                size={18}
                            />
                            <span> {t("Cổng thanh toán trả về thông báo lỗi. FYCE đang kiểm tra lại trạng thái thực tế; nếu bạn đã chuyển khoản, không thanh toán lần nữa.")} </span>
                        </div>
                    ))}

                {t(syncError && !isValidTicket && <div className="ticket-alert ticket-alert--warning" role="status">{t(syncError)}</div>)}
                {t(booking.paymentReviewRequired && <div className="ticket-alert ticket-alert--warning" role="alert">{t("FYCE đã nhận thông báo giao dịch nhưng cần đối chiếu ghế/số tiền. Không chuyển khoản lại; liên hệ admin với mã đơn")} {t(booking.bookingCode)}{t(". Vé chỉ được phát hành khi đối chiếu hợp lệ.")}</div>)}
                {t(error && (
                    <div className="ticket-alert ticket-alert--danger">
                        <AlertTriangle
                            size={18}
                        />
                        <span>{t(error)}</span>
                    </div>
                ))}

                <section className="ticket-card ticket-hero">
                    <div className="ticket-hero-top">
                        <div className="ticket-hero-title">
                            <h2>
                                {
                                    t(booking
                                        .eventSnapshot
                                        .title)
                                }
                            </h2>
                            <div className="ticket-booking-code">
                                <ReceiptText
                                    size={15}
                                /> {t("Mã đơn")} <strong>
                                    {
                                        t(booking.bookingCode)
                                    }
                                </strong>
                            </div>
                        </div>

                        <span
                            className={`ticket-status ticket-status--${bookingState.key}`}
                        >
                            <StatusIcon
                                size={15}
                            />
                            {
                                t(bookingState.label)
                            }
                        </span>
                    </div>

                    <div className="ticket-meta-grid">
                        <div className="ticket-meta-item">
                            <CalendarDays
                                size={18}
                            />
                            <div>
                                <small> {t("Thời gian")} </small>
                                <strong>
                                    {t(formatDateTime(
                                        booking
                                            .eventSnapshot
                                            .startAt, locale
                                    ))}
                                </strong>
                            </div>
                        </div>

                        <div className="ticket-meta-item">
                            <MapPin
                                size={18}
                            />
                            <div>
                                <small> {t("Địa điểm")} </small>
                                <strong>
                                    {t(booking
                                        .eventSnapshot
                                        .venue ||
                                        "Đang cập nhật")}
                                </strong>
                            </div>
                        </div>

                        <div className="ticket-meta-item">
                            <CreditCard
                                size={18}
                            />
                            <div>
                                <small> {t("Tổng tiền")} </small>
                                <strong>
                                    {t(formatPrice(
                                        booking.totalAmount, locale
                                    ))}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {t(canPay && (
                        <div className="ticket-payment-box">
                            <div className="ticket-payment-copy">
                                <strong> {t("Đơn đang chờ thanh toán")} </strong>
                                <span> {t("Hoàn tất thanh toán trước khi hết thời gian giữ ghế để nhận mã QR.")} </span>
                            </div>

                            <div className="ticket-actions">
                                <button
                                    type="button"
                                    className="ticket-action ticket-action--primary"
                                    onClick={
                                        handlePay
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    <CreditCard
                                        size={16}
                                    />
                                    {t(actionLoading
                                        ? "Đang xử lý..."
                                        : "Thanh toán")}
                                </button>
                                <button
                                    type="button"
                                    className="ticket-action ticket-action--danger"
                                    onClick={
                                        handleCancelBooking
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    <XCircle
                                        size={16}
                                    /> {t("Hủy đơn")} </button>
                            </div>
                        </div>
                    ))}
                </section>

                {t(isInactive ? (
                    <section className="ticket-section">
                        <div className="ticket-card ticket-invalid-card">
                            <div className="ticket-invalid-icon">
                                {t(booking.status ===
                                "cancelled" ? (
                                    <XCircle
                                        size={28}
                                    />
                                ) : (
                                    <Clock3
                                        size={28}
                                    />
                                ))}
                            </div>
                            <h3>
                                {t(booking.status ===
                                "cancelled"
                                    ? "Đơn đã hủy — không còn vé hợp lệ"
                                    : "Đơn đã hết hạn — không còn vé hợp lệ")}
                            </h3>
                            <p>
                                {t(booking.paymentStatus === "refunded"
                                    ? "Các vé đã hủy sau hoàn tiền thủ công. Ghế được mở bán lại, QR cũ không còn hiệu lực."
                                    : "Đơn không còn hiệu lực. Các ghế đã được trả lại hệ thống để người khác có thể đặt.")}
                            </p>
                            <h4>{t("Lịch sử ghế trong đơn")}</h4>
                            <ul>{t(booking.items.map(item => <li key={item.ticketCode}>{t(item.seatLabel)} · {t(item.ticketCode)} · {t(formatPrice(item.unitPrice, locale))}</li>))}</ul>
                            {t(booking.refundedAmount > 0 && <p>{t("Đã ghi nhận hoàn:")} {t(formatPrice(booking.refundedAmount, locale))}</p>)}
                        </div>
                    </section>
                ) : (
                    <section className="ticket-section">
                        <div className="ticket-section-heading">
                            <h3>
                                <Armchair
                                    size={18}
                                />
                                {t(isValidTicket
                                    ? "Vé của bạn"
                                    : "Ghế đang giữ")}
                            </h3>
                            <span>
                                {t(booking.items.length)} {t("ghế")} </span>
                        </div>

                        {t(isValidTicket && <section className="ticket-card booking-group-pass" aria-label={t("QR chung của đơn")}>
                            <div>{t(bookingPass?.qrPayload ? <QRCodeSVG value={bookingPass.qrPayload} size={240} level="M" marginSize={4}/> : <CheckCircle2 size={48}/>)}</div>
                            <div><h2>{t("Một QR cho cả đơn vé")}</h2><strong>{t(booking.bookingCode)}</strong>
                            <p>{t(bookingPass?.validCount || 0)} {t("ghế còn hiệu lực ·")} {t(bookingPass?.checkedInCount || 0)} {t("đã check-in")}</p>
                            <p>{t("Xuất trình QR khi cả nhóm đã có mặt. Một lần xác nhận sẽ check-in tất cả ghế còn hiệu lực; ghế đã hủy hoặc hoàn tiền không được sử dụng.")}</p>
                            <p>{t("Khách đến riêng có thể cung cấp mã vé TKT của từng ghế cho nhân viên.")}</p>
                            {t(!bookingPass?.qrPayload && <p>{t(ticketsLoading ? "Đang phát hành QR..." : bookingPass?.checkedInCount ? "Tất cả vé còn hiệu lực đã check-in." : "Chưa lấy được QR vé")}</p>)}
                            <small>{t("Không chia sẻ QR hoặc mã vé với người khác.")}</small></div>
                        </section>)}
                        <details className="ticket-seat-details" open={booking.items.length <= 8}><summary>{t("Danh sách ghế trong đơn")} ({booking.items.length})</summary><div className="ticket-grid">
                            {t(booking.items.map(
                                (item) => (
                                    <article
                                        key={
                                            item.ticketCode ||
                                            item.seatId
                                        }
                                        className="ticket-card ticket-pass"
                                    >
                                        <div className="ticket-pass-content">
                                            <div className="ticket-pass-seat">
                                                {t(item.row)}
                                                {t(item.number)}
                                            </div>

                                            <div className="ticket-pass-info">
                                                <strong>
                                                    {
                                                        t(item.ticketCategoryName)
                                                    }
                                                </strong>
                                                <span> {t("Khu vực:")} {t(item.section)}
                                                </span>
                                                <span> {t("Hàng")} {t(item.row)} {t("· Ghế")} {t(item.number)}
                                                </span>
                                                <span>
                                                    {t(formatPrice(
                                                        item.unitPrice, locale
                                                    ))}
                                                </span>
                                            </div>
                                        </div>

                                        {t(isValidTicket ? (() => {
                                            const issuedTicket =
                                                issuedTickets.find(
                                                    (ticket) =>
                                                        ticket.ticketCode ===
                                                        item.ticketCode
                                                );

                                            if (ticketsLoading) {
                                                return (
                                                    <div className="ticket-qr-wrap">
                                                        <div className="ticket-payment-copy">
                                                            <strong> {t("Đang phát hành QR...")} </strong>
                                                            <span> {t("FYCE đang lấy mã vé bảo mật từ máy chủ.")} </span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (
                                                issuedTicket?.status ===
                                                "checked_in"
                                            ) {
                                                return (
                                                    <div className="ticket-qr-wrap ticket-qr-used">
                                                        <CheckCircle2
                                                            size={28}
                                                        />
                                                        <strong> {t("Đã check-in")} </strong>
                                                        <span>
                                                            {t(formatDateTime(
                                                                issuedTicket.checkedInAt, locale
                                                            ))}
                                                        </span>
                                                        <small> {t("QR đã vô hiệu sau khi vào cửa.")} </small>
                                                    </div>
                                                );
                                            }

                                            if (["refunded", "cancelled"].includes(issuedTicket?.status)) {
                                                return <div className="ticket-qr-wrap ticket-qr-used"><strong>{t("Vé đã hủy sau hoàn tiền")}</strong><span>{t("QR cũ đã vô hiệu. Lịch sử mua ghế vẫn được lưu.")}</span></div>;
                                            }

                                            if (issuedTicket?.status === "valid") {
                                                return <div className="ticket-qr-wrap"><strong>{t("Vé còn hiệu lực")}</strong><span>{t(issuedTicket.ticketCode)}</span><small>{t("Dùng QR chung của đơn phía trên để vào cửa.")}</small></div>;
                                            }

                                            return (
                                                <div className="ticket-qr-wrap">
                                                    <div className="ticket-payment-copy">
                                                        <strong> {t("Chưa lấy được QR vé")} </strong>
                                                        <span> {t("Hãy tải lại trang. Vé đã thanh toán sẽ được phát hành tự động.")} </span>
                                                    </div>
                                                </div>
                                            );
                                        })() : (
                                            <div className="ticket-qr-wrap">
                                                <div className="ticket-payment-copy">
                                                    <strong>
                                                        {t(booking.paymentStatus === "refunded" ? "Vé đã hủy sau hoàn tiền" : "QR chưa được phát hành")}
                                                    </strong>
                                                    <span>
                                                        {t(booking.paymentStatus === "refunded" ? "QR cũ đã vô hiệu. Lịch sử mua ghế được giữ nguyên." : "Mã vào cửa chỉ xuất hiện sau khi thanh toán được xác nhận.")}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </article>
                                )
                            ))}
                        </div></details>
                    </section>
                ))}
            </div>
        </main>
    );
};

export default BookingDetailsPage;
