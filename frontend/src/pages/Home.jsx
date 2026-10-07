import { useLanguage } from "../i18n/useLanguage.js";
import ContentImage from "../components/media/ContentImage.jsx";
import { localizeContent } from "../i18n/content.js";
import {
    useEffect,
    useState
} from "react";

import {
    Link, useLocation, useNavigationType
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

    if (!Number.isFinite(target)) return getCountdown(null);

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

const formatDate = (date, locale = "vi-VN") => {
    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat(
        locale,
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(
        new Date(date)
    );
};

const formatTime = (date, locale = "vi-VN") => {
    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat(
        locale,
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(
        new Date(date)
    );
};

const formatPrice = (price, locale = "vi-VN") => {
    if (
        price === undefined ||
        price === null ||
        Number.isNaN(Number(price))
    ) {
        return "";
    }

    return `${Number(price).toLocaleString(
        locale
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
    const { t, locale, language } = useLanguage();
    const navigationType = useNavigationType();

    const location = useLocation();
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

    useEffect(() => {
        if (!location.hash || !homepage || (navigationType === "POP" && performance.getEntriesByType("navigation")[0]?.type === "reload")) return;
        const target = document.getElementById(location.hash.slice(1));
        if (location.hash === "#top") {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        } else {
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [homepage, location.hash, navigationType]);

    const featuredEvent =
        localizeContent(homepage?.hero?.featuredEvent || homepage?.featuredEvent || null, language);

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

                <p> {t("Đang tải Homepage...")} </p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="home-state">
                <h1> {t("Không thể tải Homepage")} </h1>

                <p>
                    {t(error)}
                </p>
            </section>
        );
    }

    if (!homepage) {
        return null;
    }

    const {
        hero: rawHero,
        upcomingEvents = [],
        about: rawAbout,
        gallery = []
    } = homepage;
    const hero = localizeContent(rawHero, language);
    const about = localizeContent(rawAbout, language);

    const homepageEvents = [
        ...upcomingEvents.map(event => localizeContent(event, language))
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
        <div className="home-page" id="top">

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

                        {t(hero?.eyebrow && (
                            <span className="home-eyebrow">
                                {t(hero.eyebrow)}
                            </span>
                        ))}

                        <h1>
                            {t(hero?.title ||
                                "Khúc Giao Hưởng Thanh Xuân")}
                        </h1>

                        {t(hero?.subtitle && (
                            <h2>
                                {t(hero.subtitle)}
                            </h2>
                        ))}

                        <p>
                            {t(hero?.description ||
                                "Nơi những người trẻ cùng hòa vào một nhịp thở âm nhạc, kết nối đam mê và tạo nên những khoảnh khắc đáng nhớ.")}
                        </p>

                        <div className="home-hero-actions">

                            {t(hero?.primaryButtonText && (
                                <Link
                                    to={
                                        hero.primaryButtonLink ||
                                        "/events"
                                    }
                                    className="home-primary-button"
                                >
                                    {
                                        t(hero.primaryButtonText)
                                    }
                                </Link>
                            ))}

                            {t(hero?.secondaryButtonText && (
                                <Link
                                    to={
                                        hero.secondaryButtonLink ||
                                        "/about"
                                    }
                                    className="home-secondary-button"
                                >
                                    {
                                        t(hero.secondaryButtonText)
                                    }
                                </Link>
                            ))}

                        </div>

                    </div>

                    {t(featuredEvent && (
                        <div className="home-featured-event">

                            <div className="home-featured-poster">

                                {t(featuredEvent.coverImage ? (
                                    <ContentImage
                                        src={getMediaUrl(
                                            featuredEvent.coverImage
                                        )}
                                        alt={
                                            t(featuredEvent.title ||
                                            "Featured concert")
                                        }
                                    />
                                ) : (
                                    <div className="home-featured-poster-placeholder">
                                        FYCE
                                    </div>
                                ))}

                            </div>

                            <div className="featured-event-top">

                                <span className="home-featured-label"> {t("Đêm diễn tiếp theo")} </span>

                                <span className="featured-event-badge">
                                    {t(featuredEvent.startAt
                                        ? "Sắp diễn ra"
                                        : "COMING SOON")}
                                </span>

                            </div>

                            <h3>
                                {
                                    t(featuredEvent.title)
                                }
                            </h3>

                            <p className="featured-event-meta">

                                {t(featuredEvent.venue ||
                                    "Địa điểm sẽ được cập nhật")}

                                {featuredEvent.city ? ` · ${t(featuredEvent.city)}` : ""}

                                {t(" · ")}

                                {t(featuredEvent.startAt
                                    ? formatDate(
                                          featuredEvent.startAt, locale
                                      )
                                    : "COMING SOON")}

                            </p>

                            {countdownTarget ? (
                                <div className="featured-countdown-section">
                                    <p className="featured-countdown-heading">{t("Đếm ngược đến đêm diễn")}</p>
                                    <div className="featured-countdown" role="timer" aria-live="off" aria-label={t("Đếm ngược đến đêm diễn")}>
                                        {[
                                            ["days", "Ngày"],
                                            ["hours", "Giờ"],
                                            ["minutes", "Phút"],
                                            ["seconds", "Giây"]
                                        ].map(([unit, label]) => (
                                            <div key={unit} className={`countdown-box${unit === "seconds" ? " countdown-box-accent" : ""}`}>
                                                <strong key={`${unit}-${countdown[unit]}`} className="countdown-digit">
                                                    {String(countdown[unit]).padStart(2, "0")}
                                                </strong>
                                                <span>{t(label)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="featured-coming-soon">COMING SOON</div>
                            )}

                            <Link
                                to={
                                    featuredEvent.slug
                                        ? `/events/${featuredEvent.slug}`
                                        : "/events"
                                }
                                className="home-featured-button"
                            > {t("Xem thông tin chương trình")} </Link>

                        </div>
                    ))}

                </div>

            </section>

            <section
                id="concerts"
                className="home-section home-upcoming"
            >

                <div className="home-container">

                    <div className="home-section-heading">

                        <div>

                            <span> {t("Lịch Diễn Trong Năm")} </span>

                            <h2> {t("Concert Sắp Diễn Ra")} </h2>

                        </div>

                        <p> {t("Hãy chọn ngay vị trí đẹp nhất trong không gian để thưởng thức trọn vẹn chất lượng âm thanh của chương trình.")} </p>

                    </div>

                    <div className="home-events-grid">

                        {t(homepageEvents
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

                                                    {t(event.coverImage ? (

                                                        <ContentImage
                                                            src={getMediaUrl(
                                                                event.coverImage
                                                            )}
                                                            alt={
                                                                t(event.title)
                                                            }
                                                        />

                                                    ) : (

                                                        <div className="home-event-image-placeholder">
                                                            FYCE
                                                        </div>

                                                    ))}

                                                    {t(event.badge && (
                                                        <span className="home-event-badge">
                                                            {
                                                                t(event.badge)
                                                            }
                                                        </span>
                                                    ))}

                                                </div>

                                            </Link>

                                            <div className="home-event-content">

                                                <div className="home-event-date">

                                                    {t(event.startAt ? (

                                                        <>
                                                            <span>
                                                                {t(formatTime(
                                                                    event.startAt, locale
                                                                ))}
                                                            </span>

                                                            <span>
                                                                {t(" · ")}
                                                            </span>

                                                            <span>
                                                                {t(formatDate(
                                                                    event.startAt, locale
                                                                ))}
                                                            </span>
                                                        </>

                                                    ) : (

                                                        <span className="home-event-coming-soon">
                                                            COMING SOON
                                                        </span>

                                                    ))}

                                                </div>

                                                <h3>
                                                    {
                                                        t(event.title)
                                                    }
                                                </h3>

                                                <p>
                                                    {
                                                        t(event.shortDescription ||
                                                        "Thông tin chương trình sẽ được cập nhật.")
                                                    }
                                                </p>

                                                <div className="home-event-location">

                                                    {t(event.venue && (
                                                        <span>
                                                            {
                                                                t(event.venue)
                                                            }
                                                        </span>
                                                    ))}

                                                    {t(event.city && (
                                                        <span>
                                                            {t(event.venue
                                                                ? ", "
                                                                : "")}
                                                            {
                                                                t(event.city)
                                                            }
                                                        </span>
                                                    ))}

                                                </div>

                                                {t(event.conductor && (
                                                    <div className="home-event-conductor"> {t("Nhạc trưởng:")}{t(" ")}
                                                        {
                                                            t(event.conductor)
                                                        }
                                                    </div>
                                                ))}

                                            </div>

                                            <div className="home-event-footer">

                                                <div className="home-event-price">

                                                    <span>
                                                        {t(price !==
                                                        null
                                                            ? "Giá vé từ"
                                                            : "Thông tin vé")}
                                                    </span>

                                                    <strong>
                                                        {t(price !==
                                                        null
                                                            ? formatPrice(
                                                                  price, locale
                                                              )
                                                            : "COMING SOON")}
                                                    </strong>

                                                </div>

                                                <Link
                                                    to={`/events/${event.slug}`}
                                                    className="home-event-book-button"
                                                > {t("Xem chương trình")} </Link>

                                            </div>

                                        </article>
                                    );
                                }
                            ))}

                    </div>

                    {t(homepageEvents.length ===
                        0 && (
                        <div className="home-empty"> {t("Chưa có concert sắp diễn ra.")} </div>
                    ))}

                </div>

            </section>

            {t(about && (
                <section
                    id="about"
                    className="home-about"
                >

                    <div className="home-container home-about-grid">

                        <div className="home-about-image-wrapper">

                            <div className="home-about-image">

                                {t(about.image ? (

                                    <ContentImage
                                        src={getMediaUrl(
                                            about.image
                                        )}
                                        alt={
                                            t(about.imageAlt ||
                                            about.title)
                                        }
                                    />

                                ) : (

                                    <div className="home-about-image-placeholder">
                                        FYCE
                                    </div>

                                ))}

                            </div>

                            <div className="home-about-highlight">

                                <div className="home-about-highlight-icon">
                                    ♪
                                </div>

                                <strong> {t("Di Sản Sống")} </strong>

                                <p> {t("Nuôi dưỡng và truyền tải những giá trị âm nhạc qua từng thế hệ.")} </p>

                            </div>

                        </div>

                        <div className="home-about-content">

                            {t(about.eyebrow && (
                                <span className="home-about-eyebrow">
                                    {t(about.eyebrow)}
                                </span>
                            ))}

                            <h2>
                                {t(about.title)}
                            </h2>

                            {t(about.subtitle && (
                                <h3>
                                    {t(about.subtitle)}
                                </h3>
                            ))}

                            <p className="home-about-description">
                                {t(about.description)}
                            </p>

                            {t(about.features?.length >
                                0 && (

                                <div className="home-features">

                                    {t(about.features
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

                                                        {t(index ===
                                                        0
                                                            ? "✧"
                                                            : index ===
                                                              1
                                                            ? "♪"
                                                            : "◉")}

                                                    </div>

                                                    <h4>
                                                        {
                                                            t(feature.title)
                                                        }
                                                    </h4>

                                                    <p>
                                                        {
                                                            t(feature.description)
                                                        }
                                                    </p>

                                                </div>

                                            )
                                        ))}

                                </div>

                            ))}

                            {t(about.buttonText && (
                                <Link
                                    to={
                                        about.buttonLink ||
                                        "/about"
                                    }
                                    className="home-primary-button home-about-button"
                                >
                                    {
                                        t(about.buttonText)
                                    }
                                </Link>
                            ))}

                        </div>

                    </div>

                </section>
            ))}

            <section className="home-gallery" id="gallery">

                <div className="home-container">

                    <div className="home-gallery-heading">

                        <span> {t("Khoảnh Khắc Thăng Hoa")} </span>

                        <h2> {t("Hình Ảnh Hoạt Động & Hậu Trường")} </h2>

                        <p> {t("Từ những giờ phút miệt mài trong phòng tập đến sân khấu, mỗi khoảnh khắc đều là một phần câu chuyện của FYCE.")} </p>

                    </div>

                    <div className="home-gallery-grid">

                        {t(gallery
                            .map(
                                (
                                    item,
                                    index
                                ) => (

                                    <figure
                                        className={`home-gallery-item home-gallery-item-${index % 5 + 1}`}
                                        key={
                                            item._id ||
                                            index
                                        }
                                    >

                                        {t(item.image ? (

                                            <ContentImage
                                                loading="lazy"
                                                src={getMediaUrl(
                                                    item.image
                                                )}
                                                alt={
                                                    t(item.altText ||
                                                    item.title ||
                                                    "FYCE Gallery")
                                                }
                                            />

                                        ) : (

                                            <div className="home-gallery-placeholder">
                                                FYCE
                                            </div>

                                        ))}

                                        {t((item.title ||
                                            item.caption) && (

                                            <figcaption>

                                                {t(item.title && (
                                                    <strong>
                                                        {
                                                            t(item.title)
                                                        }
                                                    </strong>
                                                ))}

                                                {t(item.caption && (
                                                    <span>
                                                        {
                                                            t(item.caption)
                                                        }
                                                    </span>
                                                ))}

                                            </figcaption>

                                        ))}

                                    </figure>

                                )
                            ))}

                    </div>

                    {t(gallery.length ===
                        0 && (
                        <div className="home-empty"> {t("Chưa có hình ảnh hoạt động.")} </div>
                    ))}

                </div>

            </section>

        </div>
    );
};

export default Home;
