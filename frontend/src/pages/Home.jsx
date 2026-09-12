import {
    useEffect,
    useState
} from "react";

import {
    Link
} from "react-router-dom";

import {
    getHomepage
} from "../services/homepage.service.js";

import {
    getMediaUrl
} from "../utils/media.js";

import "./Home.css";

const getCountdown = (targetDate) => {
    if (!targetDate) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0
        };
    }

    const target =
        new Date(targetDate).getTime();

    const now =
        new Date().getTime();

    const difference =
        Math.max(
            target - now,
            0
        );

    return {
        days: Math.floor(
            difference /
                (1000 * 60 * 60 * 24)
        ),

        hours: Math.floor(
            (difference /
                (1000 * 60 * 60)) % 24
        ),

        minutes: Math.floor(
            (difference /
                (1000 * 60)) % 60
        ),

        seconds: Math.floor(
            (difference / 1000) % 60
        )
    };
};

const formatDate = (date) => {
    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(
        new Date(date)
    );
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
    ).format(
        new Date(date)
    );
};

const formatPrice = (price) => {
    if (
        price === undefined ||
        price === null ||
        Number.isNaN(Number(price))
    ) {
        return "";
    }

    return `${Number(price).toLocaleString(
        "vi-VN"
    )} VNĐ`;
};

const getStartingPrice = (event) => {
    if (
        !event?.ticketCategories ||
        event.ticketCategories.length === 0
    ) {
        return null;
    }

    const activePrices =
        event.ticketCategories
            .filter(
                (category) =>
                    category.isActive !== false
            )
            .map(
                (category) =>
                    Number(category.price)
            )
            .filter(
                (price) =>
                    Number.isFinite(price)
            );

    if (
        activePrices.length === 0
    ) {
        return null;
    }

    return Math.min(
        ...activePrices
    );
};

const Home = () => {
    const [
        homepage,
        setHomepage
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState("");

    const [
        countdown,
        setCountdown
    ] = useState(
        getCountdown(null)
    );

    useEffect(() => {
        const loadHomepage =
            async () => {
                try {
                    setLoading(true);
                    setError("");

                    const data =
                        await getHomepage();

                    setHomepage(data);
                } catch (err) {
                    console.error(
                        "Homepage loading error:",
                        err
                    );

                    setError(
                        err.message ||
                            "Không thể tải dữ liệu Homepage"
                    );
                } finally {
                    setLoading(false);
                }
            };

        loadHomepage();
    }, []);

    const featuredEvent =
        homepage?.hero?.featuredEvent ||
        homepage?.featuredEvent ||
        null;

    const countdownTarget =
        featuredEvent?.startAt ||
        null;

    useEffect(() => {
        if (!countdownTarget) {
            setCountdown(
                getCountdown(null)
            );

            return undefined;
        }

        setCountdown(
            getCountdown(
                countdownTarget
            )
        );

        const timer =
            setInterval(() => {
                setCountdown(
                    getCountdown(
                        countdownTarget
                    )
                );
            }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [countdownTarget]);

    if (loading) {
        return (
            <section className="home-state">
                <div className="home-spinner" />

                <p>
                    Đang tải Homepage...
                </p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="home-state">
                <h1>
                    Không thể tải Homepage
                </h1>

                <p>
                    {error}
                </p>
            </section>
        );
    }

    if (!homepage) {
        return null;
    }

    const {
        hero,
        upcomingEvents = [],
        about,
        gallery = []
    } = homepage;

    const homepageEvents = [
        ...upcomingEvents
    ];

    if (
        featuredEvent &&
        !homepageEvents.some(
            (event) =>
                event._id &&
                featuredEvent._id &&
                event._id === featuredEvent._id
        )
    ) {
        homepageEvents.unshift(
            featuredEvent
        );
    }

    return (
        <div className="home-page">

            <section
                className="home-hero"
                style={{
                    backgroundImage:
                        hero?.backgroundImage
                            ? `url("${getMediaUrl(
                                  hero.backgroundImage
                              )}")`
                            : undefined
                }}
            >
                <div className="home-hero-overlay" />

                <div className="home-container home-hero-content">

                    <div className="home-hero-text">

                        {hero?.eyebrow && (
                            <span className="home-eyebrow">
                                {hero.eyebrow}
                            </span>
                        )}

                        <h1>
                            {hero?.title ||
                                "Khúc Giao Hưởng Thanh Xuân"}
                        </h1>

                        {hero?.subtitle && (
                            <h2>
                                {hero.subtitle}
                            </h2>
                        )}

                        <p>
                            {hero?.description ||
                                "Nơi những người trẻ cùng hòa vào một nhịp thở âm nhạc, kết nối đam mê và tạo nên những khoảnh khắc đáng nhớ."}
                        </p>

                        <div className="home-hero-actions">

                            {hero?.primaryButtonText && (
                                <Link
                                    to={
                                        hero.primaryButtonLink ||
                                        "/events"
                                    }
                                    className="home-primary-button"
                                >
                                    {
                                        hero.primaryButtonText
                                    }
                                </Link>
                            )}

                            {hero?.secondaryButtonText && (
                                <Link
                                    to={
                                        hero.secondaryButtonLink ||
                                        "/about"
                                    }
                                    className="home-secondary-button"
                                >
                                    {
                                        hero.secondaryButtonText
                                    }
                                </Link>
                            )}

                        </div>

                    </div>

                    {featuredEvent && (
                        <div className="home-featured-event">

                            <div className="home-featured-poster">

                                {featuredEvent.coverImage ? (
                                    <img
                                        src={getMediaUrl(
                                            featuredEvent.coverImage
                                        )}
                                        alt={
                                            featuredEvent.title ||
                                            "Featured concert"
                                        }
                                    />
                                ) : (
                                    <div className="home-featured-poster-placeholder">
                                        FYCE
                                    </div>
                                )}

                            </div>

                            <div className="featured-event-top">

                                <span className="home-featured-label">
                                    Đêm diễn tiếp theo
                                </span>

                                <span className="featured-event-badge">
                                    {featuredEvent.startAt
                                        ? "Sắp diễn ra"
                                        : "COMING SOON"}
                                </span>

                            </div>

                            <h3>
                                {
                                    featuredEvent.title
                                }
                            </h3>

                            <p className="featured-event-meta">

                                {featuredEvent.venue ||
                                    "Địa điểm sẽ được cập nhật"}

                                {featuredEvent.city
                                    ? ` · ${featuredEvent.city}`
                                    : ""}

                                {" · "}

                                {featuredEvent.startAt
                                    ? formatDate(
                                          featuredEvent.startAt
                                      )
                                    : "COMING SOON"}

                            </p>

                            {countdownTarget ? (

                                <div className="featured-countdown">

                                    <div className="countdown-box">

                                        <strong>
                                            {String(
                                                countdown.days
                                            ).padStart(
                                                2,
                                                "0"
                                            )}
                                        </strong>

                                        <span>
                                            Ngày
                                        </span>

                                    </div>

                                    <div className="countdown-box">

                                        <strong>
                                            {String(
                                                countdown.hours
                                            ).padStart(
                                                2,
                                                "0"
                                            )}
                                        </strong>

                                        <span>
                                            Giờ
                                        </span>

                                    </div>

                                    <div className="countdown-box">

                                        <strong>
                                            {String(
                                                countdown.minutes
                                            ).padStart(
                                                2,
                                                "0"
                                            )}
                                        </strong>

                                        <span>
                                            Phút
                                        </span>

                                    </div>

                                    <div className="countdown-box countdown-box-accent">

                                        <strong>
                                            {String(
                                                countdown.seconds
                                            ).padStart(
                                                2,
                                                "0"
                                            )}
                                        </strong>

                                        <span>
                                            Giây
                                        </span>

                                    </div>

                                </div>

                            ) : (

                                <div className="featured-coming-soon">
                                    COMING SOON
                                </div>

                            )}

                            <Link
                                to={
                                    featuredEvent.slug
                                        ? `/events/${featuredEvent.slug}`
                                        : "/events"
                                }
                                className="home-featured-button"
                            >
                                Xem thông tin chương trình
                            </Link>

                        </div>
                    )}

                </div>

            </section>

            <section
                id="concerts"
                className="home-section home-upcoming"
            >

                <div className="home-container">

                    <div className="home-section-heading">

                        <div>

                            <span>
                                Lịch Diễn Trong Năm
                            </span>

                            <h2>
                                Concert Sắp Diễn Ra
                            </h2>

                        </div>

                        <p>
                            Hãy chọn ngay vị trí đẹp nhất
                            trong không gian để thưởng thức
                            trọn vẹn chất lượng âm thanh
                            của chương trình.
                        </p>

                    </div>

                    <div className="home-events-grid">

                        {homepageEvents
                            .slice(0, 3)
                            .map(
                                (event) => {

                                    const price =
                                        getStartingPrice(
                                            event
                                        );

                                    return (
                                        <article
                                            className="home-event-card"
                                            key={
                                                event._id ||
                                                event.slug
                                            }
                                        >

                                            <Link
                                                to={`/events/${event.slug}`}
                                                className="home-event-image-link"
                                            >

                                                <div className="home-event-image">

                                                    {event.coverImage ? (

                                                        <img
                                                            src={getMediaUrl(
                                                                event.coverImage
                                                            )}
                                                            alt={
                                                                event.title
                                                            }
                                                        />

                                                    ) : (

                                                        <div className="home-event-image-placeholder">
                                                            FYCE
                                                        </div>

                                                    )}

                                                    {event.badge && (
                                                        <span className="home-event-badge">
                                                            {
                                                                event.badge
                                                            }
                                                        </span>
                                                    )}

                                                </div>

                                            </Link>

                                            <div className="home-event-content">

                                                <div className="home-event-date">

                                                    {event.startAt ? (

                                                        <>
                                                            <span>
                                                                {formatTime(
                                                                    event.startAt
                                                                )}
                                                            </span>

                                                            <span>
                                                                {" · "}
                                                            </span>

                                                            <span>
                                                                {formatDate(
                                                                    event.startAt
                                                                )}
                                                            </span>
                                                        </>

                                                    ) : (

                                                        <span className="home-event-coming-soon">
                                                            COMING SOON
                                                        </span>

                                                    )}

                                                </div>

                                                <h3>
                                                    {
                                                        event.title
                                                    }
                                                </h3>

                                                <p>
                                                    {
                                                        event.shortDescription ||
                                                        "Thông tin chương trình sẽ được cập nhật."
                                                    }
                                                </p>

                                                <div className="home-event-location">

                                                    {event.venue && (
                                                        <span>
                                                            {
                                                                event.venue
                                                            }
                                                        </span>
                                                    )}

                                                    {event.city && (
                                                        <span>
                                                            {event.venue
                                                                ? ", "
                                                                : ""}
                                                            {
                                                                event.city
                                                            }
                                                        </span>
                                                    )}

                                                </div>

                                                {event.conductor && (
                                                    <div className="home-event-conductor">
                                                        Nhạc trưởng:{" "}
                                                        {
                                                            event.conductor
                                                        }
                                                    </div>
                                                )}

                                            </div>

                                            <div className="home-event-footer">

                                                <div className="home-event-price">

                                                    <span>
                                                        {price !==
                                                        null
                                                            ? "Giá vé từ"
                                                            : "Thông tin vé"}
                                                    </span>

                                                    <strong>
                                                        {price !==
                                                        null
                                                            ? formatPrice(
                                                                  price
                                                              )
                                                            : "COMING SOON"}
                                                    </strong>

                                                </div>

                                                <Link
                                                    to={`/events/${event.slug}`}
                                                    className="home-event-book-button"
                                                >
                                                    Xem chương trình
                                                </Link>

                                            </div>

                                        </article>
                                    );
                                }
                            )}

                    </div>

                    {homepageEvents.length ===
                        0 && (
                        <div className="home-empty">
                            Chưa có concert sắp diễn ra.
                        </div>
                    )}

                </div>

            </section>

            {about && (
                <section
                    id="about"
                    className="home-about"
                >

                    <div className="home-container home-about-grid">

                        <div className="home-about-image-wrapper">

                            <div className="home-about-image">

                                {about.image ? (

                                    <img
                                        src={getMediaUrl(
                                            about.image
                                        )}
                                        alt={
                                            about.imageAlt ||
                                            about.title
                                        }
                                    />

                                ) : (

                                    <div className="home-about-image-placeholder">
                                        FYCE
                                    </div>

                                )}

                            </div>

                            <div className="home-about-highlight">

                                <div className="home-about-highlight-icon">
                                    ♪
                                </div>

                                <strong>
                                    Di Sản Sống
                                </strong>

                                <p>
                                    Nuôi dưỡng và truyền
                                    tải những giá trị âm
                                    nhạc qua từng thế hệ.
                                </p>

                            </div>

                        </div>

                        <div className="home-about-content">

                            {about.eyebrow && (
                                <span className="home-about-eyebrow">
                                    {about.eyebrow}
                                </span>
                            )}

                            <h2>
                                {about.title}
                            </h2>

                            {about.subtitle && (
                                <h3>
                                    {about.subtitle}
                                </h3>
                            )}

                            <p className="home-about-description">
                                {about.description}
                            </p>

                            {about.features?.length >
                                0 && (

                                <div className="home-features">

                                    {about.features
                                        .slice(0, 3)
                                        .map(
                                            (
                                                feature,
                                                index
                                            ) => (

                                                <div
                                                    className="home-feature"
                                                    key={
                                                        feature._id ||
                                                        index
                                                    }
                                                >

                                                    <div className="home-feature-icon">

                                                        {index ===
                                                        0
                                                            ? "✧"
                                                            : index ===
                                                              1
                                                            ? "♪"
                                                            : "◉"}

                                                    </div>

                                                    <h4>
                                                        {
                                                            feature.title
                                                        }
                                                    </h4>

                                                    <p>
                                                        {
                                                            feature.description
                                                        }
                                                    </p>

                                                </div>

                                            )
                                        )}

                                </div>

                            )}

                            {about.buttonText && (
                                <Link
                                    to={
                                        about.buttonLink ||
                                        "/about"
                                    }
                                    className="home-primary-button home-about-button"
                                >
                                    {
                                        about.buttonText
                                    }
                                </Link>
                            )}

                        </div>

                    </div>

                </section>
            )}

            <section className="home-gallery">

                <div className="home-container">

                    <div className="home-gallery-heading">

                        <span>
                            Khoảnh Khắc Thăng Hoa
                        </span>

                        <h2>
                            Hình Ảnh Hoạt Động & Hậu Trường
                        </h2>

                        <p>
                            Từ những giờ phút miệt mài
                            trong phòng tập đến sân khấu,
                            mỗi khoảnh khắc đều là một phần
                            câu chuyện của FYCE.
                        </p>

                    </div>

                    <div className="home-gallery-grid">

                        {gallery
                            .slice(0, 5)
                            .map(
                                (
                                    item,
                                    index
                                ) => (

                                    <figure
                                        className={`home-gallery-item home-gallery-item-${index + 1}`}
                                        key={
                                            item._id ||
                                            index
                                        }
                                    >

                                        {item.image ? (

                                            <img
                                                src={getMediaUrl(
                                                    item.image
                                                )}
                                                alt={
                                                    item.altText ||
                                                    item.title ||
                                                    "FYCE Gallery"
                                                }
                                            />

                                        ) : (

                                            <div className="home-gallery-placeholder">
                                                FYCE
                                            </div>

                                        )}

                                        {(item.title ||
                                            item.caption) && (

                                            <figcaption>

                                                {item.title && (
                                                    <strong>
                                                        {
                                                            item.title
                                                        }
                                                    </strong>
                                                )}

                                                {item.caption && (
                                                    <span>
                                                        {
                                                            item.caption
                                                        }
                                                    </span>
                                                )}

                                            </figcaption>

                                        )}

                                    </figure>

                                )
                            )}

                    </div>

                    {gallery.length ===
                        0 && (
                        <div className="home-empty">
                            Chưa có hình ảnh hoạt động.
                        </div>
                    )}

                </div>

            </section>

        </div>
    );
};

export default Home;