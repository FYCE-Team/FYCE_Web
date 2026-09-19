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
    QrCode,
    ReceiptText,
    Ticket,
    XCircle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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
    if (
        booking?.status === "confirmed" &&
        booking?.paymentStatus === "paid"
    ) {
        return {
            key: "confirmed",
            label: "Đã thanh toán",
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
                        `/tickets/booking/${bookingCode}`,
                        {
                            method: "GET"
                        }
                    );

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

                return data;
            } catch (err) {
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
            paymentStatusQuery ===
            "success"
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
            paymentStatusQuery === "success" &&
            booking?.status ===
                "pending_payment" &&
            booking?.paymentStatus !== "paid";

        if (!shouldPoll) {
            return undefined;
        }

        const pollInterval =
            window.setInterval(() => {
                syncPayment({
                    silent: true
                });
            }, 3000);

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
                    "Hủy đơn này sẽ nhả ghế để người khác có thể đặt. Bạn có chắc muốn tiếp tục?"
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
                    <h2>Đang tải vé</h2>
                    <p>
                        FYCE đang kiểm tra trạng thái đơn và thanh toán của bạn.
                    </p>
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
                    <h2>
                        Không thể mở vé
                    </h2>
                    <p>{error}</p>
                    <Link
                        className="ticket-action ticket-action--primary"
                        to="/my-tickets"
                    >
                        Về Vé của tôi
                    </Link>
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
            ).getTime() > Date.now());

    return (
        <main className="ticket-page">
            <div className="ticket-shell">
                <header className="ticket-page-header">
                    <div>
                        <span className="ticket-page-kicker">
                            <Ticket size={15} />
                            FYCE E-TICKET
                        </span>
                        <h1>
                            Chi tiết vé
                        </h1>
                        <p>
                            Thông tin đơn đặt vé, trạng thái thanh toán và mã QR vào cửa của bạn.
                        </p>
                    </div>

                    <Link
                        className="ticket-back-link"
                        to="/my-tickets"
                    >
                        <ArrowLeft
                            size={16}
                        />
                        Vé của tôi
                    </Link>
                </header>

                {paymentStatusQuery ===
                    "success" &&
                    !isValidTicket &&
                    !isInactive && (
                        <div className="ticket-alert ticket-alert--info">
                            <Clock3
                                size={18}
                            />
                            <span>
                                Giao dịch đã quay về từ SePay. FYCE đang đối chiếu trực tiếp trạng thái đơn hàng với SePay; vé sẽ tự chuyển sang đã thanh toán ngay khi SePay xác nhận giao dịch.
                            </span>
                        </div>
                    )}

                {paymentStatusQuery ===
                    "success" &&
                    isValidTicket && (
                        <div className="ticket-alert ticket-alert--success">
                            <CheckCircle2
                                size={18}
                            />
                            <span>
                                Thanh toán đã được xác nhận. Vé của bạn đã sẵn sàng sử dụng.
                            </span>
                        </div>
                    )}

                {paymentStatusQuery ===
                    "cancel" &&
                    booking.status ===
                        "pending_payment" && (
                        <div className="ticket-alert ticket-alert--warning">
                            <AlertTriangle
                                size={18}
                            />
                            <span>
                                Bạn đã đóng hoặc hủy thao tác tại cổng thanh toán. Đơn vẫn còn hiệu lực trong thời gian giữ ghế; bạn có thể thanh toán lại hoặc hủy đơn để nhả ghế.
                            </span>
                        </div>
                    )}

                {paymentStatusQuery ===
                    "error" && (
                        <div className="ticket-alert ticket-alert--danger">
                            <XCircle
                                size={18}
                            />
                            <span>
                                Thanh toán chưa hoàn tất. Không có khoản thanh toán nào được ghi nhận cho đến khi FYCE nhận xác nhận hợp lệ từ SePay.
                            </span>
                        </div>
                    )}

                {error && (
                    <div className="ticket-alert ticket-alert--danger">
                        <AlertTriangle
                            size={18}
                        />
                        <span>{error}</span>
                    </div>
                )}

                <section className="ticket-card ticket-hero">
                    <div className="ticket-hero-top">
                        <div className="ticket-hero-title">
                            <h2>
                                {
                                    booking
                                        .eventSnapshot
                                        .title
                                }
                            </h2>
                            <div className="ticket-booking-code">
                                <ReceiptText
                                    size={15}
                                />
                                Mã đơn
                                <strong>
                                    {
                                        booking.bookingCode
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
                                bookingState.label
                            }
                        </span>
                    </div>

                    <div className="ticket-meta-grid">
                        <div className="ticket-meta-item">
                            <CalendarDays
                                size={18}
                            />
                            <div>
                                <small>
                                    Thời gian
                                </small>
                                <strong>
                                    {formatDateTime(
                                        booking
                                            .eventSnapshot
                                            .startAt
                                    )}
                                </strong>
                            </div>
                        </div>

                        <div className="ticket-meta-item">
                            <MapPin
                                size={18}
                            />
                            <div>
                                <small>
                                    Địa điểm
                                </small>
                                <strong>
                                    {booking
                                        .eventSnapshot
                                        .venue ||
                                        "Đang cập nhật"}
                                </strong>
                            </div>
                        </div>

                        <div className="ticket-meta-item">
                            <CreditCard
                                size={18}
                            />
                            <div>
                                <small>
                                    Tổng tiền
                                </small>
                                <strong>
                                    {formatPrice(
                                        booking.totalAmount
                                    )}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {canPay && (
                        <div className="ticket-payment-box">
                            <div className="ticket-payment-copy">
                                <strong>
                                    Đơn đang chờ thanh toán
                                </strong>
                                <span>
                                    Hoàn tất thanh toán trước khi hết thời gian giữ ghế để nhận mã QR.
                                </span>
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
                                    {actionLoading
                                        ? "Đang xử lý..."
                                        : "Thanh toán"}
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
                                    />
                                    Hủy đơn
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {isInactive ? (
                    <section className="ticket-section">
                        <div className="ticket-card ticket-invalid-card">
                            <div className="ticket-invalid-icon">
                                {booking.status ===
                                "cancelled" ? (
                                    <XCircle
                                        size={28}
                                    />
                                ) : (
                                    <Clock3
                                        size={28}
                                    />
                                )}
                            </div>
                            <h3>
                                {booking.status ===
                                "cancelled"
                                    ? "Đơn đã hủy — không còn vé hợp lệ"
                                    : "Đơn đã hết hạn — không còn vé hợp lệ"}
                            </h3>
                            <p>
                                Các ghế của đơn chưa thanh toán này đã được trả lại hệ thống để người khác có thể đặt. Vì vậy FYCE không hiển thị nút thanh toán hoặc mã QR cho đơn này.
                            </p>
                        </div>
                    </section>
                ) : (
                    <section className="ticket-section">
                        <div className="ticket-section-heading">
                            <h3>
                                <Armchair
                                    size={18}
                                />
                                {isValidTicket
                                    ? "Vé của bạn"
                                    : "Ghế đang giữ"}
                            </h3>
                            <span>
                                {booking.items.length} ghế
                            </span>
                        </div>

                        <div className="ticket-grid">
                            {booking.items.map(
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
                                                {item.row}
                                                {item.number}
                                            </div>

                                            <div className="ticket-pass-info">
                                                <strong>
                                                    {
                                                        item.ticketCategoryName
                                                    }
                                                </strong>
                                                <span>
                                                    Khu vực: {item.section}
                                                </span>
                                                <span>
                                                    Hàng {item.row} · Ghế {item.number}
                                                </span>
                                                <span>
                                                    {formatPrice(
                                                        item.unitPrice
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {isValidTicket ? (() => {
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
                                                            <strong>
                                                                Đang phát hành QR...
                                                            </strong>
                                                            <span>
                                                                FYCE đang lấy mã vé bảo mật từ máy chủ.
                                                            </span>
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
                                                        <strong>
                                                            Đã check-in
                                                        </strong>
                                                        <span>
                                                            {formatDateTime(
                                                                issuedTicket.checkedInAt
                                                            )}
                                                        </span>
                                                        <small>
                                                            QR đã vô hiệu sau khi vào cửa.
                                                        </small>
                                                    </div>
                                                );
                                            }

                                            if (issuedTicket?.qrPayload) {
                                                return (
                                                    <div className="ticket-qr-wrap">
                                                        <div className="ticket-qr">
                                                            <QRCodeSVG
                                                                value={
                                                                    issuedTicket.qrPayload
                                                                }
                                                                size={132}
                                                                level="H"
                                                            />
                                                        </div>
                                                        <div className="ticket-qr-meta">
                                                            <div className="ticket-code-text">
                                                                <QrCode
                                                                    size={16}
                                                                />
                                                                <span>
                                                                    {issuedTicket.ticketCode}
                                                                </span>
                                                            </div>
                                                            <small className="ticket-qr-security">
                                                                QR được ký bởi FYCE và không chứa thông tin cá nhân. Không chia sẻ ảnh QR cho người khác.
                                                            </small>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="ticket-qr-wrap">
                                                    <div className="ticket-payment-copy">
                                                        <strong>
                                                            Chưa lấy được QR vé
                                                        </strong>
                                                        <span>
                                                            Hãy tải lại trang. Vé đã thanh toán sẽ được phát hành tự động.
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })() : (
                                            <div className="ticket-qr-wrap">
                                                <div className="ticket-payment-copy">
                                                    <strong>
                                                        QR chưa được phát hành
                                                    </strong>
                                                    <span>
                                                        Mã vào cửa chỉ xuất hiện sau khi thanh toán được xác nhận.
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                )
                            )}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
};

export default BookingDetailsPage;
