import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMediaUrl } from "../../utils/media.js";
import "./EventDetail.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const formatDate = (date) => {
    if (!date) return "";

    return new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(date));
};

const formatTime = (date) => {
    if (!date) return "";

    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(date));
};

const formatPrice = (price) => {
    if (
        price === undefined ||
        price === null ||
        Number.isNaN(Number(price))
    ) {
        return "Liên hệ";
    }

    return `${Number(price).toLocaleString("vi-VN")} VNĐ`;
};

const formatDuration = (minutes) => {
    if (!minutes) return "";

    return `${minutes} phút`;
};

const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;

    try {
        const parsed = new URL(url);

        if (parsed.hostname.includes("youtube.com")) {
            const videoId = parsed.searchParams.get("v");

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }

            if (parsed.pathname.startsWith("/embed/")) {
                return url;
            }
        }

        if (parsed.hostname === "youtu.be") {
            const videoId = parsed.pathname.replace("/", "");

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        }
    } catch {
        return null;
    }

    return null;
};

const isLocalVideo = (url) => {
    if (!url) return false;

    const value = String(url).trim();

    /*
     * GridFS video URL không còn extension:
     * /api/videos/<ObjectId>
     */
    if (
        /^\/api\/videos\/[a-f0-9]{24}(?:[?#].*)?$/i.test(
            value
        )
    ) {
        return true;
    }

    return /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(
        value
    );
};

const getInitialTicketColor = (index) => {
    const colors = [
        "#f4b740",
        "#237db3",
        "#2e9472",
        "#7e8892",
        "#8c6fd8",
    ];

    return colors[index % colors.length];
};

const EventDetail = () => {
    const { slug } = useParams();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isSeatingChartOpen, setIsSeatingChartOpen] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadEvent = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `${API_BASE_URL}/events/${slug}`
                );

                const result = await response.json();

                if (!response.ok || !result?.success) {
                    throw new Error(
                        result?.message ||
                            "Không thể tải thông tin concert"
                    );
                }

                const eventData = result?.data?.event;

                if (!eventData) {
                    throw new Error(
                        "Dữ liệu sự kiện không hợp lệ"
                    );
                }

                if (isMounted) {
                    setEvent(eventData);
                }
            } catch (err) {
                console.error(
                    "Event detail loading error:",
                    err
                );

                if (isMounted) {
                    setError(
                        err.message ||
                            "Không thể tải thông tin concert"
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadEvent();

        return () => {
            isMounted = false;
        };
    }, [slug]);

    useEffect(() => {
        if (!isSeatingChartOpen) {
            return;
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsSeatingChartOpen(false);
            }
        };

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );

            document.body.style.overflow =
                previousOverflow;
        };
    }, [isSeatingChartOpen]);

    const activeTicketCategories = useMemo(() => {
        if (!event?.ticketCategories) {
            return [];
        }

        return [...event.ticketCategories]
            .filter(
                (category) =>
                    category.isActive !== false
            )
            .sort(
                (a, b) =>
                    (a.sortOrder || 0) -
                    (b.sortOrder || 0)
            );
    }, [event]);

    const startingPrice = useMemo(() => {
        if (activeTicketCategories.length === 0) {
            return null;
        }

        const prices =
            activeTicketCategories
                .map((category) =>
                    Number(category.price)
                )
                .filter((price) =>
                    Number.isFinite(price)
                );

        if (prices.length === 0) {
            return null;
        }

        return Math.min(...prices);
    }, [activeTicketCategories]);

    const trailerSourceUrl =
        event?.trailerVideoUrl || null;

    const heroSourceUrl =
        event?.heroVideoUrl || null;

    const trailerEmbedUrl =
        getYouTubeEmbedUrl(
            trailerSourceUrl
        );

    const heroEmbedUrl =
        getYouTubeEmbedUrl(heroSourceUrl);

    const displayVideoUrl =
        trailerEmbedUrl ||
        heroEmbedUrl;

    const localVideoUrl =
        isLocalVideo(trailerSourceUrl)
            ? getMediaUrl(trailerSourceUrl)
            : isLocalVideo(heroSourceUrl)
            ? getMediaUrl(heroSourceUrl)
            : null;

    const youtubeVideoId = useMemo(() => {
        if (!displayVideoUrl) {
            return null;
        }

        try {
            const parsed =
                new URL(displayVideoUrl);

            if (
                parsed.hostname.includes(
                    "youtube.com"
                ) &&
                parsed.pathname.startsWith(
                    "/embed/"
                )
            ) {
                return parsed.pathname
                    .replace("/embed/", "")
                    .split("/")[0];
            }
        } catch {
            return null;
        }

        return null;
    }, [displayVideoUrl]);

 const programParts = useMemo(() => {
    if (!Array.isArray(event?.programParts)) {
        return [];
    }

    return [...event.programParts]
        .sort(
            (a, b) =>
                (a.order || 0) -
                (b.order || 0)
        )
        .map((part) => ({
            ...part,
            works: Array.isArray(part.works)
                ? [...part.works].sort(
                      (a, b) =>
                          (a.order || 0) -
                          (b.order || 0)
                  )
                : []
        }));
}, [event]);

const programGallery = useMemo(() => {
    if (!Array.isArray(event?.programGallery)) {
        return [];
    }

    return [...event.programGallery].sort(
        (a, b) =>
            (a.sortOrder || 0) -
            (b.sortOrder || 0)
    );
}, [event]);

const backstageGallery = useMemo(() => {
    if (!Array.isArray(event?.backstageGallery)) {
        return [];
    }

    return [...event.backstageGallery].sort(
        (a, b) =>
            (a.sortOrder || 0) -
            (b.sortOrder || 0)
    );
}, [event]);

    if (loading) {
        return (
            <section className="event-detail-state">
                <div className="event-detail-spinner" />

                <p>
                    Đang tải thông tin chương trình...
                </p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="event-detail-state event-detail-state-error">
                <h1>
                    Không thể tải chương trình
                </h1>

                <p>{error}</p>

                <Link
                    to="/"
                    className="event-detail-back-button"
                >
                    Về trang chủ
                </Link>
            </section>
        );
    }

    if (!event) {
        return null;
    }

    return (
        <div className="event-detail-page">
            <main>
                <section className="event-detail-hero">
                    <div className="event-detail-hero-media">
                        {localVideoUrl ? (
                            <video
                                className="event-detail-hero-video"
                                src={localVideoUrl}
                                poster={
                                    event.coverImage
                                        ? getMediaUrl(
                                              event.coverImage
                                          )
                                        : undefined
                                }
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="auto"
                            />
                        ) : displayVideoUrl ? (
                            <iframe
                                className="event-detail-hero-iframe"
                                src={
                                    youtubeVideoId
                                        ? `${displayVideoUrl}?autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=0&rel=0`
                                        : displayVideoUrl
                                }
                                title={event.title}
                                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                                allowFullScreen
                            />
                        ) : event.coverImage ? (
                            <img
                                className="event-detail-hero-image"
                                src={getMediaUrl(
                                    event.coverImage
                                )}
                                alt={event.title}
                            />
                        ) : (
                            <div className="event-detail-hero-placeholder">
                                FYCE
                            </div>
                        )}
                    </div>

                    <div className="event-detail-hero-overlay" />
                    <div className="event-detail-hero-gradient" />

                    <div className="event-detail-hero-content event-detail-container">
                        <div className="event-detail-hero-text">
                            {event.badge && (
                                <span className="event-detail-badge">
                                    ✦ {event.badge}
                                </span>
                            )}

                            <h1 className="event-detail-title">
                                {event.title}
                            </h1>

                            {event.subtitle && (
                                <p className="event-detail-subtitle">
                                    {event.subtitle}
                                </p>
                            )}

                            <div className="event-detail-hero-info">
                                <div className="event-detail-hero-info-item">
                                    <span>◫</span>

                                    <div>
                                        <small>
                                            THỜI GIAN
                                        </small>

                                        <strong>
                                            {event.startAt
                                                ? `${formatTime(
                                                      event.startAt
                                                  )} — ${formatDate(
                                                      event.startAt
                                                  )}`
                                                : "COMING SOON"}
                                        </strong>

                                        {event.endAt && (
                                            <span>
                                                Kết thúc:{" "}
                                                {formatTime(
                                                    event.endAt
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="event-detail-hero-info-item">
                                    <span>⌖</span>

                                    <div>
                                        <small>
                                            ĐỊA ĐIỂM
                                        </small>

                                        <strong>
                                            {event.venue ||
                                                "Đang cập nhật"}
                                        </strong>

                                        {event.address && (
                                            <span>
                                                {
                                                    event.address
                                                }
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {event.description && (
                                <p className="event-detail-description">
                                    {event.description}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="event-detail-main-section">
                    <div className="event-detail-container event-detail-layout">
                        <div className="event-detail-content">
                            <section className="event-detail-section">
                                <div className="event-detail-section-heading">
                                    <span>
                                        ▪ CHƯƠNG TRÌNH & NHẠC MỤC BIỂU DIỄN
                                    </span>

                                    <h2>
                                        Tác Phẩm Thính
                                        Phòng Mùa Biểu
                                        Diễn
                                    </h2>

                                    <p>
                                        {event.shortDescription ||
                                            "Khám phá chương trình biểu diễn và những tác phẩm được lựa chọn cho mùa diễn."}
                                    </p>
                                </div>

{programParts.length > 0 && (
    <div className="event-detail-program-card">
        <div className="event-detail-program-card-header">
            <div className="event-detail-program-card-heading">
                <span className="event-detail-program-icon">
                    ♬
                </span>

                <div>
                    <span>
                        NHẠC MỤC TRÌNH DIỄN CHÍNH THỨC
                    </span>

                    <small>
                        {programParts.length}{" "}
                        {programParts.length === 1
                            ? "PHẦN BIỂU DIỄN"
                            : "PHẦN BIỂU DIỄN"}
                    </small>
                </div>
            </div>

            <span className="event-detail-program-count">
                {programParts.length}{" "}
                {programParts.length === 1
                    ? "PHẦN"
                    : "PHẦN"}
            </span>
        </div>

        <div className="event-detail-program-parts">
            {programParts.map(
                (part, partIndex) => (
                    <article
                        className={`event-detail-program-part event-detail-program-part-${partIndex % 3}`}
                        key={
                            part._id ||
                            `${part.order}-${partIndex}`
                        }
                    >
                        <div className="event-detail-program-part-number">
                            {["I", "II", "III", "IV", "V"][
                                partIndex
                            ] ||
                                String(
                                    partIndex + 1
                                )}
                        </div>

                        <div className="event-detail-program-part-main">
                            <div className="event-detail-program-part-header">
                                <div>
                                    <h3>
                                        {part.title}
                                    </h3>

                                    {part.subtitle && (
                                        <p>
                                            {
                                                part.subtitle
                                            }
                                        </p>
                                    )}
                                </div>

                                <span className="event-detail-program-part-work-count">
                                    {part.works?.length || 0}{" "}
                                    tác phẩm
                                </span>
                            </div>

                            {part.description && (
                                <p className="event-detail-program-part-description">
                                    {
                                        part.description
                                    }
                                </p>
                            )}

                            {part.works?.length > 0 && (
                                <div className="event-detail-program-works">
                                    {part.works.map(
                                        (
                                            work,
                                            workIndex
                                        ) => (
                                            <div
                                                className="event-detail-program-work"
                                                key={
                                                    work._id ||
                                                    `${work.order}-${workIndex}`
                                                }
                                            >
                                                <span className="event-detail-program-work-number">
                                                    {String(
                                                        workIndex +
                                                            1
                                                    ).padStart(
                                                        2,
                                                        "0"
                                                    )}
                                                </span>

                                                <div className="event-detail-program-work-info">
                                                    <strong>
                                                        {
                                                            work.title
                                                        }
                                                    </strong>

                                                    {work.subtitle && (
                                                        <span>
                                                            {
                                                                work.subtitle
                                                            }
                                                        </span>
                                                    )}

                                                    {work.composer && (
                                                        <small>
                                                            {
                                                                work.composer
                                                            }
                                                        </small>
                                                    )}
                                                </div>

                                                {work.durationMinutes !=
                                                    null &&
                                                    work.durationMinutes !==
                                                        "" && (
                                                        <span className="event-detail-program-work-duration">
                                                            {formatDuration(
                                                                work.durationMinutes
                                                            )}
                                                        </span>
                                                    )}
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </article>
                )
            )}
        </div>
    </div>
)}
                                {programGallery.length > 0 && (
                                    <div className="event-detail-program-gallery">
                                        {programGallery.map(
                                            (
                                                image,
                                                index
                                            ) => (
                                                <figure
                                                    key={
                                                        image._id ||
                                                        index
                                                    }
                                                >
                                                    <img
                                                        src={getMediaUrl(
                                                            image.image
                                                        )}
                                                        alt={
                                                            image.caption ||
                                                            event.title
                                                        }
                                                    />

                                                    {image.caption && (
                                                        <figcaption>
                                                            {
                                                                image.caption
                                                            }
                                                        </figcaption>
                                                    )}
                                                </figure>
                                            )
                                        )}
                                    </div>
                                )}
                            </section>

                            {event.artists?.length > 0 && (
                                <section className="event-detail-section">
                                    <div className="event-detail-section-heading">
                                        <span>
                                            ▪ NGHỆ SĨ & BAN ĐIỀU HÀNH BIỂU DIỄN
                                        </span>

                                        <h2>
                                            Fantasy Youth Chamber Ensemble
                                        </h2>
                                    </div>

                                    <div
                                        className={`event-detail-artists-grid ${
                                            event.artists.length >=
                                            4
                                                ? "is-scrollable"
                                                : ""
                                        }`}
                                    >
                                        {event.artists.map(
                                            (
                                                artist,
                                                index
                                            ) => (
                                                <article
                                                    className="event-detail-artist-card"
                                                    key={
                                                        artist._id ||
                                                        index
                                                    }
                                                >
                                                    <div className="artist-image-wrapper">
                                                        {artist.image ? (
                                                            <img
                                                                src={getMediaUrl(
                                                                    artist.image
                                                                )}
                                                                alt={
                                                                    artist.name
                                                                }
                                                            />
                                                        ) : (
                                                            <div className="artist-placeholder">
                                                                FYCE
                                                            </div>
                                                        )}

                                                        {artist.role && (
                                                            <span className="artist-role">
                                                                {
                                                                    artist.role
                                                                }
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="artist-content">
                                                        <h3>
                                                            {
                                                                artist.name
                                                            }
                                                        </h3>

                                                        {artist.instrument && (
                                                            <span className="artist-instrument">
                                                                {
                                                                    artist.instrument
                                                                }
                                                            </span>
                                                        )}

                                                        {artist.bio && (
                                                            <p>
                                                                {
                                                                    artist.bio
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </article>
                                            )
                                        )}
                                    </div>
                                </section>
                            )}

                            {event.policies?.length > 0 && (
                                <section
                                    className="event-detail-section"
                                    id="event-policies"
                                >
                                    <div className="event-detail-policy-card">
                                        <div className="event-detail-policy-heading">
                                            <span>♢</span>

                                            <div>
                                                <small>
                                                    QUY ĐỊNH
                                                </small>

                                                <h2>
                                                    Quy Định Khán Phòng & Thưởng Thức Âm Nhạc
                                                </h2>
                                            </div>
                                        </div>

                                        <div className="event-detail-policies-grid">
                                            {[...event.policies]
                                                .sort(
                                                    (a, b) =>
                                                        (a.sortOrder ||
                                                            0) -
                                                        (b.sortOrder ||
                                                            0)
                                                )
                                                .map(
                                                    (
                                                        policy,
                                                        index
                                                    ) => (
                                                        <article
                                                            className={`event-detail-policy policy-${index % 4}`}
                                                            key={
                                                                policy._id ||
                                                                index
                                                            }
                                                        >
                                                            <div className="policy-icon">
                                                                {policy.icon ||
                                                                    "•"}
                                                            </div>

                                                            <div>
                                                                <h3>
                                                                    {
                                                                        policy.title
                                                                    }
                                                                </h3>

                                                                <p>
                                                                    {
                                                                        policy.description
                                                                    }
                                                                </p>
                                                            </div>
                                                        </article>
                                                    )
                                                )}
                                        </div>
                                    </div>
                                </section>
                            )}

{backstageGallery.length > 0 && (
    <section className="event-detail-section">
        <div className="event-detail-section-heading">
            <span>
                ▪ PHÍA SAU ĐÊM DIỄN
            </span>

            <h2>
                Hậu Trường & Khoảnh Khắc
            </h2>

            <p>
                Những khoảnh khắc phía sau
                sân khấu và quá trình chuẩn bị
                cho đêm diễn.
            </p>
        </div>

        <div
            className={`event-detail-gallery-grid ${
                backstageGallery.length >= 4
                    ? "is-scrollable"
                    : ""
            }`}
        >
            {backstageGallery.map(
                (image, index) => (
                    <figure
                        className={
                            index === 0
                                ? "gallery-large"
                                : ""
                        }
                        key={
                            image._id ||
                            `${image.sortOrder}-${index}`
                        }
                    >
                        <img
                            src={getMediaUrl(
                                image.image
                            )}
                            alt={
                                image.caption ||
                                `${event.title} backstage`
                            }
                        />

                        {image.caption && (
                            <figcaption>
                                {
                                    image.caption
                                }
                            </figcaption>
                        )}
                    </figure>
                )
            )}
        </div>
    </section>
)}
                        </div>

                        <aside
                            className="event-detail-ticket-sidebar"
                            id="ticket-booking"
                        >
                            <div className="ticket-sidebar-card">
                                <div className="ticket-sidebar-heading">
                                    <div>
                                        <span>
                                            BẢNG GIÁ VÉ MỞ BÁN
                                        </span>

                                        <h2>
                                            Chọn Hạng Ghế Thính Phòng
                                        </h2>
                                    </div>

                                    <span className="ticket-sidebar-symbol">
                                        ▣
                                    </span>
                                </div>

                                <div className="ticket-sidebar-status">
                                    {event.allowBooking ===
                                    false
                                        ? "Tạm ngưng bán vé"
                                        : event.status ===
                                          "sold_out"
                                        ? "Đã bán hết vé"
                                        : event.bookingCloseAt &&
                                          new Date(
                                              event.bookingCloseAt
                                          ) <
                                              new Date()
                                        ? "Đã đóng bán vé"
                                        : "Đang mở bán"}
                                </div>

                                {activeTicketCategories.length >
                                0 ? (
                                    <div className="ticket-categories">
                                        {activeTicketCategories.map(
                                            (
                                                category,
                                                index
                                            ) => {
                                                const color =
                                                    category.colorCode ||
                                                    getInitialTicketColor(
                                                        index
                                                    );

                                                return (
                                                    <article
                                                        className="ticket-category"
                                                        key={
                                                            category._id ||
                                                            category.code ||
                                                            index
                                                        }
                                                    >
                                                        <div className="ticket-category-top">
                                                            <div className="ticket-category-name">
                                                                <span
                                                                    className="ticket-category-dot"
                                                                    style={{
                                                                        backgroundColor:
                                                                            color,
                                                                    }}
                                                                />

                                                                <div>
                                                                    <strong>
                                                                        {
                                                                            category.name
                                                                        }
                                                                    </strong>

                                                                    {category.description && (
                                                                        <small>
                                                                            {
                                                                                category.description
                                                                            }
                                                                        </small>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <strong className="ticket-category-price">
                                                                {formatPrice(
                                                                    category.price
                                                                )}
                                                            </strong>
                                                        </div>

                                                        {category.seatType && (
                                                            <div className="ticket-category-meta">
                                                                {
                                                                    category.seatType
                                                                }
                                                            </div>
                                                        )}

                                                        {category.benefits?.length >
                                                            0 && (
                                                            <div className="ticket-benefits">
                                                                {category.benefits
                                                                    .slice(
                                                                        0,
                                                                        3
                                                                    )
                                                                    .map(
                                                                        (
                                                                            benefit,
                                                                            benefitIndex
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    benefitIndex
                                                                                }
                                                                            >
                                                                                ✓{" "}
                                                                                {
                                                                                    benefit
                                                                                }
                                                                            </span>
                                                                        )
                                                                    )}
                                                            </div>
                                                        )}
                                                    </article>
                                                );
                                            }
                                        )}
                                    </div>
                                ) : (
                                    <div className="ticket-coming-soon">
                                        <strong>
                                            Thông tin vé sẽ được cập nhật
                                        </strong>

                                        <span>
                                            Hạng ghế và giá vé đang được hoàn thiện.
                                        </span>
                                    </div>
                                )}

                                {event.seatingChartImage && (
                                    <div className="ticket-seating-chart">
                                        <div className="ticket-seating-heading">
                                            <span>
                                                SƠ ĐỒ PHÂN BỐ KHÁN PHÒNG
                                            </span>

                                            <button
                                                type="button"
                                                className="ticket-seating-zoom-button"
                                                onClick={() =>
                                                    setIsSeatingChartOpen(
                                                        true
                                                    )
                                                }
                                                aria-label="Phóng to sơ đồ khán phòng"
                                            >
                                                PHÓNG TO
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="ticket-seating-image ticket-seating-image-button"
                                            onClick={() =>
                                                setIsSeatingChartOpen(
                                                    true
                                                )
                                            }
                                            aria-label="Xem sơ đồ khán phòng"
                                        >
                                            <img
                                                src={getMediaUrl(
                                                    event.seatingChartImage
                                                )}
                                                alt="Sơ đồ khán phòng"
                                            />
                                        </button>
                                    </div>
                                )}

                                {event.allowBooking ? (
                                    <Link
                                        to={`/events/${slug}/seats`}
                                        className="ticket-book-button"
                                    >
                                        ▣ Chọn Ghế & Đặt Vé Ngay
                                    </Link>
                                ) : (
                                    <div className="ticket-book-button ticket-book-button-disabled">
                                        Thông tin đặt vé sẽ được cập nhật
                                    </div>
                                )}

                                <div className="ticket-support">
                                    <span>♧</span>
                                    Hỗ trợ đặt vé / cơ quan:
                                    <strong>
                                        1900 8888 68
                                    </strong>
                                </div>

                                {startingPrice !==
                                    null && (
                                    <div className="ticket-start-price">
                                        Giá vé từ{" "}
                                        <strong>
                                            {formatPrice(
                                                startingPrice
                                            )}
                                        </strong>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>
                </section>
            </main>

            {isSeatingChartOpen &&
                event.seatingChartImage && (
                    <div
                        className="seating-chart-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Sơ đồ khán phòng phóng to"
                        onMouseDown={(e) => {
                            if (
                                e.target ===
                                e.currentTarget
                            ) {
                                setIsSeatingChartOpen(
                                    false
                                );
                            }
                        }}
                    >
                        <div className="seating-chart-modal-content">
                            <button
                                type="button"
                                className="seating-chart-modal-close"
                                onClick={() =>
                                    setIsSeatingChartOpen(
                                        false
                                    )
                                }
                                aria-label="Đóng sơ đồ khán phòng"
                            >
                                ×
                            </button>

                            <img
                                src={getMediaUrl(
                                    event.seatingChartImage
                                )}
                                alt="Sơ đồ khán phòng phóng to"
                                className="seating-chart-modal-image"
                            />
                        </div>
                    </div>
                )}
        </div>
    );
};

export default EventDetail;