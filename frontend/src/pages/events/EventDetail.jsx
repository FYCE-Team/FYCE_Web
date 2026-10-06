import { useLanguage } from "../../i18n/useLanguage.js";
import { localizeContent } from "../../i18n/content.js";
import { resolveVideoSource } from "../../utils/videoSource.js";
import ContentImage from "../../components/media/ContentImage.jsx";
import { useImagePreview } from "../../components/media/ImagePreviewContext.js";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMediaUrl } from "../../utils/media.js";
import "./EventDetail.css";

import { API_BASE_URL } from "../../config/api.js";

const formatDate = (date, locale = "vi-VN") => {
    if (!date) return "";

    return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(date));
};

const formatTime = (date, locale = "vi-VN") => {
    if (!date) return "";

    return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(date));
};

const formatPrice = (price, locale = "vi-VN") => {
    if (
        price === undefined ||
        price === null ||
        Number.isNaN(Number(price))
    ) {
        return "Liên hệ";
    }

    return `${Number(price).toLocaleString(locale)} VNĐ`;
};

const formatDuration = (minutes) => {
    if (!minutes) return "";

    return `${minutes} phút`;
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

const prepareMutedTrailer = video => {
    if (video) {
        video.defaultMuted = true;
        video.muted = true;
    }
};

const EventDetail = () => {
    const { t, locale, language } = useLanguage();

    const { slug } = useParams();

    const [rawEvent, setEvent] = useState(null);
    const event = useMemo(() => localizeContent(rawEvent, language), [rawEvent, language]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const openImage = useImagePreview();
    const [failedVideo, setFailedVideo] = useState(null);

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

    const trailerSourceUrl = event?.trailerVideoUrl || null;
    const videoSource = failedVideo === trailerSourceUrl ? null : resolveVideoSource(trailerSourceUrl);
    const displayVideoUrl = videoSource?.kind === "youtube" ? videoSource.src : null;
    const localVideoUrl = videoSource?.kind === "video" ? getMediaUrl(videoSource.src) : null;
    const youtubeVideoId = videoSource?.id;
    const showCover = () => {
        if (!videoSource && event?.coverImage) openImage({ src: getMediaUrl(event.coverImage), alt: t(event.title) });
    };

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

                <p> {t("Đang tải thông tin chương trình...")} </p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="event-detail-state event-detail-state-error">
                <h1> {t("Không thể tải chương trình")} </h1>

                <p>{t(error)}</p>

                <Link
                    to="/"
                    className="event-detail-back-button"
                > {t("Về trang chủ")} </Link>
            </section>
        );
    }

    if (!event) {
        return null;
    }

    return (
        <div className="event-detail-page">
            <main>
                <section className="event-detail-hero" onClick={showCover}>
                    <div className="event-detail-hero-media">
                        {t(localVideoUrl ? (
                            <video
                                key={localVideoUrl}
                                ref={prepareMutedTrailer}
                                className="event-detail-hero-video"
                                onError={() => setFailedVideo(trailerSourceUrl)}
                                onCanPlay={e => { e.currentTarget.play().catch(() => {}); }}
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
                                preload="metadata"
                            />
                        ) : displayVideoUrl ? (
                            <iframe
                                className="event-detail-hero-iframe"
                                src={
                                    youtubeVideoId
                                        ? `${displayVideoUrl}?autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=0&rel=0`
                                        : displayVideoUrl
                                }
                                title={t(event.title)}
                                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                                allowFullScreen
                            />
                        ) : event.coverImage ? (
                            <img
                                className="event-detail-hero-image"
                                src={getMediaUrl(
                                    event.coverImage
                                )}
                                alt={t(event.title)}
                            />
                        ) : (
                            <div className="event-detail-hero-placeholder">
                                FYCE
                            </div>
                        ))}
                    </div>

                    {!videoSource && event.coverImage && <button type="button" className="event-detail-cover-preview" onClick={e => { e.stopPropagation(); showCover(); }}>{t("Xem ảnh bìa")}</button>}
                    <div className="event-detail-hero-overlay" />
                    <div className="event-detail-hero-gradient" />

                    <div className="event-detail-hero-content event-detail-container">
                        <div className="event-detail-hero-text">
                            {t(event.badge && (
                                <span className="event-detail-badge">
                                    ✦ {t(event.badge)}
                                </span>
                            ))}

                            <h1 className="event-detail-title">
                                {t(event.title)}
                            </h1>

                            {t(event.subtitle && (
                                <p className="event-detail-subtitle">
                                    {t(event.subtitle)}
                                </p>
                            ))}

                            <div className="event-detail-hero-info">
                                <div className="event-detail-hero-info-item">
                                    <span>◫</span>

                                    <div>
                                        <small> {t("THỜI GIAN")} </small>

                                        <strong>
                                            {t(event.startAt
                                                ? `${formatTime(
                                                      event.startAt, locale
                                                  )} — ${formatDate(
                                                      event.startAt, locale
                                                  )}`
                                                : "COMING SOON")}
                                        </strong>

                                        {t(event.endAt && (
                                            <span> {t("Kết thúc:")}{t(" ")}
                                                {t(formatTime(
                                                    event.endAt, locale
                                                ))}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="event-detail-hero-info-item">
                                    <span>⌖</span>

                                    <div>
                                        <small> {t("ĐỊA ĐIỂM")} </small>

                                        <strong>
                                            {t(event.venue ||
                                                "Đang cập nhật")}
                                        </strong>

                                        {t(event.address && (
                                            <span>
                                                {
                                                    t(event.address)
                                                }
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {t(event.description && (
                                <p className="event-detail-description">
                                    {t(event.description)}
                                </p>
                            ))}
                        </div>
                    </div>
                </section>


                <section className="event-detail-main-section">
                    <div className="event-detail-container event-detail-layout">
                        <div className="event-detail-content">
                            <section className="event-detail-section">
                                <div className="event-detail-section-heading">
                                    <span> {t("▪ CHƯƠNG TRÌNH & NHẠC MỤC BIỂU DIỄN")} </span>

                                    <h2> {t("Tác Phẩm Thính Phòng Mùa Biểu Diễn")} </h2>

                                    <p>
                                        {t(event.shortDescription ||
                                            "Khám phá chương trình biểu diễn và những tác phẩm được lựa chọn cho mùa diễn.")}
                                    </p>
                                </div>

{t(programParts.length > 0 && (
    <div className="event-detail-program-card">
        <div className="event-detail-program-card-header">
            <div className="event-detail-program-card-heading">
                <span className="event-detail-program-icon">
                    ♬
                </span>

                <div>
                    <span> {t("NHẠC MỤC TRÌNH DIỄN CHÍNH THỨC")} </span>

                    <small>
                        {t(programParts.length)}{t(" ")}
                        {t(programParts.length === 1
                            ? "PHẦN BIỂU DIỄN"
                            : "PHẦN BIỂU DIỄN")}
                    </small>
                </div>
            </div>

            <span className="event-detail-program-count">
                {t(programParts.length)}{t(" ")}
                {t(programParts.length === 1
                    ? "PHẦN"
                    : "PHẦN")}
            </span>
        </div>

        <div className="event-detail-program-parts">
            {t(programParts.map(
                (part, partIndex) => (
                    <article
                        className={`event-detail-program-part event-detail-program-part-${partIndex % 3}`}
                        key={
                            part._id ||
                            `${part.order}-${partIndex}`
                        }
                    >
                        <div className="event-detail-program-part-number">
                            {t(["I", "II", "III", "IV", "V"][
                                partIndex
                            ] ||
                                String(
                                    partIndex + 1
                                ))}
                        </div>

                        <div className="event-detail-program-part-main">
                            <div className="event-detail-program-part-header">
                                <div>
                                    <h3>
                                        {t(part.title)}
                                    </h3>

                                    {t(part.subtitle && (
                                        <p>
                                            {
                                                t(part.subtitle)
                                            }
                                        </p>
                                    ))}
                                </div>

                                <span className="event-detail-program-part-work-count">
                                    {t(part.works?.length || 0)}{t(" ")} {t("tác phẩm")} </span>
                            </div>

                            {t(part.description && (
                                <p className="event-detail-program-part-description">
                                    {
                                        t(part.description)
                                    }
                                </p>
                            ))}

                            {t(part.works?.length > 0 && (
                                <div className="event-detail-program-works">
                                    {t(part.works.map(
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
                                                    {t(String(
                                                        workIndex +
                                                            1
                                                    ).padStart(
                                                        2,
                                                        "0"
                                                    ))}
                                                </span>

                                                <div className="event-detail-program-work-info">
                                                    <strong>
                                                        {
                                                            t(work.title)
                                                        }
                                                    </strong>

                                                    {t(work.subtitle && (
                                                        <span>
                                                            {
                                                                t(work.subtitle)
                                                            }
                                                        </span>
                                                    ))}

                                                    {t(work.composer && (
                                                        <small>
                                                            {
                                                                t(work.composer)
                                                            }
                                                        </small>
                                                    ))}
                                                </div>

                                                {t(work.durationMinutes !=
                                                    null &&
                                                    work.durationMinutes !==
                                                        "" && (
                                                        <span className="event-detail-program-work-duration">
                                                            {t(formatDuration(
                                                                work.durationMinutes
                                                            ))}
                                                        </span>
                                                    ))}
                                            </div>
                                        )
                                    ))}
                                </div>
                            ))}
                        </div>
                    </article>
                )
            ))}
        </div>
    </div>
))}
                                {t(programGallery.length > 0 && (
                                    <div className="event-detail-program-gallery">
                                        {t(programGallery.map(
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
                                                    <ContentImage
                                                        loading="lazy"
                                                        src={getMediaUrl(
                                                            image.image
                                                        )}
                                                        alt={
                                                            t(image.caption ||
                                                            event.title)
                                                        }
                                                    />

                                                    {t(image.caption && (
                                                        <figcaption>
                                                            {
                                                                t(image.caption)
                                                            }
                                                        </figcaption>
                                                    ))}
                                                </figure>
                                            )
                                        ))}
                                    </div>
                                ))}
                            </section>

                            {t(event.artists?.length > 0 && (
                                <section className="event-detail-section">
                                    <div className="event-detail-section-heading">
                                        <span> {t("▪ NGHỆ SĨ & BAN ĐIỀU HÀNH BIỂU DIỄN")} </span>

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
                                        {t(event.artists.map(
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
                                                        {t(artist.image ? (
                                                            <ContentImage
                                                                loading="lazy"
                                                                src={getMediaUrl(
                                                                    artist.image
                                                                )}
                                                                alt={
                                                                    t(artist.name)
                                                                }
                                                            />
                                                        ) : (
                                                            <div className="artist-placeholder">
                                                                FYCE
                                                            </div>
                                                        ))}

                                                        {t(artist.role && (
                                                            <span className="artist-role">
                                                                {
                                                                    t(artist.role)
                                                                }
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <div className="artist-content">
                                                        <h3>
                                                            {
                                                                t(artist.name)
                                                            }
                                                        </h3>

                                                        {t(artist.instrument && (
                                                            <span className="artist-instrument">
                                                                {
                                                                    t(artist.instrument)
                                                                }
                                                            </span>
                                                        ))}

                                                        {t(artist.bio && (
                                                            <p>
                                                                {
                                                                    t(artist.bio)
                                                                }
                                                            </p>
                                                        ))}
                                                    </div>
                                                </article>
                                            )
                                        ))}
                                    </div>
                                </section>
                            ))}

                            {t(event.policies?.length > 0 && (
                                <section
                                    className="event-detail-section"
                                    id="event-policies"
                                >
                                    <div className="event-detail-policy-card">
                                        <div className="event-detail-policy-heading">
                                            <span>♢</span>

                                            <div>
                                                <small> {t("QUY ĐỊNH")} </small>

                                                <h2> {t("Quy Định Khán Phòng & Thưởng Thức Âm Nhạc")} </h2>
                                            </div>
                                        </div>

                                        <div className="event-detail-policies-grid">
                                            {t([...event.policies]
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
                                                                {t(policy.icon ||
                                                                    "•")}
                                                            </div>

                                                            <div>
                                                                <h3>
                                                                    {
                                                                        t(policy.title)
                                                                    }
                                                                </h3>

                                                                <p>
                                                                    {
                                                                        t(policy.description)
                                                                    }
                                                                </p>
                                                            </div>
                                                        </article>
                                                    )
                                                ))}
                                        </div>
                                    </div>
                                </section>
                            ))}

{t(backstageGallery.length > 0 && (
    <section className="event-detail-section">
        <div className="event-detail-section-heading">
            <span> {t("▪ PHÍA SAU ĐÊM DIỄN")} </span>

            <h2> {t("Hậu Trường & Khoảnh Khắc")} </h2>

            <p> {t("Những khoảnh khắc phía sau sân khấu và quá trình chuẩn bị cho đêm diễn.")} </p>
        </div>

        <div className="event-detail-gallery-grid">
            {t(backstageGallery.map(
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
                        <ContentImage
                            loading="lazy"
                            src={getMediaUrl(
                                image.image
                            )}
                            alt={
                                t(image.caption ||
                                `${event.title} backstage`)
                            }
                        />

                        {t(image.caption && (
                            <figcaption>
                                {
                                    t(image.caption)
                                }
                            </figcaption>
                        ))}
                    </figure>
                )
            ))}
        </div>
    </section>
))}
                        </div>

                        <aside
                            className="event-detail-ticket-sidebar"
                            id="ticket-booking"
                        >
                            <div className="ticket-sidebar-card">
                                <div className="ticket-sidebar-heading">
                                    <div>
                                        <span> {t("BẢNG GIÁ VÉ MỞ BÁN")} </span>

                                        <h2> {t("Chọn Hạng Ghế Thính Phòng")} </h2>
                                    </div>

                                    <span className="ticket-sidebar-symbol">
                                        ▣
                                    </span>
                                </div>

                                <div className="ticket-sidebar-status">
                                    {t(event.allowBooking ===
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
                                        : "Đang mở bán")}
                                </div>

                                {t(activeTicketCategories.length >
                                0 ? (
                                    <div className="ticket-categories">
                                        {t(activeTicketCategories.map(
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
                                                                            t(category.name)
                                                                        }
                                                                    </strong>

                                                                    {t(category.description && (
                                                                        <small>
                                                                            {
                                                                                t(category.description)
                                                                            }
                                                                        </small>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <strong className="ticket-category-price">
                                                                {t(formatPrice(
                                                                    category.price, locale
                                                                ))}
                                                            </strong>
                                                        </div>

                                                        {t(category.seatType && (
                                                            <div className="ticket-category-meta">
                                                                {
                                                                    t(category.seatType)
                                                                }
                                                            </div>
                                                        ))}

                                                        {t(category.benefits?.length >
                                                            0 && (
                                                            <div className="ticket-benefits">
                                                                {t(category.benefits
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
                                                                                ✓{t(" ")}
                                                                                {
                                                                                    t(benefit)
                                                                                }
                                                                            </span>
                                                                        )
                                                                    ))}
                                                            </div>
                                                        ))}
                                                    </article>
                                                );
                                            }
                                        ))}
                                    </div>
                                ) : (
                                    <div className="ticket-coming-soon">
                                        <strong> {t("Thông tin vé sẽ được cập nhật")} </strong>

                                        <span> {t("Hạng ghế và giá vé đang được hoàn thiện.")} </span>
                                    </div>
                                ))}

                                {t(event.seatingChartImage && (
                                    <div className="ticket-seating-chart">
                                        <div className="ticket-seating-heading">
                                            <span> {t("SƠ ĐỒ PHÂN BỐ KHÁN PHÒNG")} </span>

                                            <button
                                                type="button"
                                                className="ticket-seating-zoom-button"
                                                onClick={() =>
                                                    openImage({ src: getMediaUrl(event.seatingChartImage), alt: t("Sơ đồ khán phòng") })
                                                }
                                                aria-label={t("Phóng to sơ đồ khán phòng")}
                                            > {t("PHÓNG TO")} </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="ticket-seating-image ticket-seating-image-button"
                                            onClick={() =>
                                                openImage({ src: getMediaUrl(event.seatingChartImage), alt: t("Sơ đồ khán phòng") })
                                            }
                                            aria-label={t("Xem sơ đồ khán phòng")}
                                        >
                                            <img
                                                src={getMediaUrl(
                                                    event.seatingChartImage
                                                )}
                                                alt={t("Sơ đồ khán phòng")}
                                            />
                                        </button>
                                    </div>
                                ))}

                                {t(event.allowBooking ? (
                                    <Link
                                        to={`/events/${slug}/seats`}
                                        className="ticket-book-button"
                                    > {t("▣ Chọn Ghế & Đặt Vé Ngay")} </Link>
                                ) : (
                                    <div className="ticket-book-button ticket-book-button-disabled"> {t("Thông tin đặt vé sẽ được cập nhật")} </div>
                                ))}

                                <div className="ticket-support">
                                    <span>♧</span> {t("Hỗ trợ đặt vé / cơ quan:")} <strong>
                                        1900 8888 68
                                    </strong>
                                </div>

                                {t(startingPrice !==
                                    null && (
                                    <div className="ticket-start-price"> {t("Giá vé từ")}{t(" ")}
                                        <strong>
                                            {t(formatPrice(
                                                startingPrice, locale
                                            ))}
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                </section>
            </main>


        </div>
    );
};

export default EventDetail;
