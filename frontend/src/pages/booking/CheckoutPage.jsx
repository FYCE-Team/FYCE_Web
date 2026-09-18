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


const EMPTY_CUSTOMER_FORM = {
    fullName: "",
    email: "",
    phone: ""
};

const normalizePhone = (value) =>
    String(value || "")
        .trim()
        .replace(/[\s.-]/g, "");

const validateCustomer = (customer) => {
    const errors = {};

    const fullName = String(
        customer?.fullName || ""
    ).trim();

    const email = String(
        customer?.email || ""
    ).trim();

    const phone = normalizePhone(
        customer?.phone
    );

    if (
        fullName.length < 2 ||
        fullName.length > 150
    ) {
        errors.fullName =
            "Họ và tên phải có từ 2 đến 150 ký tự.";
    }

    if (!email) {
        errors.email =
            "Tài khoản chưa có email hợp lệ.";
    }

    if (
        !/^(0|\+84)[0-9]{9}$/.test(
            phone
        )
    ) {
        errors.phone =
            "Nhập số điện thoại dạng 0xxxxxxxxx hoặc +84xxxxxxxxx.";
    }

    return errors;
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
        refreshSession,
        updateProfile
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

    const [customerForm, setCustomerForm] =
        useState(
            EMPTY_CUSTOMER_FORM
        );
    const [customerErrors, setCustomerErrors] =
        useState({});
    const [savingCustomer, setSavingCustomer] =
        useState(false);
    const [customerMessage, setCustomerMessage] =
        useState("");

    const [bookingInProgress, setBookingInProgress] = useState(false);
    const [createdBookingCode, setCreatedBookingCode] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState("unpaid");

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

                const nextCheckout =
                    data.checkout;

                setCheckout(
                    nextCheckout
                );

                setCustomerForm({
                    fullName:
                        nextCheckout?.customer
                            ?.fullName ||
                        "",
                    email:
                        nextCheckout?.customer
                            ?.email ||
                        "",
                    phone:
                        nextCheckout?.customer
                            ?.phone ||
                        ""
                });
                setCustomerErrors({});
                setCustomerMessage("");
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


    const customerValidation =
        useMemo(
            () =>
                validateCustomer(
                    customerForm
                ),
            [customerForm]
        );

    const customerReady =
        Object.keys(
            customerValidation
        ).length === 0;

    const customerDirty =
        useMemo(() => {
            const saved =
                checkout?.customer ||
                EMPTY_CUSTOMER_FORM;

            return (
                String(
                    customerForm.fullName ||
                        ""
                ).trim() !==
                    String(
                        saved.fullName ||
                            ""
                    ).trim() ||
                normalizePhone(
                    customerForm.phone
                ) !==
                    normalizePhone(
                        saved.phone
                    )
            );
        }, [
            checkout?.customer,
            customerForm.fullName,
            customerForm.phone
        ]);

    const handleCustomerChange =
        (event) => {
            const {
                name,
                value
            } = event.target;

            setCustomerForm(
                (current) => ({
                    ...current,
                    [name]: value
                })
            );

            setCustomerErrors(
                (current) => ({
                    ...current,
                    [name]: ""
                })
            );
            setCustomerMessage("");
        };

    const handleSaveCustomer =
        async (event) => {
            event.preventDefault();

            const errors =
                validateCustomer(
                    customerForm
                );

            setCustomerErrors(
                errors
            );
            setCustomerMessage("");

            if (
                Object.keys(errors)
                    .length > 0
            ) {
                return;
            }

            try {
                setSavingCustomer(true);

                const normalizedPhone =
                    normalizePhone(
                        customerForm.phone
                    );

                const result =
                    await updateProfile({
                        fullName:
                            customerForm.fullName.trim(),
                        phone:
                            normalizedPhone
                    });

                const updatedUser =
                    result?.data?.user ||
                    null;

                if (!updatedUser) {
                    throw new Error(
                        "Không nhận được thông tin người dùng sau khi cập nhật."
                    );
                }

                const nextCustomer = {
                    fullName:
                        updatedUser.fullName ||
                        "",
                    email:
                        updatedUser.email ||
                        customerForm.email,
                    phone:
                        updatedUser.phone ||
                        ""
                };

                setCustomerForm(
                    nextCustomer
                );

                setCheckout(
                    (current) =>
                        current
                            ? {
                                  ...current,
                                  customer:
                                      nextCustomer
                              }
                            : current
                );

                setCustomerErrors({});
                setCustomerMessage(
                    "Thông tin người đặt vé đã được lưu vào tài khoản."
                );
            } catch (err) {
                setCustomerMessage("");
                setCustomerErrors({
                    form:
                        err.message ||
                        "Không thể cập nhật thông tin. Vui lòng thử lại."
                });
            } finally {
                setSavingCustomer(false);
            }
        };

    const handleCreateBooking = async () => {
        if (!checkout || !customerReady || customerDirty) return;

        try {
            setBookingInProgress(true);
            setError("");

            const data = await authenticatedRequest("/bookings", {
                method: "POST",
                body: JSON.stringify({
                    eventId,
                    seatIds: checkout.items.map((item) => item.seatId),
                    holdToken: checkout.holdToken
                })
            });

            if (data?.sepayCheckout) {
                // Dynamically create form and redirect to SePay Checkout
                const form = document.createElement("form");
                form.method = "POST";
                form.action = data.sepayCheckout.checkoutURL;
                
                Object.keys(data.sepayCheckout.formFields).forEach(key => {
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = key;
                    input.value = data.sepayCheckout.formFields[key];
                    form.appendChild(input);
                });
                
                document.body.appendChild(form);
                form.submit();
            } else if (data?.booking?.bookingCode) {
                setCreatedBookingCode(data.booking.bookingCode);
                setPaymentStatus(data.booking.paymentStatus);
            }
        } catch (err) {
            setError(err.message || "Không thể tạo đơn đặt vé. Vui lòng thử lại.");
        } finally {
            setBookingInProgress(false);
        }
    };

    useEffect(() => {
        if (!createdBookingCode || paymentStatus === "paid") return;

        const pollInterval = setInterval(async () => {
            try {
                const data = await authenticatedRequest(`/bookings/${createdBookingCode}`, {
                    method: "GET"
                });

                if (data?.booking?.paymentStatus === "paid") {
                    setPaymentStatus("paid");
                    clearInterval(pollInterval);
                    // Redirect to success page after a short delay
                    setTimeout(() => {
                        navigate(`/bookings/${createdBookingCode}`, { replace: true });
                    }, 2000);
                } else if (data?.booking?.status === "expired" || data?.booking?.status === "cancelled") {
                    clearInterval(pollInterval);
                    setError("Đơn đặt vé đã bị hủy hoặc hết hạn.");
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [createdBookingCode, paymentStatus, authenticatedRequest, navigate]);

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

                        <form
                            className="checkout-customer-form"
                            onSubmit={
                                handleSaveCustomer
                            }
                            noValidate
                        >
                            <label className="checkout-field">
                                <span>
                                    Họ và tên
                                </span>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={
                                        customerForm.fullName
                                    }
                                    onChange={
                                        handleCustomerChange
                                    }
                                    autoComplete="name"
                                    maxLength={150}
                                    disabled={
                                        savingCustomer
                                    }
                                />
                                {customerErrors.fullName && (
                                    <small className="checkout-field-error">
                                        {
                                            customerErrors.fullName
                                        }
                                    </small>
                                )}
                            </label>

                            <label className="checkout-field">
                                <span>Email</span>
                                <input
                                    type="email"
                                    name="email"
                                    value={
                                        customerForm.email
                                    }
                                    readOnly
                                    aria-readonly="true"
                                    className="checkout-input--readonly"
                                    autoComplete="email"
                                />
                                <small className="checkout-field-note">
                                    Email gắn với tài khoản và không chỉnh tại checkout.
                                </small>
                                {customerErrors.email && (
                                    <small className="checkout-field-error">
                                        {
                                            customerErrors.email
                                        }
                                    </small>
                                )}
                            </label>

                            <label className="checkout-field">
                                <span>
                                    Số điện thoại
                                </span>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={
                                        customerForm.phone
                                    }
                                    onChange={
                                        handleCustomerChange
                                    }
                                    placeholder="0901234567"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    disabled={
                                        savingCustomer
                                    }
                                />
                                {customerErrors.phone && (
                                    <small className="checkout-field-error">
                                        {
                                            customerErrors.phone
                                        }
                                    </small>
                                )}
                            </label>

                            {customerErrors.form && (
                                <div className="checkout-profile-error">
                                    {
                                        customerErrors.form
                                    }
                                </div>
                            )}

                            {customerMessage && (
                                <div className="checkout-profile-success">
                                    {customerMessage}
                                </div>
                            )}

                            {!customerReady &&
                                !customerErrors.form && (
                                <div className="checkout-profile-hint">
                                    Hãy cập nhật họ tên và số điện thoại hợp lệ trước khi thanh toán.
                                </div>
                            )}

                            {customerReady &&
                                customerDirty &&
                                !customerErrors.form && (
                                <div className="checkout-profile-hint">
                                    Bạn đã thay đổi thông tin. Hãy lưu trước khi sang bước thanh toán.
                                </div>
                            )}

                            <button
                                type="submit"
                                className="checkout-profile-save-button"
                                disabled={
                                    savingCustomer ||
                                    !customerReady ||
                                    !customerDirty
                                }
                            >
                                {savingCustomer
                                    ? "Đang lưu..."
                                    : customerDirty
                                    ? "Lưu thông tin người đặt vé"
                                    : "Thông tin đã được lưu"}
                            </button>
                        </form>

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

                        {createdBookingCode ? (
                            <div className="checkout-payment-section">
                                {paymentStatus === "paid" ? (
                                    <div className="checkout-message checkout-message--success" style={{textAlign: "center", marginTop: 20}}>
                                        <h3>Thanh toán thành công!</h3>
                                        <p>Đang chuyển hướng đến vé của bạn...</p>
                                    </div>
                                ) : (
                                    <div className="checkout-qr-container" style={{textAlign: "center", marginTop: 20}}>
                                        <h3>Quét mã QR để thanh toán</h3>
                                        <p style={{fontSize: "0.9rem", color: "#666", marginBottom: 15}}>
                                            Sử dụng ứng dụng ngân hàng của bạn để quét mã.
                                        </p>
                                        <img 
                                            src={`https://qr.sepay.vn/img?acc=${import.meta.env.VITE_SEPAY_BANK_ACC}&bank=${import.meta.env.VITE_SEPAY_BANK_NAME}&amount=${checkout.totalAmount}&des=${createdBookingCode}`}
                                            alt="SePay QR Code"
                                            style={{width: "100%", maxWidth: "250px", borderRadius: "8px"}}
                                        />
                                        <p style={{marginTop: 15, fontWeight: "bold", color: "#e84c3d"}}>
                                            Mã đơn: {createdBookingCode}
                                        </p>
                                        <p style={{fontSize: "0.85rem", color: "#999", marginTop: 10}}>
                                            Hệ thống sẽ tự động xác nhận sau khi bạn chuyển khoản thành công.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="checkout-pay-button"
                                onClick={handleCreateBooking}
                                disabled={
                                    !customerReady || customerDirty || bookingInProgress
                                }
                                title={
                                    !customerReady
                                        ? "Vui lòng cập nhật đầy đủ thông tin người đặt vé"
                                        : customerDirty
                                        ? "Vui lòng lưu thông tin người đặt vé trước"
                                        : "Tạo đơn và thanh toán"
                                }
                            >
                                {bookingInProgress ? "Đang xử lý..." : "Thanh toán — bước tiếp theo"}
                            </button>
                        )}

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
