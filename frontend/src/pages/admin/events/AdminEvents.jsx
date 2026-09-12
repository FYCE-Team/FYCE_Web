import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    Link
} from "react-router-dom";

import {
    useAuth
} from "../../../../context/AuthContext";

import {
    getMediaUrl
} from "../../../utils/media.js";

import "./AdminEvents.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const STATUS_LABELS = {
    draft: "Nháp",
    published: "Đã xuất bản",
    sold_out: "Hết vé",
    cancelled: "Đã hủy",
    completed: "Đã kết thúc"
};

const STATUS_CLASSES = {
    draft: "status-draft",
    published: "status-published",
    sold_out: "status-sold-out",
    cancelled: "status-cancelled",
    completed: "status-completed"
};

const formatDate = (date) => {
    if (!date) {
        return "Chưa có";
    }

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return "Chưa có";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(parsedDate);
};

const formatDateTime = (date) => {
    if (!date) {
        return "Chưa có";
    }

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return "Chưa có";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(parsedDate);
};

const AdminEvents = () => {
    const {
        accessToken,
        user,
        loading: authLoading,
        refreshSession
    } = useAuth();

    const [
        events,
        setEvents
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState("");

    const [
        successMessage,
        setSuccessMessage
    ] = useState("");

    const [
        searchTerm,
        setSearchTerm
    ] = useState("");

    const [
        statusFilter,
        setStatusFilter
    ] = useState("all");

    const [
        actionLoadingId,
        setActionLoadingId
    ] = useState(null);

    const [
        featureLoadingId,
        setFeatureLoadingId
    ] = useState(null);

    const [
        currentPage,
        setCurrentPage
    ] = useState(1);

    const eventsPerPage = 10;

    const loadEvents = useCallback(
        async (token = accessToken) => {
            if (!token) {
                return;
            }

            try {
                setLoading(true);
                setError("");

                const response =
                    await fetch(
                        `${API_BASE_URL}/events/admin/all`,
                        {
                            method: "GET",
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            },
                            credentials:
                                "include"
                        }
                    );

                const result =
                    await response.json();

                if (
                    response.status ===
                    401
                ) {
                    const refreshed =
                        await refreshSession();

                    if (
                        refreshed?.accessToken
                    ) {
                        return loadEvents(
                            refreshed.accessToken
                        );
                    }

                    throw new Error(
                        "Phiên đăng nhập đã hết hạn"
                    );
                }

                if (
                    !response.ok ||
                    !result?.success
                ) {
                    throw new Error(
                        result?.message ||
                            "Không thể tải danh sách sự kiện"
                    );
                }

                setEvents(
                    result?.data?.events ||
                        []
                );
            } catch (err) {
                console.error(
                    "Admin events loading error:",
                    err
                );

                setError(
                    err.message ||
                        "Không thể tải danh sách sự kiện"
                );
            } finally {
                setLoading(false);
            }
        },
        [
            accessToken,
            refreshSession
        ]
    );

    useEffect(() => {
        if (authLoading) {
            return;
        }

        if (
            !user ||
            user.role !== "admin"
        ) {
            setLoading(false);
            return;
        }

        loadEvents();
    }, [
        authLoading,
        user,
        loadEvents
    ]);

    const filteredEvents =
        useMemo(() => {
            const keyword =
                searchTerm
                    .trim()
                    .toLowerCase();

            return events.filter(
                (event) => {
                    const matchesSearch =
                        !keyword ||
                        event.title
                            ?.toLowerCase()
                            .includes(
                                keyword
                            ) ||
                        event.slug
                            ?.toLowerCase()
                            .includes(
                                keyword
                            ) ||
                        event.venue
                            ?.toLowerCase()
                            .includes(
                                keyword
                            ) ||
                        event.city
                            ?.toLowerCase()
                            .includes(
                                keyword
                            );

                    const matchesStatus =
                        statusFilter ===
                            "all" ||
                        event.status ===
                            statusFilter;

                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );
        }, [
            events,
            searchTerm,
            statusFilter
        ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        searchTerm,
        statusFilter
    ]);

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredEvents.length /
                    eventsPerPage
            )
        );

    const paginatedEvents =
        useMemo(() => {
            const start =
                (currentPage - 1) *
                eventsPerPage;

            return filteredEvents.slice(
                start,
                start + eventsPerPage
            );
        }, [
            filteredEvents,
            currentPage
        ]);

    const eventStats =
        useMemo(() => {
            return {
                total: events.length,
                draft: events.filter(
                    (event) =>
                        event.status ===
                        "draft"
                ).length,
                published:
                    events.filter(
                        (event) =>
                            event.status ===
                            "published"
                    ).length,
                cancelled:
                    events.filter(
                        (event) =>
                            event.status ===
                            "cancelled"
                    ).length
            };
        }, [events]);

    const performEventAction =
        async (
            event,
            action
        ) => {
            if (
                !accessToken ||
                !event?._id
            ) {
                return;
            }

            const actionName =
                action === "publish"
                    ? "xuất bản"
                    : "hủy";

            const confirmed =
                window.confirm(
                    `Bạn có chắc muốn ${actionName} event "${event.title}"?`
                );

            if (!confirmed) {
                return;
            }

            try {
                setActionLoadingId(
                    event._id
                );

                setError("");
                setSuccessMessage("");

                const endpoint =
                    action === "publish"
                        ? `${API_BASE_URL}/events/${event._id}/publish`
                        : `${API_BASE_URL}/events/${event._id}/cancel`;

                const response =
                    await fetch(
                        endpoint,
                        {
                            method: "PATCH",
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`
                            },
                            credentials:
                                "include"
                        }
                    );

                const result =
                    await response.json();

                if (
                    response.status ===
                    401
                ) {
                    const refreshed =
                        await refreshSession();

                    if (
                        refreshed?.accessToken
                    ) {
                        await loadEvents(
                            refreshed.accessToken
                        );

                        return;
                    }

                    throw new Error(
                        "Phiên đăng nhập đã hết hạn"
                    );
                }

                if (
                    !response.ok ||
                    !result?.success
                ) {
                    throw new Error(
                        result?.message ||
                            `Không thể ${actionName} sự kiện`
                    );
                }

                const updatedEvent =
                    result?.data?.event;

                setEvents(
                    (currentEvents) =>
                        currentEvents.map(
                            (currentEvent) =>
                                currentEvent._id ===
                                event._id
                                    ? updatedEvent ||
                                      currentEvent
                                    : currentEvent
                        )
                );

                setSuccessMessage(
                    action === "publish"
                        ? `Đã xuất bản "${event.title}".`
                        : `Đã hủy "${event.title}".`
                );
            } catch (err) {
                console.error(
                    "Admin event action error:",
                    err
                );

                setError(
                    err.message ||
                        "Không thể thực hiện thao tác"
                );
            } finally {
                setActionLoadingId(
                    null
                );
            }
        };

    const toggleFeature = async (
        event
    ) => {
        if (
            !accessToken ||
            !event?._id
        ) {
            return;
        }

        const nextFeatured =
            !event.isFeatured;

        try {
            setFeatureLoadingId(
                event._id
            );

            setError("");
            setSuccessMessage("");

            const response =
                await fetch(
                    `${API_BASE_URL}/events/${event._id}/feature`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,
                            "Content-Type":
                                "application/json"
                        },
                        credentials:
                            "include",
                        body: JSON.stringify({
                            isFeatured:
                                nextFeatured
                        })
                    }
                );

            const result =
                await response.json();

            if (
                response.status ===
                401
            ) {
                const refreshed =
                    await refreshSession();

                if (
                    refreshed?.accessToken
                ) {
                    await loadEvents(
                        refreshed.accessToken
                    );

                    return;
                }

                throw new Error(
                    "Phiên đăng nhập đã hết hạn"
                );
            }

            if (
                !response.ok ||
                !result?.success
            ) {
                throw new Error(
                    result?.message ||
                        "Không thể cập nhật Featured"
                );
            }

            const updatedEvent =
                result?.data?.event;

            setEvents(
                (currentEvents) =>
                    currentEvents.map(
                        (currentEvent) => {
                            if (
                                currentEvent._id ===
                                event._id
                            ) {
                                return (
                                    updatedEvent ||
                                    {
                                        ...currentEvent,
                                        isFeatured:
                                            nextFeatured
                                    }
                                );
                            }

                            if (
                                nextFeatured &&
                                currentEvent.isFeatured
                            ) {
                                return {
                                    ...currentEvent,
                                    isFeatured:
                                        false
                                };
                            }

                            return currentEvent;
                        }
                    )
            );

            setSuccessMessage(
                nextFeatured
                    ? `"${event.title}" hiện là Featured Event.`
                    : `Đã bỏ Featured khỏi "${event.title}".`
            );
        } catch (err) {
            console.error(
                "Admin feature action error:",
                err
            );

            setError(
                err.message ||
                    "Không thể cập nhật Featured"
            );
        } finally {
            setFeatureLoadingId(
                null
            );
        }
    };

    if (authLoading) {
        return (
            <section className="admin-events-state">
                <div className="admin-events-spinner" />

                <p>
                    Đang kiểm tra quyền truy cập...
                </p>
            </section>
        );
    }

    if (
        !user ||
        user.role !== "admin"
    ) {
        return (
            <section className="admin-events-state admin-events-state-error">
                <h1>
                    Không có quyền truy cập
                </h1>

                <p>
                    Trang này chỉ dành cho quản trị viên.
                </p>

                <Link
                    to="/"
                    className="admin-events-back-button"
                >
                    Về trang chủ
                </Link>
            </section>
        );
    }

    return (
        <div className="admin-events-page">
            <div className="admin-events-container">

                <header className="admin-events-header">
                    <div>
                        <span className="admin-events-eyebrow">
                            FYCE ADMINISTRATION
                        </span>

                        <h1>
                            Quản lý sự kiện
                        </h1>

                        <p>
                            Quản lý concert, trạng thái xuất bản và thông tin chương trình.
                        </p>
                    </div>

                    <Link
                        to="/admin/events/create"
                        className="admin-events-create-button"
                    >
                        <span>+</span>
                        Tạo sự kiện
                    </Link>
                </header>

                <section className="admin-events-stats">

                    <article className="admin-events-stat-card">
                        <span>
                            TỔNG SỰ KIỆN
                        </span>

                        <strong>
                            {
                                eventStats.total
                            }
                        </strong>
                    </article>

                    <article className="admin-events-stat-card">
                        <span>
                            ĐÃ XUẤT BẢN
                        </span>

                        <strong>
                            {
                                eventStats.published
                            }
                        </strong>
                    </article>

                    <article className="admin-events-stat-card">
                        <span>
                            BẢN NHÁP
                        </span>

                        <strong>
                            {
                                eventStats.draft
                            }
                        </strong>
                    </article>

                    <article className="admin-events-stat-card">
                        <span>
                            ĐÃ HỦY
                        </span>

                        <strong>
                            {
                                eventStats.cancelled
                            }
                        </strong>
                    </article>

                </section>

                {successMessage && (
                    <div className="admin-events-message admin-events-message-success">
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="admin-events-message admin-events-message-error">
                        {error}
                    </div>
                )}

                <section className="admin-events-toolbar">

                    <div className="admin-events-search">
                        <span>⌕</span>

                        <input
                            type="text"
                            value={
                                searchTerm
                            }
                            onChange={(
                                event
                            ) =>
                                setSearchTerm(
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Tìm kiếm sự kiện..."
                        />
                    </div>

                    <div className="admin-events-filter">
                        <label htmlFor="status-filter">
                            Trạng thái
                        </label>

                        <select
                            id="status-filter"
                            value={
                                statusFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setStatusFilter(
                                    event.target
                                        .value
                                )
                            }
                        >
                            <option value="all">
                                Tất cả
                            </option>

                            <option value="draft">
                                Nháp
                            </option>

                            <option value="published">
                                Đã xuất bản
                            </option>

                            <option value="sold_out">
                                Hết vé
                            </option>

                            <option value="cancelled">
                                Đã hủy
                            </option>

                            <option value="completed">
                                Đã kết thúc
                            </option>
                        </select>
                    </div>

                </section>

                <section className="admin-events-table-card">

                    {loading ? (
                        <div className="admin-events-table-state">

                            <div className="admin-events-spinner" />

                            <p>
                                Đang tải danh sách sự kiện...
                            </p>

                        </div>
                    ) : paginatedEvents.length ===
                      0 ? (
                        <div className="admin-events-table-state">

                            <div className="admin-events-empty-icon">
                                ◈
                            </div>

                            <h2>
                                Không tìm thấy sự kiện
                            </h2>

                            <p>
                                Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.
                            </p>

                        </div>
                    ) : (
                        <>
                            <div className="admin-events-table-wrapper">

                                <table className="admin-events-table">

                                    <thead>
                                        <tr>
                                            <th>
                                                SỰ KIỆN
                                            </th>

                                            <th>
                                                ĐỊA ĐIỂM
                                            </th>

                                            <th>
                                                THỜI GIAN
                                            </th>

                                            <th>
                                                TRẠNG THÁI
                                            </th>

                                            <th>
                                                FEATURED
                                            </th>

                                            <th>
                                                BOOKING
                                            </th>

                                            <th>
                                                THAO TÁC
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {paginatedEvents.map(
                                            (
                                                event
                                            ) => (
                                                <tr
                                                    key={
                                                        event._id
                                                    }
                                                >
                                                    <td>
                                                        <div className="admin-event-name">

                                                            <div className="admin-event-thumb">

                                                                {event.coverImage ? (
                                                                    <img
                                                                        src={getMediaUrl(
                                                                            event.coverImage
                                                                        )}
                                                                        alt={
                                                                            event.title
                                                                        }
                                                                        onError={(
                                                                            imageEvent
                                                                        ) => {
                                                                            imageEvent.currentTarget.style.display =
                                                                                "none";

                                                                            imageEvent.currentTarget.parentElement.classList.add(
                                                                                "admin-event-thumb-error"
                                                                            );
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        FYCE
                                                                    </span>
                                                                )}

                                                            </div>

                                                            <div>
                                                                <strong>
                                                                    {
                                                                        event.title
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    /
                                                                    {
                                                                        event.slug
                                                                    }
                                                                </span>
                                                            </div>

                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="admin-event-location">

                                                            <strong>
                                                                {
                                                                    event.venue ||
                                                                    "Chưa cập nhật"
                                                                }
                                                            </strong>

                                                            <span>
                                                                {
                                                                    event.city ||
                                                                    ""
                                                                }
                                                            </span>

                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="admin-event-date">

                                                            <strong>
                                                                {formatDate(
                                                                    event.startAt
                                                                )}
                                                            </strong>

                                                            <span>
                                                                {event.startAt
                                                                    ? formatDateTime(
                                                                          event.startAt
                                                                      ).split(
                                                                          ", "
                                                                      )[1] ||
                                                                      ""
                                                                    : "COMING SOON"}
                                                            </span>

                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`admin-event-status ${
                                                                STATUS_CLASSES[
                                                                    event.status
                                                                ] ||
                                                                "status-draft"
                                                            }`}
                                                        >
                                                            {
                                                                STATUS_LABELS[
                                                                    event.status
                                                                ] ||
                                                                event.status
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <button
                                                            type="button"
                                                            className={
                                                                event.isFeatured
                                                                    ? "admin-event-feature-button featured"
                                                                    : "admin-event-feature-button"
                                                            }
                                                            onClick={() =>
                                                                toggleFeature(
                                                                    event
                                                                )
                                                            }
                                                            disabled={
                                                                featureLoadingId ===
                                                                event._id
                                                            }
                                                        >
                                                            {featureLoadingId ===
                                                            event._id
                                                                ? "..."
                                                                : event.isFeatured
                                                                ? "★ Featured"
                                                                : "☆ Feature"}
                                                        </button>
                                                    </td>

                                                    <td>
                                                        {event.allowBooking ? (
                                                            <span className="admin-event-booking booking-open">
                                                                Bật
                                                            </span>
                                                        ) : (
                                                            <span className="admin-event-booking booking-closed">
                                                                Tắt
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="admin-event-actions">

                                                            <Link
                                                                to={`/events/${event.slug}`}
                                                                className="admin-event-action admin-event-action-view"
                                                                title="Xem"
                                                            >
                                                                Xem
                                                            </Link>

                                                            <Link
                                                                to={`/admin/events/${event._id}/edit`}
                                                                className="admin-event-action admin-event-action-edit"
                                                            >
                                                                Sửa
                                                            </Link>

                                                            {event.status ===
                                                                "draft" && (
                                                                <button
                                                                    type="button"
                                                                    className="admin-event-action admin-event-action-publish"
                                                                    onClick={() =>
                                                                        performEventAction(
                                                                            event,
                                                                            "publish"
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        actionLoadingId ===
                                                                        event._id
                                                                    }
                                                                >
                                                                    {
                                                                        actionLoadingId ===
                                                                        event._id
                                                                            ? "..."
                                                                            : "Publish"
                                                                    }
                                                                </button>
                                                            )}

                                                            {event.status !==
                                                                "cancelled" &&
                                                                event.status !==
                                                                    "completed" && (
                                                                <button
                                                                    type="button"
                                                                    className="admin-event-action admin-event-action-cancel"
                                                                    onClick={() =>
                                                                        performEventAction(
                                                                            event,
                                                                            "cancel"
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        actionLoadingId ===
                                                                        event._id
                                                                    }
                                                                >
                                                                    {
                                                                        actionLoadingId ===
                                                                        event._id
                                                                            ? "..."
                                                                            : "Hủy"
                                                                    }
                                                                </button>
                                                            )}

                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>

                                </table>
                            </div>

                            <div className="admin-events-pagination">

                                <span>
                                    Hiển thị{" "}
                                    {
                                        filteredEvents.length ===
                                        0
                                            ? 0
                                            : (
                                                  currentPage -
                                                  1
                                              ) *
                                                  eventsPerPage +
                                              1
                                    }
                                    {" — "}
                                    {Math.min(
                                        currentPage *
                                            eventsPerPage,
                                        filteredEvents.length
                                    )}{" "}
                                    /{" "}
                                    {
                                        filteredEvents.length
                                    }{" "}
                                    sự kiện
                                </span>

                                <div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentPage(
                                                (
                                                    page
                                                ) =>
                                                    Math.max(
                                                        page -
                                                            1,
                                                        1
                                                    )
                                            )
                                        }
                                        disabled={
                                            currentPage ===
                                            1
                                        }
                                    >
                                        ←
                                    </button>

                                    <strong>
                                        {
                                            currentPage
                                        }
                                    </strong>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentPage(
                                                (
                                                    page
                                                ) =>
                                                    Math.min(
                                                        page +
                                                            1,
                                                        totalPages
                                                    )
                                            )
                                        }
                                        disabled={
                                            currentPage ===
                                            totalPages
                                        }
                                    >
                                        →
                                    </button>

                                </div>

                            </div>
                        </>
                    )}

                </section>

            </div>
        </div>
    );
};

export default AdminEvents;