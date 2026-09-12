import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import {
    Link,
    useNavigate,
    useParams
} from "react-router-dom";

import {
    useAuth
} from "../../../context/AuthContext.jsx";

import "./CheckoutPage.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const formatPrice = (value) =>
    `${new Intl.NumberFormat(
        "vi-VN"
    ).format(Number(value) || 0)}đ`;

const formatDateTime = (date) => {
    if (!date) {
        return "Đang cập nhật";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(new Date(date));
};

const formatCountdown = (
    totalSeconds
) => {
    const safe = Math.max(
        0,
        Number(totalSeconds) || 0
    );

    const minutes = Math.floor(
        safe / 60
    );
    const seconds = safe % 60;

    return `${String(minutes).padStart(
        2,
        "0"
    )}:${String(seconds).padStart(
        2,
        "0"
    )}`;
};

const CheckoutPage = () => {
    const { bookingCode } =
        useParams();

    const navigate = useNavigate();

    const {
        accessToken,
        refreshSession
    } = useAuth();

    const [booking, setBooking] =
        useState(null);
    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState("");
    const [remainingSeconds, setRemainingSeconds] =
        useState(0);
    const [cancelling, setCancelling] =
        useState(false);

    const authenticatedRequest =
        useCallback(
            async (
                path,
                options = {}
            ) => {
                let token = accessToken;

                if (!token) {
                    const refreshed =
                        await refreshSession();

                    token =
                        refreshed?.accessToken ||
                        null;
                }

                if (!token) {
                    const authError =
                        new Error(
                            "Phiên đăng nhập đã hết hạn."
                        );
                    authError.status = 401;
                    throw authError;
                }

                const makeRequest =
                    async (currentToken) => {
                        const response =
                            await fetch(
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
                                    credentials:
                                        "include"
                                }
                            );

                        const result =
                            await response.json();

                        if (
                            !response.ok ||
                            !result?.success
                        ) {
                            const requestError =
                                new Error(
                                    result?.message ||
                                        "Không thể xử lý booking"
                                );

                            requestError.status =
                                response.status;

                            throw requestError;
                        }

                        return result.data;
                    };

                try {
                    return await makeRequest(
                        token
                    );
                } catch (requestError) {
                    if (
                        requestError.status !==
                        401
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

                    return makeRequest(
                        nextToken
                    );
                }
            },
            [
                accessToken,
                refreshSession
            ]
        );

    const loadBooking =
        useCallback(async () => {
            try {
                setLoading(true);
                setError("");

                const data =
                    await authenticatedRequest(
                        `/bookings/${bookingCode}`
                    );

                setBooking(
                    data.booking
                );
            } catch (err) {
                setError(
                    err.message ||
                        "Không thể tải đơn đặt vé"
                );
            } finally {
                setLoading(false);
            }
        }, [
            authenticatedRequest,
            bookingCode
        ]);

    useEffect(() => {
        loadBooking();
    }, [loadBooking]);

    useEffect(() => {
        if (
            !booking?.holdExpiresAt ||
            booking.status !==
                "pending_payment"
        ) {
            setRemainingSeconds(0);
            return;
        }

        let expiredReloaded = false;

        const tick = () => {
            const seconds = Math.max(
                0,
                Math.ceil(
                    (
                        new Date(
                            booking.holdExpiresAt
                        ).getTime() -
                        Date.now()
                    ) /
                        1000
                )
            );

            setRemainingSeconds(
                seconds
            );

            if (
                seconds === 0 &&
                !expiredReloaded
            ) {
                expiredReloaded = true;
                loadBooking();
            }
        };

        tick();

        const timer = window.setInterval(
            tick,
            1000
        );

        return () =>
            window.clearInterval(timer);
    }, [
        booking?.holdExpiresAt,
        booking?.status,
        loadBooking
    ]);

    const groupedItems = useMemo(
        () =>
            booking?.items || [],
        [booking]
    );

    const handleCancel = async () => {
        if (
            !booking ||
            booking.status !==
                "pending_payment"
        ) {
            return;
        }

        try {
            setCancelling(true);
            setError("");

            const data =
                await authenticatedRequest(
                    `/bookings/${booking.bookingCode}/cancel`,
                    {
                        method: "POST",
                        body: JSON.stringify({})
                    }
                );

            setBooking(
                data.booking
            );

            const slug =
                data.booking
                    ?.eventSnapshot?.slug;

            if (slug) {
                navigate(
                    `/events/${slug}/seats`,
                    {
                        replace: true
                    }
                );
            }
        } catch (err) {
            setError(
                err.message ||
                    "Không thể hủy đơn đặt vé"
            );
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <section className="checkout-state">
                <div className="checkout-spinner" />
                <p>
                    Đang tải đơn đặt vé...
                </p>
            </section>
        );
    }

    if (error && !booking) {
        return (
            <section className="checkout-state">
                <h1>
                    Không thể mở checkout
                </h1>
                <p>{error}</p>
                <Link
                    to="/"
                    className="checkout-back-link"
                >
                    ← Về trang chủ
                </Link>
            </section>
        );
    }

    if (!booking) {
        return null;
    }

    const isPending =
        booking.status ===
        "pending_payment";

    const isExpired =
        booking.status === "expired";

    const isCancelled =
        booking.status === "cancelled";

    return (
        <main className="checkout-page">
            <div className="checkout-container">
                <header className="checkout-header">
                    <div>
                        <span>
                            CHECKOUT FYCE
                        </span>
                        <h1>
                            Xác nhận đơn đặt vé
                        </h1>
                        <p>
                            Kiểm tra ghế và thông tin trước khi chuyển sang bước thanh toán.
                        </p>
                    </div>

                    <div className="checkout-timer">
                        <small>
                            THỜI GIAN CÒN LẠI
                        </small>
                        <strong>
                            {isPending
                                ? formatCountdown(
                                      remainingSeconds
                                  )
                                : "--:--"}
                        </strong>
                    </div>
                </header>

                {error && (
                    <div className="checkout-message checkout-message--error">
                        {error}
                    </div>
                )}

                {(isExpired ||
                    isCancelled) && (
                    <div className="checkout-message checkout-message--warning">
                        {isExpired
                            ? "Đơn đặt vé đã hết thời gian giữ ghế. Bạn cần chọn lại ghế."
                            : "Đơn đặt vé đã được hủy."}
                    </div>
                )}

                <div className="checkout-grid">
                    <section className="checkout-card checkout-card--main">
                        <div className="checkout-event">
                            <div>
                                <small>
                                    SỰ KIỆN
                                </small>
                                <h2>
                                    {booking.eventSnapshot.title}
                                </h2>
                                <p>
                                    {formatDateTime(
                                        booking.eventSnapshot.startAt
                                    )}
                                </p>
                                <p>
                                    {booking.eventSnapshot.venue}
                                    {booking.eventSnapshot.address
                                        ? ` • ${booking.eventSnapshot.address}`
                                        : ""}
                                </p>
                            </div>

                            <span className="checkout-code">
                                {booking.bookingCode}
                            </span>
                        </div>

                        <div className="checkout-divider" />

                        <div className="checkout-section-title">
                            <h3>
                                Ghế đã chọn
                            </h3>
                            <span>
                                {groupedItems.length} vé
                            </span>
                        </div>

                        <div className="checkout-ticket-list">
                            {groupedItems.map(
                                (item) => (
                                    <article
                                        className="checkout-ticket-row"
                                        key={
                                            String(
                                                item.seatId
                                            )
                                        }
                                    >
                                        <div className="checkout-seat-badge">
                                            {item.seatLabel}
                                        </div>

                                        <div className="checkout-ticket-info">
                                            <strong>
                                                {item.ticketCategoryName}
                                            </strong>
                                            <span>
                                                Hàng {item.row} • Ghế {item.number}
                                            </span>
                                        </div>

                                        <strong className="checkout-ticket-price">
                                            {formatPrice(
                                                item.unitPrice
                                            )}
                                        </strong>
                                    </article>
                                )
                            )}
                        </div>
                    </section>

                    <aside className="checkout-card checkout-card--summary">
                        <div className="checkout-section-title">
                            <h3>
                                Người đặt vé
                            </h3>
                        </div>

                        <div className="checkout-customer">
                            <div>
                                <small>
                                    Họ và tên
                                </small>
                                <strong>
                                    {booking.customer.fullName}
                                </strong>
                            </div>

                            <div>
                                <small>Email</small>
                                <strong>
                                    {booking.customer.email}
                                </strong>
                            </div>

                            <div>
                                <small>
                                    Số điện thoại
                                </small>
                                <strong>
                                    {booking.customer.phone ||
                                        "Chưa cập nhật"}
                                </strong>
                            </div>
                        </div>

                        <div className="checkout-divider" />

                        <div className="checkout-total-row">
                            <span>Tạm tính</span>
                            <strong>
                                {formatPrice(
                                    booking.subtotal
                                )}
                            </strong>
                        </div>

                        <div className="checkout-total-row checkout-total-row--grand">
                            <span>
                                Tổng thanh toán
                            </span>
                            <strong>
                                {formatPrice(
                                    booking.totalAmount
                                )}
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="checkout-pay-button"
                            disabled
                            title="Payment sẽ được tích hợp ở bước tiếp theo"
                        >
                            Thanh toán — bước tiếp theo
                        </button>

                        {isPending ? (
                            <>
                                <Link
                                    className="checkout-cancel-button checkout-cancel-button--link"
                                    to={`/events/${booking.eventSnapshot.slug}`}
                                >
                                    ← Quay lại thông tin sự kiện
                                </Link>

                                <button
                                    type="button"
                                    className="checkout-cancel-button checkout-cancel-button--danger"
                                    onClick={
                                        handleCancel
                                    }
                                    disabled={
                                        cancelling
                                    }
                                >
                                    {cancelling
                                        ? "Đang hủy..."
                                        : "Hủy booking & nhả ghế"}
                                </button>
                            </>
                        ) : (
                            <Link
                                className="checkout-cancel-button checkout-cancel-button--link"
                                to={`/events/${booking.eventSnapshot.slug}/seats`}
                            >
                                Chọn lại ghế
                            </Link>
                        )}
                    </aside>
                </div>
            </div>
        </main>
    );
};

export default CheckoutPage;
