import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
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

import SeatMap from "../../components/booking/SeatMap";
import "./EventSeatBookingPage.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const formatDate = (date) => {
    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(new Date(date));
};

const formatTime = (date) => {
    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(new Date(date));
};

const formatPrice = (value) =>
    `${new Intl.NumberFormat(
        "vi-VN"
    ).format(Number(value) || 0)}đ`;

const fallbackColors = [
    "#0f6fb2",
    "#1f7b58",
    "#efa93a",
    "#98a5b6"
];


const VIP_ROWS = new Set([
    "B",
    "C",
    "D",
    "E",
    "F",
    "G"
]);

const normalizeCategoryCode = (
    value
) =>
    String(value || "")
        .trim()
        .toUpperCase();

const normalizeReferenceId = (
    value
) => {
    if (!value) {
        return "";
    }

    if (
        typeof value === "object"
    ) {
        return String(
            value._id ||
                value.id ||
                value.$oid ||
                ""
        );
    }

    return String(value);
};

const inferFyceCategoryCode = (
    seat
) => {
    const section =
        String(
            seat?.section || ""
        )
            .trim()
            .toLowerCase();

    const row =
        String(
            seat?.row || ""
        )
            .trim()
            .toUpperCase();

    return (
        section === "center" &&
        VIP_ROWS.has(row)
    )
        ? "VIP"
        : "STANDARD";
};

const resolveTicketCategory = (
    seat,
    categories
) => {
    if (!Array.isArray(categories)) {
        return null;
    }

    const seatCategoryId =
        normalizeReferenceId(
            seat?.ticketCategoryId
        );

    if (seatCategoryId) {
        const direct =
            categories.find(
                (category) =>
                    normalizeReferenceId(
                        category?._id ||
                            category?.id
                    ) ===
                    seatCategoryId
            );

        if (direct) {
            return direct;
        }
    }

    const explicitCode =
        normalizeCategoryCode(
            seat?.ticketCategoryCode
        );

    if (explicitCode) {
        const byCode =
            categories.find(
                (category) =>
                    normalizeCategoryCode(
                        category?.code
                    ) ===
                    explicitCode
            );

        if (byCode) {
            return byCode;
        }
    }

    const inferredCode =
        inferFyceCategoryCode(seat);

    return (
        categories.find(
            (category) =>
                normalizeCategoryCode(
                    category?.code
                ) === inferredCode
        ) || null
    );
};

const HOLD_STORAGE_PREFIX =
    "fyce-seat-hold:";

const getHoldStorageKey = (
    eventId,
    userId
) =>
    `${HOLD_STORAGE_PREFIX}${userId}:${eventId}`;

const formatCountdown = (
    totalSeconds
) => {
    const safeSeconds =
        Math.max(
            0,
            Number(totalSeconds) || 0
        );

    const minutes =
        Math.floor(
            safeSeconds / 60
        );

    const seconds =
        safeSeconds % 60;

    return `${String(minutes).padStart(
        2,
        "0"
    )}:${String(seconds).padStart(
        2,
        "0"
    )}`;
};

const requestSeatAction = async (
    path,
    payload,
    accessToken
) => {
    const response =
        await fetch(
            `${API_BASE_URL}${path}`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                    Authorization:
                        `Bearer ${accessToken}`
                },
                credentials:
                    "include",
                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    let result =
        null;

    try {
        result =
            await response.json();
    } catch {
        result =
            null;
    }

    if (
        !response.ok ||
        !result?.success
    ) {
        const error =
            new Error(
                result?.message ||
                    "Không thể cập nhật trạng thái ghế"
            );

        error.status =
            response.status;

        error.data =
            result?.data ||
            null;

        error.code =
            result?.code ||
            null;

        throw error;
    }

    return result.data;
};

const requestAuthenticatedGet = async (
    path,
    accessToken
) => {
    const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
            method: "GET",
            headers: {
                Authorization:
                    `Bearer ${accessToken}`
            },
            credentials: "include"
        }
    );

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result?.success
    ) {
        const error = new Error(
            result?.message ||
                "Không thể kiểm tra booking đang hoạt động"
        );

        error.status = response.status;
        error.code = result?.code || null;
        error.data = result?.data || null;

        throw error;
    }

    return result.data;
};

const EventSeatBookingPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const {
        accessToken,
        user,
        refreshSession
    } = useAuth();

    const currentUserId =
        String(
            user?._id ||
            user?.id ||
            user?.userId ||
            ""
        );

    const authorizedSeatAction =
        useCallback(
            async (
                path,
                payload
            ) => {
                let token =
                    accessToken;

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
                            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                        );

                    authError.status =
                        401;

                    throw authError;
                }

                try {
                    return await requestSeatAction(
                        path,
                        payload,
                        token
                    );
                } catch (error) {
                    if (
                        error.status !==
                        401
                    ) {
                        throw error;
                    }

                    const refreshed =
                        await refreshSession();

                    const nextToken =
                        refreshed?.accessToken ||
                        null;

                    if (!nextToken) {
                        throw error;
                    }

                    return requestSeatAction(
                        path,
                        payload,
                        nextToken
                    );
                }
            },
            [
                accessToken,
                refreshSession
            ]
        );

    const authorizedGet =
        useCallback(
            async (path) => {
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
                            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                        );

                    authError.status = 401;
                    throw authError;
                }

                try {
                    return await requestAuthenticatedGet(
                        path,
                        token
                    );
                } catch (error) {
                    if (error.status !== 401) {
                        throw error;
                    }

                    const refreshed =
                        await refreshSession();

                    const nextToken =
                        refreshed?.accessToken ||
                        null;

                    if (!nextToken) {
                        throw error;
                    }

                    return requestAuthenticatedGet(
                        path,
                        nextToken
                    );
                }
            },
            [
                accessToken,
                refreshSession
            ]
        );

    const [event, setEvent] =
        useState(null);
    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState("");
    const [
        selectedSeats,
        setSelectedSeats
    ] = useState([]);

const [
        holdToken,
        setHoldToken
    ] = useState(null);

    const [
        holdExpiresAt,
        setHoldExpiresAt
    ] = useState(null);

    const [
        remainingSeconds,
        setRemainingSeconds
    ] = useState(0);

    const [
        busySeatIds,
        setBusySeatIds
    ] = useState([]);

    const [
        seatMapRefreshKey,
        setSeatMapRefreshKey
    ] = useState(0);

    const [
        holdMessage,
        setHoldMessage
    ] = useState("");

    const [
        creatingBooking,
        setCreatingBooking
    ] = useState(false);

    const [
        checkingActiveBooking,
        setCheckingActiveBooking
    ] = useState(true);

    const holdRequestLock =
        useRef(false);

    useEffect(() => {
        let mounted = true;

        const loadEvent = async () => {
            try {
                setLoading(true);
                setError("");

                const response =
                    await fetch(
                        `${API_BASE_URL}/events/${slug}`
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result?.success
                ) {
                    throw new Error(
                        result?.message ||
                            "Không thể tải thông tin sự kiện"
                    );
                }

                if (mounted) {
                    setEvent(
                        result?.data?.event ||
                            null
                    );
                }
            } catch (err) {
                if (mounted) {
                    setError(
                        err.message ||
                            "Không thể tải thông tin sự kiện"
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadEvent();

        return () => {
            mounted = false;
        };
    }, [slug]);

    useEffect(() => {
        if (
            !event?._id ||
            !currentUserId
        ) {
            return;
        }

        let mounted = true;

        const checkActiveBooking =
            async () => {
                try {
                    setCheckingActiveBooking(
                        true
                    );

                    const data =
                        await authorizedGet(
                            `/bookings/active?eventId=${encodeURIComponent(
                                event._id
                            )}`
                        );

                    if (!mounted) {
                        return;
                    }

                    const activeBooking =
                        data?.booking;

                    if (
                        activeBooking
                            ?.bookingCode
                    ) {
                        sessionStorage.removeItem(
                            getHoldStorageKey(
                                event._id,
                                currentUserId
                            )
                        );

                        navigate(
                            `/checkout/${activeBooking.bookingCode}`,
                            {
                                replace: true
                            }
                        );

                        return;
                    }
                } catch (err) {
                    if (mounted) {
                        setHoldMessage(
                            err.message ||
                                "Không thể kiểm tra booking hiện tại."
                        );
                    }
                } finally {
                    if (mounted) {
                        setCheckingActiveBooking(
                            false
                        );
                    }
                }
            };

        checkActiveBooking();

        return () => {
            mounted = false;
        };
    }, [
        event?._id,
        currentUserId,
        authorizedGet,
        navigate
    ]);

useEffect(() => {
        if (
            !event?._id ||
            !currentUserId ||
            checkingActiveBooking
        ) {
            return;
        }

        const storageKey =
            getHoldStorageKey(
                event._id,
                currentUserId
            );

        try {
            const raw =
                sessionStorage.getItem(
                    storageKey
                );

            if (!raw) {
                return;
            }

            const saved =
                JSON.parse(raw);

            const expiresAt =
                new Date(
                    saved.holdExpiresAt
                );

            if (
                !saved.holdToken ||
                !Number.isFinite(
                    expiresAt.getTime()
                ) ||
                expiresAt <=
                    new Date()
            ) {
                sessionStorage.removeItem(
                    storageKey
                );

                return;
            }

            setHoldToken(
                saved.holdToken
            );

            setHoldExpiresAt(
                saved.holdExpiresAt
            );

            setSelectedSeats(
                Array.isArray(
                    saved.selectedSeats
                )
                    ? saved.selectedSeats
                    : []
            );
        } catch {
            sessionStorage.removeItem(
                storageKey
            );
        }
    }, [
        event?._id,
        currentUserId,
        checkingActiveBooking
    ]);

    useEffect(() => {
        if (!holdExpiresAt) {
            setRemainingSeconds(0);
            return;
        }

        const tick = () => {
            const expires =
                new Date(
                    holdExpiresAt
                ).getTime();

            const seconds =
                Math.max(
                    0,
                    Math.ceil(
                        (
                            expires -
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
                holdToken
            ) {
                if (event?._id) {
                    sessionStorage.removeItem(
                        getHoldStorageKey(
                            event._id,
                            currentUserId
                        )
                    );
                }

                setSelectedSeats(
                    []
                );

                setHoldToken(
                    null
                );

                setHoldExpiresAt(
                    null
                );

                setHoldMessage(
                    "Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế."
                );

                setSeatMapRefreshKey(
                    (value) =>
                        value + 1
                );
            }
        };

        tick();

        const timer =
            window.setInterval(
                tick,
                1000
            );

        return () => {
            window.clearInterval(
                timer
            );
        };
    }, [
        holdExpiresAt,
        holdToken,
        event?._id,
        currentUserId
    ]);

    const saveHoldSession = (
        nextToken,
        nextExpiresAt,
        nextSeats
    ) => {
        if (
            !event?._id ||
            !currentUserId ||
            !nextToken ||
            !nextExpiresAt
        ) {
            return;
        }

        sessionStorage.setItem(
            getHoldStorageKey(
                event._id,
                currentUserId
            ),
            JSON.stringify({
                holdToken:
                    nextToken,
                holdExpiresAt:
                    nextExpiresAt,
                selectedSeats:
                    nextSeats
            })
        );
    };

    const clearHoldSession = () => {
        if (
            event?._id &&
            currentUserId
        ) {
            sessionStorage.removeItem(
                getHoldStorageKey(
                    event._id,
                    currentUserId
                )
            );
        }
    };

    const handleSeatToggle =
        async (
            seat,
            isSelected
        ) => {
            if (
                !event?._id ||
                holdRequestLock.current
            ) {
                return;
            }

            const seatId =
                String(seat._id);

            holdRequestLock.current =
                true;

            setBusySeatIds([
                seatId
            ]);

            setHoldMessage("");

            try {
                if (isSelected) {
                    if (!holdToken) {
                        throw new Error(
                            "Không tìm thấy phiên giữ ghế."
                        );
                    }

                    await authorizedSeatAction(
                        "/seats/release",
                        {
                            eventId:
                                event._id,

                            seatIds: [
                                seatId
                            ],

                            holdToken
                        }
                    );

                    const nextSeats =
                        selectedSeats.filter(
                            (
                                selectedSeat
                            ) =>
                                String(
                                    selectedSeat._id
                                ) !==
                                seatId
                        );

                    setSelectedSeats(
                        nextSeats
                    );

                    if (
                        nextSeats.length ===
                        0
                    ) {
                        setHoldToken(
                            null
                        );

                        setHoldExpiresAt(
                            null
                        );

                        clearHoldSession();
                    } else {
                        saveHoldSession(
                            holdToken,
                            holdExpiresAt,
                            nextSeats
                        );
                    }
                } else {
                    const result =
                        await authorizedSeatAction(
                            "/seats/hold",
                            {
                                eventId:
                                    event._id,

                                seatIds: [
                                    seatId
                                ],

                                holdToken
                            }
                        );

                    const nextSeats =
                        [
                            ...selectedSeats.filter(
                                (
                                    selectedSeat
                                ) =>
                                    String(
                                        selectedSeat._id
                                    ) !==
                                    seatId
                            ),
                            seat
                        ];

                    setHoldToken(
                        result.holdToken
                    );

                    setHoldExpiresAt(
                        result.holdExpiresAt
                    );

                    setSelectedSeats(
                        nextSeats
                    );

                    saveHoldSession(
                        result.holdToken,
                        result.holdExpiresAt,
                        nextSeats
                    );
                }

                setSeatMapRefreshKey(
                    (value) =>
                        value + 1
                );
            } catch (err) {
                setHoldMessage(
                    err.message ||
                        "Không thể giữ ghế. Vui lòng thử lại."
                );

                setSeatMapRefreshKey(
                    (value) =>
                        value + 1
                );
            } finally {
                setBusySeatIds(
                    []
                );

                holdRequestLock.current =
                    false;
            }
        };

    const handleContinue = async () => {
        if (
            !event?._id ||
            selectedSeats.length === 0 ||
            !holdToken ||
            remainingSeconds === 0 ||
            creatingBooking
        ) {
            return;
        }

        try {
            setCreatingBooking(true);
            setHoldMessage("");

            const data =
                await authorizedSeatAction(
                    "/bookings",
                    {
                        eventId:
                            event._id,
                        seatIds:
                            selectedSeats.map(
                                (seat) =>
                                    seat._id
                            ),
                        holdToken
                    }
                );

            const bookingCode =
                data?.booking
                    ?.bookingCode;

            if (!bookingCode) {
                throw new Error(
                    "Không nhận được mã booking từ máy chủ."
                );
            }

            clearHoldSession();

            navigate(
                `/checkout/${bookingCode}`,
                {
                    replace: true
                }
            );
        } catch (err) {
            if (
                err.code ===
                    "ACTIVE_BOOKING_EXISTS" &&
                err.data?.bookingCode
            ) {
                clearHoldSession();

                navigate(
                    `/checkout/${err.data.bookingCode}`,
                    {
                        replace: true
                    }
                );

                return;
            }

            setHoldMessage(
                err.message ||
                    "Không thể tạo đơn đặt vé. Vui lòng thử lại."
            );

            setSeatMapRefreshKey(
                (value) =>
                    value + 1
            );
        } finally {
            setCreatingBooking(false);
        }
    };

    const ticketCategories =
        useMemo(() => {
            if (
                !Array.isArray(
                    event?.ticketCategories
                )
            ) {
                return [];
            }

            return [
                ...event.ticketCategories
            ]
                .filter(
                    (category) =>
                        category.isActive !==
                        false
                )
                .sort(
                    (a, b) =>
                        (a.sortOrder || 0) -
                        (b.sortOrder || 0)
                );
        }, [event]);

    const selectedSeatDetails =
        useMemo(
            () =>
                selectedSeats.map(
                    (seat) => {
                        const category =
                            resolveTicketCategory(
                                seat,
                                ticketCategories
                            );

                        return {
                            ...seat,
                            resolvedCategory:
                                category,
                            resolvedPrice:
                                Number(
                                    category?.price
                                ) || 0
                        };
                    }
                ),
            [
                selectedSeats,
                ticketCategories
            ]
        );

    const totalPrice = useMemo(
        () =>
            selectedSeatDetails.reduce(
                (total, seat) =>
                    total +
                    seat.resolvedPrice,
                0
            ),
        [selectedSeatDetails]
    );

    if (loading) {
        return (
            <section className="seat-booking-state">
                <div className="seat-booking-spinner" />
                <p>
                    Đang tải trang chọn ghế...
                </p>
            </section>
        );
    }

    if (
        !loading &&
        event &&
        checkingActiveBooking
    ) {
        return (
            <section className="seat-booking-state">
                <div className="seat-booking-spinner" />
                <p>
                    Đang kiểm tra booking hiện tại...
                </p>
            </section>
        );
    }

    if (error || !event) {
        return (
            <section className="seat-booking-state">
                <h1>
                    Không thể mở trang chọn ghế
                </h1>
                <p>
                    {error ||
                        "Không tìm thấy sự kiện."}
                </p>
                <Link
                    className="seat-booking-state__back"
                    to={`/events/${slug}`}
                >
                    ← Quay lại sự kiện
                </Link>
            </section>
        );
    }

    return (
        <main className="seat-booking-page">
            <div className="seat-booking-page__container">
                <section className="seat-booking-hero">
                    <div className="seat-booking-hero__content">
                        <div className="seat-booking-hero__badges">
                            {event.badge && (
                                <span className="seat-booking-badge seat-booking-badge--green">
                                    ✦ {event.badge}
                                </span>
                            )}

                            <span className="seat-booking-badge seat-booking-badge--warm">
                                ♬ Chọn ghế trực tuyến
                            </span>
                        </div>

                        <h1>
                            {event.title}
                        </h1>

                        {event.subtitle && (
                            <p className="seat-booking-hero__subtitle">
                                {event.subtitle}
                            </p>
                        )}

                        <div className="seat-booking-hero__meta">
                            <span>
                                ◫{" "}
                                {event.startAt
                                    ? `${formatTime(
                                          event.startAt
                                      )} • ${formatDate(
                                          event.startAt
                                      )}`
                                    : "Đang cập nhật thời gian"}
                            </span>

                            <span>
                                ⌖{" "}
                                {event.venue ||
                                    "Đang cập nhật địa điểm"}
                                {event.address
                                    ? `, ${event.address}`
                                    : ""}
                            </span>
                        </div>
                    </div>

                    <div className="seat-booking-hero__actions">
                        <div
                            className={`seat-hold-clock ${
                                holdToken
                                    ? "seat-hold-clock--active"
                                    : ""
                            }`}
                        >
                            <small>
                                THỜI GIAN GIỮ GHẾ
                            </small>

                            <strong>
                                {holdToken
                                    ? formatCountdown(
                                          remainingSeconds
                                      )
                                    : "--:--"}
                            </strong>
                        </div>

                        <Link
                            to={`/events/${slug}`}
                            className="seat-booking-link-button"
                        >
                            ← Chi tiết sự kiện
                        </Link>

                        <a
                            href="#seat-map"
                            className="seat-booking-link-button seat-booking-link-button--primary"
                        >
                            Chọn ghế ↓
                        </a>
                    </div>
                </section>

                <section className="seat-status-bar">
                    <strong>
                        TRẠNG THÁI GHẾ
                    </strong>

                    <span>
                        <i className="seat-status-dot seat-status-dot--empty" />
                        Còn trống
                    </span>

                    <span>
                        <i className="seat-status-dot seat-status-dot--selected" />
                        Đang chọn
                    </span>

                    <span>
                        <i className="seat-status-dot seat-status-dot--sold" />
                        Đã đặt
                    </span>

                    <span>
                        <i className="seat-status-dot seat-status-dot--held" />
                        Đang giữ
                    </span>

                    <small>
                        Chạm hoặc click vào icon ghế để chọn vị trí
                    </small>
                </section>

                {holdMessage && (
                    <div className="seat-hold-message">
                        {holdMessage}
                    </div>
                )}

                {ticketCategories.length >
                    0 && (
                    <section className="seat-ticket-grid">
                        {ticketCategories.map(
                            (
                                category,
                                index
                            ) => (
                                <article
                                    className="seat-ticket-card"
                                    key={
                                        category._id ||
                                        category.code ||
                                        index
                                    }
                                >
                                    <i
                                        className="seat-ticket-card__line"
                                        style={{
                                            backgroundColor:
                                                category.colorCode ||
                                                fallbackColors[
                                                    index %
                                                        fallbackColors.length
                                                ]
                                        }}
                                    />

                                    <div>
                                        <small>
                                            {category.name}
                                        </small>

                                        <strong>
                                            {formatPrice(
                                                category.price
                                            )}
                                        </strong>

                                        {category.seatType && (
                                            <span>
                                                {
                                                    category.seatType
                                                }
                                            </span>
                                        )}
                                    </div>
                                </article>
                            )
                        )}
                    </section>
                )}

                <section
                    className="seat-map-card"
                    id="seat-map"
                >
                    <div className="seat-map-card__heading">
                        <div>
                            <span>
                                SƠ ĐỒ KHÁN PHÒNG
                            </span>
                            <h2>
                                Chọn vị trí của bạn
                            </h2>
                        </div>

                        <div className="seat-map-card__hint">
                            ♬ {selectedSeats.length}{" "}
                            ghế đã chọn
                        </div>
                    </div>

                    <SeatMap
                        eventId={event._id}
                        ticketCategories={
                            ticketCategories
                        }
                        selectedSeatIds={
                            selectedSeats.map(
                                (seat) =>
                                    seat._id
                            )
                        }
                        busySeatIds={
                            busySeatIds
                        }
                        refreshKey={
                            seatMapRefreshKey
                        }
                        onSeatToggle={
                            handleSeatToggle
                        }
                        showLegend={false}
                        showFooter={false}
                    />
                </section>

                <section className="seat-booking-summary">
                    <div className="seat-booking-summary__left">
                        <div className="seat-booking-summary__heading">
                            <h2>
                                Thông tin vé chọn
                            </h2>

                            <span>
                                {selectedSeats.length}{" "}
                                ghế
                            </span>
                        </div>

                        {selectedSeatDetails.length >
                        0 ? (
                            <div className="selected-seat-price-list">
                                {selectedSeatDetails.map(
                                    (seat) => (
                                        <div
                                            className="selected-seat-price-row"
                                            key={String(
                                                seat._id
                                            )}
                                        >
                                            <span>
                                                <strong>
                                                    {seat.label}
                                                </strong>
                                                {" — "}
                                                {seat
                                                    .resolvedCategory
                                                    ?.name ||
                                                    inferFyceCategoryCode(
                                                        seat
                                                    )}
                                            </span>

                                            <strong>
                                                {formatPrice(
                                                    seat.resolvedPrice
                                                )}
                                            </strong>
                                        </div>
                                    )
                                )}

                                {selectedSeatDetails.some(
                                    (seat) =>
                                        !seat.resolvedCategory
                                ) && (
                                    <small className="selected-seat-price-warning">
                                        Có ghế chưa đồng bộ hạng vé. Hãy tải lại trang hoặc kiểm tra cấu hình ticket category.
                                    </small>
                                )}
                            </div>
                        ) : (
                            <p>
                                Vui lòng chọn ghế trên sơ đồ khán phòng.
                            </p>
                        )}
                    </div>

                    <div className="seat-booking-summary__prices">
                        <div>
                            <small>
                                Tạm tính
                            </small>
                            <strong>
                                {formatPrice(
                                    totalPrice
                                )}
                            </strong>
                        </div>

                        <div>
                            <small>
                                Tổng thanh toán
                            </small>
                            <strong>
                                {formatPrice(
                                    totalPrice
                                )}
                            </strong>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="seat-booking-checkout"
                        onClick={handleContinue}
                        disabled={
                            selectedSeats.length ===
                                0 ||
                            !holdToken ||
                            remainingSeconds ===
                                0 ||
                            creatingBooking
                        }
                    >
                        {creatingBooking
                            ? "Đang tạo đơn..."
                            : "Tiếp tục"}
                    </button>
                </section>
            </div>
        </main>
    );
};

export default EventSeatBookingPage;