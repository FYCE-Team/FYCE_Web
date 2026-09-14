import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useAuth
} from "../../../context/AuthContext.jsx";

import {
    blockAdminSeat,
    getAdminEventSeats,
    getAdminSeatHistory,
    unblockAdminSeat
} from "../../services/adminSeat.service.js";

import "./AdminSeatManager.css";

const STATUS_META = {
    available: {
        label: "Còn trống",
        className: "available"
    },
    held: {
        label: "Đang giữ",
        className: "held"
    },
    sold: {
        label: "Đã bán",
        className: "sold"
    },
    blocked: {
        label: "Tạm khóa",
        className: "blocked"
    }
};

const FILTERS = [
    ["all", "Tất cả"],
    ["available", "Còn trống"],
    ["blocked", "Tạm khóa"],
    ["held", "Đang giữ"],
    ["sold", "Đã bán"]
];

const HISTORY_ACTION_LABELS = {
    blocked: "Khóa ghế",
    unblocked: "Mở bán lại",
    booking_created: "Tạo booking",
    sold: "Xác nhận đã bán",
    refund_confirmed: "Xác nhận hoàn tiền",
    released_after_refund: "Mở ghế sau hoàn tiền"
};

const getHistoryActorLabel = (entry) => {
    const actor =
        entry?.actorUserId;

    if (actor?.fullName) {
        return actor.fullName;
    }

    if (actor?.username) {
        return actor.username;
    }

    if (actor?.email) {
        return actor.email;
    }

    if (entry?.actorType === "system") {
        return "Hệ thống";
    }

    if (entry?.actorType === "payment") {
        return "Payment webhook";
    }

    return "—";
};

const getStatusMeta = (
    status
) =>
    STATUS_META[status] || {
        label: status || "Không rõ",
        className: "unknown"
    };

const formatDateTime = (
    value
) => {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            dateStyle: "short",
            timeStyle: "medium"
        }
    ).format(date);
};

const AdminSeatIcon = ({
    seat,
    category,
    selected,
    onClick
}) => {
    const x = Number(
        seat?.position?.x
    );
    const y = Number(
        seat?.position?.y
    );

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
    ) {
        return null;
    }

    const width =
        Number(seat.width) || 25;
    const height =
        Number(seat.height) || 30;
    const rotation =
        Number(seat.rotation) || 0;

    const categoryCode = String(
        category?.code || ""
    )
        .trim()
        .toUpperCase();

    const availableColor =
        category?.colorCode ||
        (categoryCode === "VIP"
            ? "#f06a73"
            : "#7db7f5");

    const fill =
        seat.status === "blocked"
            ? "#90979e"
            : seat.status === "held"
            ? "#a8b6c8"
            : seat.status === "sold"
            ? "#d9e0e7"
            : availableColor;

    const status =
        getStatusMeta(
            seat.status
        );

    return (
        <g
            className={`admin-seat-svg-seat admin-seat-svg-seat--${status.className} ${
                selected
                    ? "admin-seat-svg-seat--selected"
                    : ""
            }`}
            transform={`translate(${x} ${y}) rotate(${rotation})`}
            role="button"
            tabIndex="0"
            aria-label={`Ghế ${seat.label}, ${status.label}`}
            style={{
                "--admin-seat-fill": fill
            }}
            onClick={() =>
                onClick(seat)
            }
            onKeyDown={(event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    onClick(seat);
                }
            }}
        >
            <title>
                {`${seat.label} · ${category?.name || categoryCode || "Hạng vé"} · ${status.label}`}
            </title>

            <rect
                className="admin-seat-svg-seat__back"
                x={-width * 0.31}
                y={-height * 0.44}
                width={width * 0.62}
                height={height * 0.43}
                rx="3.5"
                ry="3.5"
            />

            <rect
                className="admin-seat-svg-seat__base"
                x={-width * 0.36}
                y={-height * 0.03}
                width={width * 0.72}
                height={height * 0.18}
                rx="2.5"
                ry="2.5"
            />

            <path
                className="admin-seat-svg-seat__arm"
                d={`
                    M ${-width * 0.43} ${-height * 0.11}
                    Q ${-width * 0.49} ${-height * 0.11}
                      ${-width * 0.49} ${-height * 0.04}
                    V ${height * 0.24}
                    H ${-width * 0.38}
                    V ${-height * 0.04}
                    Q ${-width * 0.38} ${-height * 0.11}
                      ${-width * 0.43} ${-height * 0.11}
                    Z
                `}
            />

            <path
                className="admin-seat-svg-seat__arm"
                d={`
                    M ${width * 0.43} ${-height * 0.11}
                    Q ${width * 0.49} ${-height * 0.11}
                      ${width * 0.49} ${-height * 0.04}
                    V ${height * 0.24}
                    H ${width * 0.38}
                    V ${-height * 0.04}
                    Q ${width * 0.38} ${-height * 0.11}
                      ${width * 0.43} ${-height * 0.11}
                    Z
                `}
            />

            <text
                className="admin-seat-svg-seat__number"
                x="0"
                y={-height * 0.235}
                textAnchor="middle"
                dominantBaseline="middle"
            >
                {seat.number}
            </text>
        </g>
    );
};

const AdminSeatManager = ({
    eventId
}) => {
    const {
        accessToken,
        refreshSession
    } = useAuth();

    const [event, setEvent] =
        useState(null);
    const [seats, setSeats] =
        useState([]);
    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState("");
    const [message, setMessage] =
        useState("");
    const [filter, setFilter] =
        useState("all");
    const [selectedSeatId, setSelectedSeatId] =
        useState(null);
    const [reason, setReason] =
        useState("");
    const [actionLoading, setActionLoading] =
        useState(false);
    const [history, setHistory] =
        useState([]);
    const [historyLoading, setHistoryLoading] =
        useState(false);
    const [historyError, setHistoryError] =
        useState("");

    const runAuthorized =
        useCallback(
            async (
                request,
                ...args
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

                try {
                    return await request(
                        ...args,
                        token
                    );
                } catch (requestError) {
                    if (
                        requestError.status !== 401 &&
                        requestError.response?.status !== 401
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

                    return request(
                        ...args,
                        nextToken
                    );
                }
            },
            [
                accessToken,
                refreshSession
            ]
        );

    const loadSeats = useCallback(
        async ({ silent = false } = {}) => {
            if (!eventId) {
                return;
            }

            try {
                if (!silent) {
                    setLoading(true);
                }

                setError("");

                const result =
                    await runAuthorized(
                        getAdminEventSeats,
                        eventId
                    );

                setEvent(
                    result?.data?.event ||
                        null
                );
                setSeats(
                    Array.isArray(
                        result?.data?.seats
                    )
                        ? result.data.seats
                        : []
                );
            } catch (requestError) {
                if (!silent) {
                    setError(
                        requestError.message ||
                            "Không thể tải sơ đồ ghế quản trị."
                    );
                }
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        },
        [eventId, runAuthorized]
    );

    useEffect(() => {
        loadSeats();

        const timer = window.setInterval(
            () =>
                loadSeats({
                    silent: true
                }),
            5000
        );

        return () =>
            window.clearInterval(
                timer
            );
    }, [loadSeats]);

    const categoriesById = useMemo(
        () => {
            const map = new Map();

            for (
                const category of
                    event?.ticketCategories || []
            ) {
                map.set(
                    String(category._id),
                    category
                );
            }

            return map;
        },
        [event]
    );

    const summary = useMemo(
        () => {
            const result = {
                total: seats.length,
                available: 0,
                blocked: 0,
                held: 0,
                sold: 0
            };

            for (const seat of seats) {
                if (
                    result[seat.status] !==
                    undefined
                ) {
                    result[seat.status] += 1;
                }
            }

            return result;
        },
        [seats]
    );

    const visibleSeats = useMemo(
        () =>
            filter === "all"
                ? seats
                : seats.filter(
                      (seat) =>
                          seat.status ===
                          filter
                  ),
        [seats, filter]
    );

    const selectedSeat = useMemo(
        () =>
            seats.find(
                (seat) =>
                    String(seat._id) ===
                    String(selectedSeatId)
            ) || null,
        [seats, selectedSeatId]
    );

    const loadSeatHistory =
        useCallback(
            async (
                seatId,
                { silent = false } = {}
            ) => {
                if (!seatId) {
                    setHistory([]);
                    setHistoryError("");
                    return;
                }

                try {
                    if (!silent) {
                        setHistoryLoading(true);
                    }

                    setHistoryError("");

                    const result =
                        await runAuthorized(
                            getAdminSeatHistory,
                            seatId
                        );

                    setHistory(
                        Array.isArray(
                            result?.data?.history
                        )
                            ? result.data.history
                            : []
                    );
                } catch (requestError) {
                    setHistoryError(
                        requestError.message ||
                            "Không thể tải lịch sử ghế."
                    );
                } finally {
                    if (!silent) {
                        setHistoryLoading(false);
                    }
                }
            },
            [runAuthorized]
        );

    useEffect(() => {
        if (!selectedSeatId) {
            setHistory([]);
            setHistoryError("");
            return;
        }

        loadSeatHistory(
            selectedSeatId
        );
    }, [
        selectedSeatId,
        loadSeatHistory
    ]);

    useEffect(() => {
        if (!selectedSeat) {
            setReason("");
            return;
        }

        setReason(
            selectedSeat.status ===
                "blocked"
                ? selectedSeat.blockedReason ||
                      ""
                : ""
        );
    }, [selectedSeat?._id, selectedSeat?.status, selectedSeat?.blockedReason]);

    const handleBlock = async () => {
        if (
            !selectedSeat ||
            selectedSeat.status !==
                "available" ||
            actionLoading
        ) {
            return;
        }

        const normalizedReason =
            reason.trim();

        if (
            normalizedReason.length < 3
        ) {
            setError(
                "Vui lòng nhập lý do khóa ghế ít nhất 3 ký tự."
            );
            return;
        }

        try {
            setActionLoading(true);
            setError("");
            setMessage("");

            const result =
                await runAuthorized(
                    blockAdminSeat,
                    selectedSeat._id,
                    normalizedReason
                );

            setMessage(
                result?.message ||
                    `Đã khóa ghế ${selectedSeat.label}.`
            );

            await loadSeats({
                silent: true
            });
            await loadSeatHistory(
                selectedSeat._id,
                { silent: true }
            );
        } catch (requestError) {
            setError(
                requestError.message ||
                    "Không thể khóa ghế."
            );
            await loadSeats({
                silent: true
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnblock = async () => {
        if (
            !selectedSeat ||
            selectedSeat.status !==
                "blocked" ||
            actionLoading
        ) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");
            setMessage("");

            const result =
                await runAuthorized(
                    unblockAdminSeat,
                    selectedSeat._id
                );

            setMessage(
                result?.message ||
                    `Đã mở bán lại ghế ${selectedSeat.label}.`
            );

            await loadSeats({
                silent: true
            });
            await loadSeatHistory(
                selectedSeat._id,
                { silent: true }
            );
        } catch (requestError) {
            setError(
                requestError.message ||
                    "Không thể mở bán lại ghế."
            );
            await loadSeats({
                silent: true
            });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <section className="admin-seat-manager admin-seat-manager--state">
                <strong>
                    Đang tải quản lý ghế...
                </strong>
            </section>
        );
    }

    return (
        <section
            className="admin-seat-manager"
            id="admin-seat-management"
        >
            <div className="admin-seat-manager__header">
                <div>
                    <span className="admin-seat-manager__eyebrow">
                        QUẢN LÝ GHẾ
                    </span>
                    <h2>
                        Sơ đồ & trạng thái ghế
                    </h2>
                    <p>
                        Khóa ghế hư hoặc ghế nhà hát tạm ngưng bán. Ghế đang giữ và ghế đã bán được bảo vệ; lịch sử từng ghế được lưu để nối với Booking/Payment về sau.
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-seat-manager__refresh"
                    onClick={() =>
                        loadSeats()
                    }
                    disabled={actionLoading}
                >
                    ↻ Tải lại
                </button>
            </div>

            <div className="admin-seat-manager__summary">
                <div>
                    <small>Tổng ghế</small>
                    <strong>{summary.total}</strong>
                </div>
                <div>
                    <small>Còn trống</small>
                    <strong>{summary.available}</strong>
                </div>
                <div>
                    <small>Tạm khóa</small>
                    <strong>{summary.blocked}</strong>
                </div>
                <div>
                    <small>Đang giữ</small>
                    <strong>{summary.held}</strong>
                </div>
                <div>
                    <small>Đã bán</small>
                    <strong>{summary.sold}</strong>
                </div>
            </div>

            <div className="admin-seat-manager__filters">
                {FILTERS.map(
                    ([value, label]) => (
                        <button
                            type="button"
                            key={value}
                            className={
                                filter === value
                                    ? "is-active"
                                    : ""
                            }
                            onClick={() =>
                                setFilter(value)
                            }
                        >
                            {label}
                        </button>
                    )
                )}
            </div>

            {error && (
                <div className="admin-seat-manager__alert admin-seat-manager__alert--error">
                    {error}
                </div>
            )}

            {message && (
                <div className="admin-seat-manager__alert admin-seat-manager__alert--success">
                    {message}
                </div>
            )}

            <div className="admin-seat-manager__layout">
                <div className="admin-seat-manager__map-card">
                    <div className="admin-seat-manager__legend">
                        <span><i className="is-available" /> Còn trống</span>
                        <span><i className="is-blocked" /> Tạm khóa</span>
                        <span><i className="is-held" /> Đang giữ</span>
                        <span><i className="is-sold" /> Đã bán</span>
                    </div>

                    <div className="admin-seat-manager__viewport">
                        <svg
                            className="admin-seat-manager__svg"
                            viewBox="0 0 1456 1034"
                            preserveAspectRatio="xMidYMid meet"
                            role="img"
                            aria-label="Sơ đồ quản lý ghế FYCE"
                        >
                            <rect
                                className="admin-seat-hall-outline"
                                x="30"
                                y="28"
                                width="1390"
                                height="978"
                            />

                            <path
                                className="admin-seat-stage"
                                d="M31 29 H1420 V294 H1084 C1004 360 870 389 728 389 C586 389 452 360 372 294 H31 Z"
                            />

                            <text
                                className="admin-seat-stage__label"
                                x="728"
                                y="160"
                                textAnchor="middle"
                            >
                                SÂN KHẤU
                            </text>

                            {visibleSeats.map(
                                (seat) => (
                                    <AdminSeatIcon
                                        key={seat._id}
                                        seat={seat}
                                        category={
                                            categoriesById.get(
                                                String(
                                                    seat.ticketCategoryId
                                                )
                                            ) || null
                                        }
                                        selected={
                                            String(
                                                selectedSeatId
                                            ) ===
                                            String(
                                                seat._id
                                            )
                                        }
                                        onClick={(nextSeat) => {
                                            setSelectedSeatId(
                                                nextSeat._id
                                            );
                                            setError("");
                                            setMessage("");
                                        }}
                                    />
                                )
                            )}
                        </svg>
                    </div>
                </div>

                <aside className="admin-seat-manager__panel">
                    {!selectedSeat ? (
                        <div className="admin-seat-manager__empty">
                            <strong>
                                Chọn một ghế trên sơ đồ
                            </strong>
                            <p>
                                Bạn có thể khóa ghế còn trống hoặc mở lại ghế đang tạm khóa.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="admin-seat-manager__seat-heading">
                                <div>
                                    <small>GHẾ</small>
                                    <h3>{selectedSeat.label}</h3>
                                </div>

                                <span
                                    className={`admin-seat-manager__status admin-seat-manager__status--${getStatusMeta(selectedSeat.status).className}`}
                                >
                                    {getStatusMeta(selectedSeat.status).label}
                                </span>
                            </div>

                            <dl className="admin-seat-manager__details">
                                <div>
                                    <dt>Khu vực</dt>
                                    <dd>{selectedSeat.section}</dd>
                                </div>
                                <div>
                                    <dt>Hạng vé</dt>
                                    <dd>
                                        {categoriesById.get(
                                            String(
                                                selectedSeat.ticketCategoryId
                                            )
                                        )?.name || "—"}
                                    </dd>
                                </div>
                                {selectedSeat.status === "held" && (
                                    <div>
                                        <dt>Giữ đến</dt>
                                        <dd>
                                            {formatDateTime(
                                                selectedSeat.holdExpiresAt
                                            )}
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            {selectedSeat.status === "available" && (
                                <div className="admin-seat-manager__action-box">
                                    <label htmlFor="admin-seat-block-reason">
                                        Lý do khóa ghế
                                    </label>
                                    <textarea
                                        id="admin-seat-block-reason"
                                        value={reason}
                                        maxLength="300"
                                        rows="4"
                                        placeholder="Ví dụ: Ghế hư, nhà hát yêu cầu tạm ngưng bán..."
                                        onChange={(event) =>
                                            setReason(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <small>
                                        {reason.trim().length}/300 ký tự
                                    </small>
                                    <button
                                        type="button"
                                        className="admin-seat-manager__danger-button"
                                        disabled={
                                            actionLoading ||
                                            reason.trim().length < 3
                                        }
                                        onClick={handleBlock}
                                    >
                                        {actionLoading
                                            ? "Đang khóa..."
                                            : "Khóa ghế"}
                                    </button>
                                </div>
                            )}

                            {selectedSeat.status === "blocked" && (
                                <div className="admin-seat-manager__action-box">
                                    <div className="admin-seat-manager__blocked-reason">
                                        <small>Lý do đang khóa</small>
                                        <p>
                                            {selectedSeat.blockedReason ||
                                                "Không có ghi chú"}
                                        </p>
                                        <span>
                                            Khóa lúc: {formatDateTime(
                                                selectedSeat.blockedAt
                                            )}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="admin-seat-manager__primary-button"
                                        disabled={actionLoading}
                                        onClick={handleUnblock}
                                    >
                                        {actionLoading
                                            ? "Đang mở..."
                                            : "Mở bán lại"}
                                    </button>
                                </div>
                            )}

                            {selectedSeat.status === "held" && (
                                <div className="admin-seat-manager__notice">
                                    Ghế đang được khách giữ. Admin không thể khóa hoặc mở bán trực tiếp để tránh cướp phiên giữ chỗ của khách.
                                </div>
                            )}

                            {selectedSeat.status === "sold" && (
                                <div className="admin-seat-manager__notice">
                                    Ghế đã bán. Sau khi có Payment/Refund, ghế này chỉ được mở lại từ thao tác <strong>Xác nhận đã hoàn tiền</strong> của Booking, không chỉnh trực tiếp tại đây.
                                </div>
                            )}

                            <section className="admin-seat-manager__history">
                                <div className="admin-seat-manager__history-heading">
                                    <div>
                                        <small>LỊCH SỬ GHẾ</small>
                                        <strong>
                                            Hoạt động gần đây
                                        </strong>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            loadSeatHistory(
                                                selectedSeat._id
                                            )
                                        }
                                        disabled={historyLoading}
                                    >
                                        ↻
                                    </button>
                                </div>

                                {historyError && (
                                    <p className="admin-seat-manager__history-error">
                                        {historyError}
                                    </p>
                                )}

                                {historyLoading ? (
                                    <p className="admin-seat-manager__history-empty">
                                        Đang tải lịch sử...
                                    </p>
                                ) : history.length === 0 ? (
                                    <p className="admin-seat-manager__history-empty">
                                        Chưa có lịch sử cho ghế này. Từ bản này, thao tác khóa/mở sẽ được ghi lại; khi tích hợp SePay, lượt mua và hoàn tiền sẽ tiếp tục ghi vào cùng lịch sử.
                                    </p>
                                ) : (
                                    <div className="admin-seat-manager__history-list">
                                        {history.map(
                                            (entry) => {
                                                const customer =
                                                    entry?.customerSnapshot ||
                                                    entry?.bookingId?.customer ||
                                                    null;

                                                return (
                                                    <article
                                                        className="admin-seat-manager__history-item"
                                                        key={entry._id}
                                                    >
                                                        <div className="admin-seat-manager__history-dot" />

                                                        <div>
                                                            <div className="admin-seat-manager__history-item-top">
                                                                <strong>
                                                                    {HISTORY_ACTION_LABELS[
                                                                        entry.action
                                                                    ] ||
                                                                        entry.action}
                                                                </strong>
                                                                <span>
                                                                    {formatDateTime(
                                                                        entry.createdAt
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <p>
                                                                Thực hiện bởi: {getHistoryActorLabel(
                                                                    entry
                                                                )}
                                                            </p>

                                                            {entry.reason && (
                                                                <p>
                                                                    Lý do: {entry.reason}
                                                                </p>
                                                            )}

                                                            {entry.bookingId?.bookingCode && (
                                                                <p>
                                                                    Booking: <strong>{entry.bookingId.bookingCode}</strong>
                                                                </p>
                                                            )}

                                                            {customer?.fullName && (
                                                                <p>
                                                                    Người đặt: <strong>{customer.fullName}</strong>
                                                                    {customer.phone
                                                                        ? ` · ${customer.phone}`
                                                                        : ""}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </article>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </aside>
            </div>
        </section>
    );
};

export default AdminSeatManager;
