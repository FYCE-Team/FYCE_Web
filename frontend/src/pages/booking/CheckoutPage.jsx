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

const HOLD_STORAGE_PREFIX =
    "fyce-seat-hold:";

const getHoldStorageKey = (
    eventId,
    userId
) =>
    `${HOLD_STORAGE_PREFIX}${userId}:${eventId}`;

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
    const params = useParams();

    /*
     * Hỗ trợ cả route mới /checkout/:eventId
     * và route cũ /checkout/:bookingCode để bạn chưa cần
     * sửa App.jsx ngay. Giá trị URL hiện tại là eventId.
     */
    const eventId =
        params.eventId ||
        params.bookingCode ||
        "";

    const navigate = useNavigate();

    const {
        accessToken,
        user,
        refreshSession
    } = useAuth();

    const currentUserId = String(
        user?._id ||
        user?.id ||
        user?.userId ||
        ""
    );

    const [checkout, setCheckout] =
        useState(null);
    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState("");
    const [remainingSeconds, setRemainingSeconds] =
        useState(0);
    const [cancelling, setCancelling] =
        useState(false);
    const [expired, setExpired] =
        useState(false);

    const storageKey = useMemo(
        () =>
            eventId && currentUserId
                ? getHoldStorageKey(
                      eventId,
                      currentUserId
                  )
                : "",
        [eventId, currentUserId]
    );

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
                                        "Không thể xử lý checkout"
                                );

                            requestError.status =
                                response.status;
                            requestError.code =
                                result?.code || null;
                            requestError.data =
                                result?.data || null;

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

    const clearHoldSession =
        useCallback(() => {
            if (storageKey) {
                sessionStorage.removeItem(
                    storageKey
                );
            }
        }, [storageKey]);

    const loadCheckout =
        useCallback(async () => {
            if (
                !eventId ||
                !currentUserId
            ) {
                return;
            }

            try {
                setLoading(true);
                setError("");
                setExpired(false);

                /*
                 * MongoDB is the source of truth for the hold session.
                 * Do not depend on sessionStorage because another browser
                 * logged into the same account has a different storage area.
                 */
                const holdData =
                    await authenticatedRequest(
                        `/seats/hold-session?eventId=${encodeURIComponent(
                            eventId
                        )}`,
                        {
                            method: "GET"
                        }
                    );

                const serverHold =
                    holdData?.holdSession ||
                    null;

                if (
                    !serverHold ||
                    !serverHold.holdToken ||
                    !Array.isArray(
                        serverHold.seats
                    ) ||
                    serverHold.seats.length ===
                        0
                ) {
                    clearHoldSession();

                    throw new Error(
                        "Không tìm thấy phiên giữ ghế còn hiệu lực. Vui lòng chọn lại ghế."
                    );
                }

                const hold = {
                    holdToken:
                        serverHold.holdToken,
                    holdExpiresAt:
                        serverHold.holdExpiresAt,
                    selectedSeats:
                        serverHold.seats
                };

                if (storageKey) {
                    sessionStorage.setItem(
                        storageKey,
                        JSON.stringify(hold)
                    );
                }

                const data =
                    await authenticatedRequest(
                        "/bookings/preview",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                eventId,
                                seatIds:
                                    hold.selectedSeats.map(
                                        (seat) =>
                                            seat._id
                                    ),
                                holdToken:
                                    hold.holdToken
                            })
                        }
                    );

                setCheckout(
                    data.checkout
                );
            } catch (err) {
                if (
                    err.code ===
                        "BOOKING_HOLD_EXPIRED" ||
                    err.code ===
                        "BOOKING_SEAT_HOLD_INVALID"
                ) {
                    clearHoldSession();
                    setExpired(true);
                }

                setCheckout(null);
                setError(
                    err.message ||
                        "Không thể tải checkout"
                );
            } finally {
                setLoading(false);
            }
        }, [
            eventId,
            currentUserId,
            authenticatedRequest,
            clearHoldSession,
            storageKey
        ]);

    useEffect(() => {
        if (
            eventId &&
            currentUserId
        ) {
            loadCheckout();
        }
    }, [
        eventId,
        currentUserId,
        loadCheckout
    ]);

    useEffect(() => {
        if (!checkout?.holdExpiresAt) {
            setRemainingSeconds(0);
            return;
        }

        const tick = () => {
            const seconds = Math.max(
                0,
                Math.ceil(
                    (
                        new Date(
                            checkout.holdExpiresAt
                        ).getTime() -
                        Date.now()
                    ) /
                        1000
                )
            );

            setRemainingSeconds(
                seconds
            );

            if (seconds === 0) {
                clearHoldSession();
                setExpired(true);
                setError(
                    "Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế."
                );
            }
        };

        tick();

        const timer =
            window.setInterval(
                tick,
                1000
            );

        return () =>
            window.clearInterval(
                timer
            );
    }, [
        checkout?.holdExpiresAt,
        clearHoldSession
    ]);

    const groupedItems = useMemo(
        () =>
            checkout?.items || [],
        [checkout]
    );

    const handleCancel = async () => {
        if (
            !checkout ||
            remainingSeconds === 0
        ) {
            clearHoldSession();

            if (
                checkout?.eventSnapshot?.slug
            ) {
                navigate(
                    `/events/${checkout.eventSnapshot.slug}/seats`,
                    {
                        replace: true
                    }
                );
            }

            return;
        }

        try {
            setCancelling(true);
            setError("");

            await authenticatedRequest(
                "/seats/release",
                {
                    method: "POST",
                    body: JSON.stringify({
                        eventId,
                        seatIds:
                            checkout.items.map(
                                (item) =>
                                    item.seatId
                            ),
                        holdToken:
                            checkout.holdToken
                    })
                }
            );

            clearHoldSession();

            navigate(
                `/events/${checkout.eventSnapshot.slug}/seats`,
                {
                    replace: true
                }
            );
        } catch (err) {
            if (
                err.status === 409
            ) {
                clearHoldSession();
            }

            setError(
                err.message ||
                    "Không thể nhả ghế"
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
                    Đang xác thực phiên giữ ghế...
                </p>
            </section>
        );
    }

    if (error && !checkout) {
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

    if (!checkout) {
        return null;
    }

    const holdActive =
        !expired &&
        remainingSeconds > 0;

    return (
        <main className="checkout-page">
            <div className="checkout-container">
                <header className="checkout-header">
                    <div>
                        <span>
                            CHECKOUT FYCE
                        </span>
                        <h1>
                            Xác nhận thông tin vé
                        </h1>
                        <p>
                            Đây mới là phiên giữ ghế tạm thời. Chưa có Booking nào được lưu vào MongoDB.
                        </p>
                    </div>

                    <div className="checkout-timer">
                        <small>
                            THỜI GIAN CÒN LẠI
                        </small>
                        <strong>
                            {holdActive
                                ? formatCountdown(
                                      remainingSeconds
                                  )
                                : "00:00"}
                        </strong>
                    </div>
                </header>

                {error && (
                    <div className="checkout-message checkout-message--error">
                        {error}
                    </div>
                )}

                {expired && (
                    <div className="checkout-message checkout-message--warning">
                        Phiên giữ ghế đã hết hạn. Bạn cần chọn lại ghế.
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
                                    {checkout.eventSnapshot.title}
                                </h2>
                                <p>
                                    {formatDateTime(
                                        checkout.eventSnapshot.startAt
                                    )}
                                </p>
                                <p>
                                    {checkout.eventSnapshot.venue}
                                    {checkout.eventSnapshot.address
                                        ? ` • ${checkout.eventSnapshot.address}`
                                        : ""}
                                </p>
                            </div>

                            <span className="checkout-code">
                                Tạm giữ ghế
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
                                        key={String(
                                            item.seatId
                                        )}
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
                                    {checkout.customer.fullName}
                                </strong>
                            </div>

                            <div>
                                <small>Email</small>
                                <strong>
                                    {checkout.customer.email}
                                </strong>
                            </div>

                            <div>
                                <small>
                                    Số điện thoại
                                </small>
                                <strong>
                                    {checkout.customer.phone ||
                                        "Chưa cập nhật"}
                                </strong>
                            </div>
                        </div>

                        <div className="checkout-divider" />

                        <div className="checkout-total-row">
                            <span>Tạm tính</span>
                            <strong>
                                {formatPrice(
                                    checkout.subtotal
                                )}
                            </strong>
                        </div>

                        <div className="checkout-total-row checkout-total-row--grand">
                            <span>
                                Tổng thanh toán
                            </span>
                            <strong>
                                {formatPrice(
                                    checkout.totalAmount
                                )}
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="checkout-pay-button"
                            disabled
                            title="Payment chưa được tích hợp"
                        >
                            Thanh toán — bước tiếp theo
                        </button>

                        {holdActive ? (
                            <>
                                <Link
                                    className="checkout-cancel-button checkout-cancel-button--link"
                                    to={`/events/${checkout.eventSnapshot.slug}`}
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
                                        ? "Đang nhả ghế..."
                                        : "Hủy giữ ghế & chọn lại"}
                                </button>
                            </>
                        ) : (
                            <Link
                                className="checkout-cancel-button checkout-cancel-button--link"
                                to={`/events/${checkout.eventSnapshot.slug}/seats`}
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
