import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext.jsx";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from "@dnd-kit/core";

import {
    SortableContext,
    arrayMove,
    rectSwappingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
    createEvent,
    getAdminEvents,
    getAdminEventById,
    updateEvent,
    uploadImage,
    uploadVideo,
    cloneEventSeatSetup
} from "../../services/adminEvent.service.js";

import { getMediaUrl } from "../../utils/media.js";

import "../../pages/admin/events/AdminEventCreate.css";

const FYCE_VENUE_ID = "6aa2cce1bd78757dfd6e7022";
const FYCE_VENUE_LAYOUT_ID = "6aa2cce1bd78757dfd6e7023";
const FYCE_VENUE_NAME = "FYCE Concert Hall";

const resolveEntityId = (value) => {
    if (!value) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    return (
        value._id ||
        value.id ||
        value.$oid ||
        ""
    );
};


/* ============================================================
   HELPERS
   ============================================================ */

const createClientId = (prefix) =>
    `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;

const sanitizeInteger = (value) =>
    String(value ?? "").replace(/\D/g, "");

const toNumberOrNull = (value) => {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
};

const getCurrentDateTimeLocal = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        now.getDate()
    ).padStart(2, "0");
    const hours = String(
        now.getHours()
    ).padStart(2, "0");
    const minutes = String(
        now.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTimeLocal = (value) => {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        date.getDate()
    ).padStart(2, "0");
    const hours = String(
        date.getHours()
    ).padStart(2, "0");
    const minutes = String(
        date.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};


const resolveMediaPreviewUrl = (value) => {
    if (!value) {
        return "";
    }

    const normalized = String(value).trim();

    if (
        normalized.startsWith("blob:") ||
        normalized.startsWith("data:") ||
        /^https?:\/\//i.test(normalized)
    ) {
        return normalized;
    }

    return getMediaUrl(normalized);
};

const getYouTubeEmbedUrl = (value) => {
    if (!value) {
        return "";
    }

    try {
        const url = new URL(String(value).trim());
        const hostname = url.hostname.replace(/^www\./, "");

        if (hostname === "youtu.be") {
            const videoId = url.pathname.split("/").filter(Boolean)[0];
            return videoId
                ? `https://www.youtube.com/embed/${videoId}`
                : "";
        }

        if (
            hostname === "youtube.com" ||
            hostname === "m.youtube.com"
        ) {
            if (url.pathname === "/watch") {
                const videoId = url.searchParams.get("v");
                return videoId
                    ? `https://www.youtube.com/embed/${videoId}`
                    : "";
            }

            const pathParts = url.pathname.split("/").filter(Boolean);
            if (
                ["embed", "shorts", "live"].includes(pathParts[0]) &&
                pathParts[1]
            ) {
                return `https://www.youtube.com/embed/${pathParts[1]}`;
            }
        }
    } catch {
        return "";
    }

    return "";
};


/* ============================================================
   FACTORIES
   ============================================================ */

const createWork = (data = {}) => ({
    _dragId:
        data._dragId ||
        createClientId("work"),

    _id: data._id || null,

    order:
        data.order ??
        1,

    title:
        data.title ||
        "",

    subtitle:
        data.subtitle ||
        "",

    composer:
        data.composer ||
        "",

    durationMinutes:
        data.durationMinutes ??
        "",

    description:
        data.description ||
        ""
});

const createProgramPart = (data = {}) => ({
    _dragId:
        data._dragId ||
        createClientId("part"),

    _id: data._id || null,

    order:
        data.order ??
        1,

    title:
        data.title ||
        "",

    subtitle:
        data.subtitle ||
        "",

    description:
        data.description ||
        "",

    works:
        Array.isArray(data.works)
            ? data.works.map(
                  createWork
              )
            : []
});

const createArtist = (data = {}) => ({
    _dragId:
        data._dragId ||
        createClientId("artist"),

    _id: data._id || null,

    name:
        data.name ||
        "",

    role:
        data.role ||
        "",

    bio:
        data.bio ||
        "",

    image:
        data.image ||
        "",

    instrument:
        data.instrument ||
        ""
});

const createTicketCategory = (
    data = {}
) => ({
    _dragId:
        data._dragId ||
        createClientId("ticket"),

    _id: data._id || null,

    code:
        data.code ||
        "",

    name:
        data.name ||
        "",

    price:
        data.price ??
        "",

    colorCode:
        data.colorCode ||
        "#2D7F73",

    description:
        data.description ||
        "",

    benefits:
        Array.isArray(data.benefits)
            ? [...data.benefits]
            : [],

    maxPerOrder:
        data.maxPerOrder ??
        6,

    sortOrder:
        data.sortOrder ??
        0,

    isActive:
        data.isActive !== false
});

const createPolicy = (data = {}) => ({
    _dragId:
        data._dragId ||
        createClientId("policy"),

    _id: data._id || null,

    title:
        data.title ||
        "",

    description:
        data.description ||
        "",

    icon:
        data.icon ||
        "",

    type:
        data.type ||
        "general",

    sortOrder:
        data.sortOrder ??
        0
});

const createGalleryItem = (
    data = {},
    prefix = "gallery"
) => ({
    _dragId:
        data._dragId ||
        createClientId(prefix),

    _id: data._id || null,

    image:
        data.image ||
        "",

    caption:
        data.caption ||
        "",

    sortOrder:
        data.sortOrder ??
        0
});


const createInitialForm = () => ({
    title: "",
    badge: "",
    shortDescription: "",
    description: "",
    subtitle: "",

    coverImage: "",
    heroVideoUrl: "",
    trailerVideoUrl: "",

    startAt: "",
    endAt: "",
    bookingOpenAt: "",
    bookingCloseAt: "",

    venue: FYCE_VENUE_NAME,
    venueId: FYCE_VENUE_ID,
    venueLayoutId: FYCE_VENUE_LAYOUT_ID,
    address: "",
    city: "",
    venueDescription: "",

    seatingChartImage: "",
    totalTickets: 0,

    ticketCategories: [],

    programParts: [],

    artists: [],

    policies: [],

    programGallery: [],

    backstageGallery: [],

    conductor: "",

    status: "draft",
    isFeatured: false,
    allowBooking: true,

    isComingSoon: false
});


/* ============================================================
   MAP EXISTING EVENT
   ============================================================ */

const mapEventToForm = (event) => {
    const programParts =
        Array.isArray(
            event?.programParts
        )
            ? event.programParts.map(
                  createProgramPart
              )
            : [];

    /*
     * Backward compatibility:
     * event cũ có movements thì chuyển
     * thành Part I.
     */
    if (
        programParts.length === 0 &&
        Array.isArray(
            event?.movements
        ) &&
        event.movements.length > 0
    ) {
        programParts.push(
            createProgramPart({
                order: 1,
                title: "Phần I",
                subtitle: "",
                description: "",
                works:
                    event.movements.map(
                        (movement) =>
                            createWork({
                                order:
                                    movement.order,
                                title:
                                    movement.title,
                                subtitle:
                                    movement.subtitle,
                                composer:
                                    movement.composer,
                                durationMinutes:
                                    movement.durationMinutes,
                                description:
                                    movement.description
                            })
                    )
            })
        );
    }

    let programGallery =
        Array.isArray(
            event?.programGallery
        )
            ? event.programGallery.map(
                  (item) =>
                      createGalleryItem(
                          item,
                          "program-gallery"
                      )
              )
            : [];

    /*
     * Gallery cũ chỉ fallback sang
     * programGallery.
     */
    if (
        programGallery.length === 0 &&
        Array.isArray(event?.gallery) &&
        event.gallery.length > 0
    ) {
        programGallery =
            event.gallery.map(
                (item) =>
                    createGalleryItem(
                        item,
                        "program-gallery"
                    )
            );
    }

    const backstageGallery =
        Array.isArray(
            event?.backstageGallery
        )
            ? event.backstageGallery.map(
                  (item) =>
                      createGalleryItem(
                          item,
                          "backstage-gallery"
                      )
              )
            : [];

    return {
        title:
            event?.title ||
            "",

        badge:
            event?.badge ||
            "",

        shortDescription:
            event?.shortDescription ||
            "",

        description:
            event?.description ||
            "",

        subtitle:
            event?.subtitle ||
            "",

        coverImage:
            event?.coverImage ||
            "",

        heroVideoUrl:
            event?.heroVideoUrl ||
            "",

        trailerVideoUrl:
            event?.trailerVideoUrl ||
            "",

        startAt:
            formatDateTimeLocal(
                event?.startAt
            ),

        endAt:
            formatDateTimeLocal(
                event?.endAt
            ),

        bookingOpenAt:
            formatDateTimeLocal(
                event?.bookingOpenAt
            ),

        bookingCloseAt:
            formatDateTimeLocal(
                event?.bookingCloseAt
            ),

        venue:
            event?.venue ||
            FYCE_VENUE_NAME,

        venueId:
            event?.venueId?._id ||
            event?.venueId ||
            FYCE_VENUE_ID,

        venueLayoutId:
            event?.venueLayoutId?._id ||
            event?.venueLayoutId ||
            FYCE_VENUE_LAYOUT_ID,

        address:
            event?.address ||
            "",

        city:
            event?.city ||
            "",

        venueDescription:
            event?.venueDescription ||
            "",

        seatingChartImage:
            event?.seatingChartImage ||
            "",

        totalTickets:
            event?.totalTickets ??
            0,

        ticketCategories:
            Array.isArray(
                event?.ticketCategories
            )
                ? event.ticketCategories.map(
                      createTicketCategory
                  )
                : [],

        programParts,

        artists:
            Array.isArray(
                event?.artists
            )
                ? event.artists.map(
                      createArtist
                  )
                : [],

        policies:
            Array.isArray(
                event?.policies
            )
                ? event.policies.map(
                      createPolicy
                  )
                : [],

        programGallery,

        backstageGallery,

        conductor:
            event?.conductor ||
            "",

        status:
            event?.status ||
            "draft",

        isFeatured:
            Boolean(
                event?.isFeatured
            ),

        allowBooking:
            event?.allowBooking !==
            false,

        isComingSoon:
            !event?.startAt
    };
};


/* ============================================================
   VALIDATION
   ============================================================ */

const validateForm = (form) => {
    const errors = {};

    if (!form.title.trim()) {
        errors.title =
            "Vui lòng nhập tên concert.";
    }

    if (!form.venue.trim()) {
        errors.venue =
            "Vui lòng nhập địa điểm.";
    }

    /*
     * Coming Soon
     */
    if (form.isComingSoon) {
        if (form.allowBooking) {
            errors.allowBooking =
                "Concert Coming Soon chưa thể mở đặt vé.";
        }

        return errors;
    }

    // datetime-local chỉ có độ chính xác đến phút.
    // Làm tròn thời điểm hiện tại xuống đầu phút để người dùng
    // vẫn có thể chọn đúng phút hiện tại (>= hiện tại theo UI).
    const now = new Date();
    now.setSeconds(0, 0);

    const parseFormDateTime = (value) => {
        if (!value) {
            return null;
        }

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? null
            : date;
    };

    const startAt =
        parseFormDateTime(form.startAt);

    const endAt =
        parseFormDateTime(form.endAt);

    const bookingOpenAt =
        parseFormDateTime(
            form.bookingOpenAt
        );

    const bookingCloseAt =
        parseFormDateTime(
            form.bookingCloseAt
        );

    if (!form.startAt) {
        errors.startAt =
            "Vui lòng nhập thời gian bắt đầu.";
    } else if (!startAt) {
        errors.startAt =
            "Thời gian bắt đầu không đúng định dạng.";
    } else if (startAt < now) {
        errors.startAt =
            "Thời gian bắt đầu không được trước thời điểm hiện tại.";
    }

    if (!form.endAt) {
        errors.endAt =
            "Vui lòng nhập thời gian kết thúc.";
    } else if (!endAt) {
        errors.endAt =
            "Thời gian kết thúc không đúng định dạng.";
    } else if (endAt < now) {
        errors.endAt =
            "Thời gian kết thúc không được trước thời điểm hiện tại.";
    } else if (
        startAt &&
        endAt <= startAt
    ) {
        errors.endAt =
            "Thời gian kết thúc phải sau thời gian bắt đầu.";
    }

    if (!form.bookingOpenAt) {
        errors.bookingOpenAt =
            "Vui lòng nhập thời gian mở bán.";
    } else if (!bookingOpenAt) {
        errors.bookingOpenAt =
            "Thời gian mở bán không đúng định dạng.";
    } else if (
        bookingOpenAt < now
    ) {
        errors.bookingOpenAt =
            "Thời gian mở bán không được trước thời điểm hiện tại.";
    } else if (
        startAt &&
        bookingOpenAt >= startAt
    ) {
        errors.bookingOpenAt =
            "Thời gian mở bán phải trước thời gian bắt đầu concert.";
    }

    if (!form.bookingCloseAt) {
        errors.bookingCloseAt =
            "Vui lòng nhập thời gian đóng bán.";
    } else if (!bookingCloseAt) {
        errors.bookingCloseAt =
            "Thời gian đóng bán không đúng định dạng.";
    } else if (bookingCloseAt < now) {
        errors.bookingCloseAt =
            "Thời gian đóng bán không được trước thời điểm hiện tại.";
    } else {
        if (
            bookingOpenAt &&
            bookingCloseAt <=
                bookingOpenAt
        ) {
            errors.bookingCloseAt =
                "Thời gian đóng bán phải sau thời gian mở bán.";
        }

        if (
            startAt &&
            bookingCloseAt >
                startAt
        ) {
            errors.bookingCloseAt =
                "Thời gian đóng bán phải trước hoặc bằng thời gian bắt đầu concert.";
        }
    }

    /*
     * Validate program
     */
    form.programParts.forEach(
        (part, partIndex) => {
            if (!part.title.trim()) {
                errors[
                    `programPart-${partIndex}`
                ] =
                    "Tên phần chương trình không được để trống.";
            }

            part.works.forEach(
                (
                    work,
                    workIndex
                ) => {
                    if (
                        !work.title.trim()
                    ) {
                        errors[
                            `work-${partIndex}-${workIndex}`
                        ] =
                            "Tên tác phẩm không được để trống.";
                    }
                }
            );
        }
    );

    /*
     * Validate artists
     */
    form.artists.forEach(
        (
            artist,
            index
        ) => {
            if (!artist.name.trim()) {
                errors[
                    `artist-name-${index}`
                ] =
                    "Vui lòng nhập tên nghệ sĩ.";
            }

            if (!artist.role.trim()) {
                errors[
                    `artist-role-${index}`
                ] =
                    "Vui lòng nhập vai trò nghệ sĩ.";
            }
        }
    );

    /*
     * Validate ticket categories
     */
    const ticketCodes =
        form.ticketCategories
            .map((item) =>
                item.code
                    .trim()
                    .toUpperCase()
            )
            .filter(Boolean);

    const duplicateCodes =
        ticketCodes.filter(
            (
                code,
                index
            ) =>
                ticketCodes.indexOf(
                    code
                ) !== index
        );

    if (
        duplicateCodes.length >
        0
    ) {
        errors.ticketCategories =
            "Mã hạng vé không được trùng nhau.";
    }

    if (!form.isComingSoon && form.allowBooking && form.ticketCategories.length === 0) {
        errors.ticketCategories =
            "Khi cho phép đặt vé, cần có ít nhất một hạng vé.";
    }

    form.ticketCategories.forEach((category, index) => {
        if (!category.code.trim()) {
            errors[`ticket-code-${index}`] =
                "Vui lòng nhập mã hạng vé.";
        } else if (!/^[A-Za-z0-9_-]{2,30}$/.test(category.code.trim())) {
            errors[`ticket-code-${index}`] =
                "Mã vé chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.";
        }

        if (!category.name.trim()) {
            errors[`ticket-name-${index}`] =
                "Vui lòng nhập tên hạng vé.";
        }

        const price = Number(category.price);
        if (!Number.isFinite(price) || price < 0) {
            errors[`ticket-price-${index}`] =
                "Giá vé không được âm.";
        }

        const maxPerOrder = Number(category.maxPerOrder);
        if (!Number.isInteger(maxPerOrder) || maxPerOrder < 1) {
            errors[`ticket-max-${index}`] =
                "Số vé tối đa mỗi đơn phải ít nhất là 1.";
        }
    });

    form.programGallery.forEach((item, index) => {
        if (!item.image.trim()) {
            errors[`program-gallery-${index}`] =
                "Hình ảnh chương trình chưa có ảnh.";
        }
    });

    form.backstageGallery.forEach((item, index) => {
        if (!item.image.trim()) {
            errors[`backstage-gallery-${index}`] =
                "Hình ảnh hậu trường chưa có ảnh.";
        }
    });

    return errors;
};


/* ============================================================
   BUILD PAYLOAD
   ============================================================ */

const buildPayload = (form) => {
    return {
        title:
            form.title.trim(),

        badge:
            form.badge.trim(),

        shortDescription:
            form.shortDescription.trim(),

        description:
            form.description.trim(),

        subtitle:
            form.subtitle.trim(),

        coverImage:
            form.coverImage.trim(),

        heroVideoUrl:
            form.heroVideoUrl.trim(),

        trailerVideoUrl:
            form.trailerVideoUrl.trim(),

        startAt:
            form.isComingSoon
                ? null
                : form.startAt
                ? new Date(
                      form.startAt
                  ).toISOString()
                : null,

        endAt:
            form.isComingSoon
                ? null
                : form.endAt
                ? new Date(
                      form.endAt
                  ).toISOString()
                : null,

        bookingOpenAt:
            form.isComingSoon
                ? null
                : form.bookingOpenAt
                ? new Date(
                      form.bookingOpenAt
                  ).toISOString()
                : null,

        bookingCloseAt:
            form.isComingSoon
                ? null
                : form.bookingCloseAt
                ? new Date(
                      form.bookingCloseAt
                  ).toISOString()
                : null,

        venue:
            form.venue.trim() ||
            FYCE_VENUE_NAME,

        venueId:
            form.venueId ||
            FYCE_VENUE_ID,

        venueLayoutId:
            form.venueLayoutId ||
            FYCE_VENUE_LAYOUT_ID,

        address:
            form.address.trim(),

        city:
            form.city.trim(),

        venueDescription:
            form.venueDescription.trim(),

        seatingChartImage:
            form.seatingChartImage.trim(),

        totalTickets:
            form.isComingSoon
                ? 0
                : Number(
                      form.totalTickets ||
                          0
                  ),

        ticketCategories:
            form.ticketCategories.map(
                (
                    category,
                    index
                ) => ({
                    ...(category._id
                        ? {
                              _id:
                                  category._id
                          }
                        : {}),

                    code:
                        category.code
                            .trim()
                            .toUpperCase(),

                    name:
                        category.name.trim(),

                    price:
                        Number(
                            category.price ||
                                0
                        ),

                    colorCode:
                        category.colorCode,

                    description:
                        category.description.trim(),

                    benefits:
                        category.benefits.filter(
                            (
                                benefit
                            ) =>
                                benefit.trim()
                        ),


                    maxPerOrder:
                        Number(
                            category.maxPerOrder ||
                                1
                        ),

                    sortOrder:
                        index,

                    isActive:
                        category.isActive !==
                        false
                })
            ),

        programParts:
            form.programParts.map(
                (
                    part,
                    partIndex
                ) => ({
                    order:
                        partIndex +
                        1,

                    title:
                        part.title.trim(),

                    subtitle:
                        part.subtitle.trim(),

                    description:
                        part.description.trim(),

                    works:
                        part.works.map(
                            (
                                work,
                                workIndex
                            ) => ({
                                order:
                                    workIndex +
                                    1,

                                title:
                                    work.title.trim(),

                                subtitle:
                                    work.subtitle.trim(),

                                composer:
                                    work.composer.trim(),

                                durationMinutes:
                                    toNumberOrNull(
                                        work.durationMinutes
                                    ),

                                description:
                                    work.description.trim()
                            })
                        )
                })
            ),

        artists:
            form.artists.map(
                (artist) => ({
                    name:
                        artist.name.trim(),

                    role:
                        artist.role.trim(),

                    bio:
                        artist.bio.trim(),

                    image:
                        artist.image.trim(),

                    instrument:
                        artist.instrument.trim()
                })
            ),

        policies:
            form.policies.map(
                (
                    policy,
                    index
                ) => ({
                    title:
                        policy.title.trim(),

                    description:
                        policy.description.trim(),

                    icon:
                        policy.icon.trim(),

                    type:
                        policy.type,

                    sortOrder:
                        index
                })
            ),

        programGallery:
            form.programGallery.map(
                (
                    item,
                    index
                ) => ({
                    image:
                        item.image.trim(),

                    caption:
                        item.caption.trim(),

                    sortOrder:
                        index
                })
            ),

        backstageGallery:
            form.backstageGallery.map(
                (
                    item,
                    index
                ) => ({
                    image:
                        item.image.trim(),

                    caption:
                        item.caption.trim(),

                    sortOrder:
                        index
                })
            ),

        conductor:
            form.conductor.trim(),

        status:
            form.status,

        isFeatured:
            Boolean(
                form.isFeatured
            ),

        allowBooking:
            form.isComingSoon
                ? false
                : Boolean(
                      form.allowBooking
                  )
    };
};


/* ============================================================
   SORTABLE CARD
   ============================================================ */

const SortableCard = ({
    id,
    children,
    className = ""
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id
    });

    const style = {
        transform:
            CSS.Transform.toString(
                transform
            ),
        transition,
        opacity:
            isDragging
                ? 0.72
                : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`admin-event-sortable-layout ${
                isDragging
                    ? "admin-event-sortable-dragging"
                    : ""
            } ${className}`}
            {...attributes}
        >
            <button
                type="button"
                className="admin-event-drag-handle"
                {...listeners}
                aria-label="Kéo để sắp xếp"
            >
                <span />
                <span />
                <span />
            </button>

            <div className="admin-event-sortable-content">
                {children}
            </div>
        </div>
    );
};


/* ============================================================
   FIELD ERROR
   ============================================================ */

const FieldError = ({
    error
}) => {
    if (!error) {
        return null;
    }

    return (
        <small className="admin-event-field-error">
            {error}
        </small>
    );
};


const VideoPreview = ({
    value,
    title = "Video preview"
}) => {
    if (!value) {
        return null;
    }

    const youtubeEmbedUrl =
        getYouTubeEmbedUrl(value);

    return (
        <div className="admin-event-video-preview">
            {youtubeEmbedUrl ? (
                <iframe
                    src={youtubeEmbedUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            ) : (
                <video
                    controls
                    preload="metadata"
                    src={resolveMediaPreviewUrl(value)}
                >
                    Trình duyệt của bạn không hỗ trợ xem trước video.
                </video>
            )}
        </div>
    );
};


/* ============================================================
   GALLERY SECTION
   ============================================================ */

const GallerySection = ({
    number,
    title,
    description,
    gallery,
    onAdd,
    onRemove,
    onReorder,
    onUpdate,
    onUpload
}) => {
    const sensors =
        useSensors(
            useSensor(
                PointerSensor,
                {
                    activationConstraint:
                        {
                            distance: 8
                        }
                }
            ),

            useSensor(
                KeyboardSensor,
                {
                    coordinateGetter:
                        sortableKeyboardCoordinates
                }
            )
        );

    const handleDragEnd =
        (event) => {
            const {
                active,
                over
            } = event;

            if (
                !over ||
                active.id ===
                    over.id
            ) {
                return;
            }

            const oldIndex =
                gallery.findIndex(
                    (
                        item
                    ) =>
                        item._dragId ===
                        active.id
                );

            const newIndex =
                gallery.findIndex(
                    (
                        item
                    ) =>
                        item._dragId ===
                        over.id
                );

            if (
                oldIndex ===
                    -1 ||
                newIndex ===
                    -1
            ) {
                return;
            }

            onReorder(
                oldIndex,
                newIndex
            );
        };

    return (
        <section className="admin-event-form-section">
            <div className="admin-event-section-heading">
                <span className="admin-event-section-number">
                    {number}
                </span>

                <div>
                    <h2>
                        {title}
                    </h2>

                    <p>
                        {description}
                    </p>
                </div>

            </div>

            <DndContext
                sensors={
                    sensors
                }
                collisionDetection={
                    closestCenter
                }
                onDragEnd={
                    handleDragEnd
                }
            >
                <SortableContext
                    items={gallery.map(
                        (
                            item
                        ) =>
                            item._dragId
                    )}
                    strategy={
                        rectSwappingStrategy
                    }
                >
                    <div className="admin-event-gallery-form-list">
                        {gallery.map(
                            (
                                item,
                                index
                            ) => (
                                <SortableCard
                                    key={
                                        item._dragId
                                    }
                                    id={
                                        item._dragId
                                    }
                                    className="admin-event-gallery-form-card"
                                >
                                    <div className="admin-event-dynamic-card-header">
                                        <div>
                                            <span>
                                                ẢNH{" "}
                                                {index +
                                                    1}
                                            </span>

                                            <strong>
                                                {item.caption ||
                                                    "Hình ảnh mới"}
                                            </strong>
                                        </div>

                                        <button
                                            type="button"
                                            className="admin-event-danger-button"
                                            onClick={() =>
                                                onRemove(
                                                    index
                                                )
                                            }
                                        >
                                            Xóa
                                        </button>
                                    </div>

                                    <div className="admin-event-create-grid">
                                        <label className="admin-event-field admin-event-field-full">
                                            <span>
                                                Đường dẫn ảnh
                                            </span>

                                            <div className="admin-event-upload-row">
                                                <input
                                                    type="text"
                                                    value={
                                                        item.image
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        onUpdate(
                                                            index,
                                                            "image",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    placeholder="/uploads/images/events/image.jpg"
                                                />

                                                <label className="admin-event-upload-button">
                                                    Upload
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        hidden
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            onUpload(
                                                                event
                                                                    .target
                                                                    .files?.[0],
                                                                (
                                                                    url
                                                                ) =>
                                                                    onUpdate(
                                                                        index,
                                                                        "image",
                                                                        url
                                                                    )
                                                            )
                                                        }
                                                    />
                                                </label>
                                            </div>

                                            {item.image && (
                                                <div className="admin-event-gallery-preview">
                                                    <img
                                                        src={getMediaUrl(
                                                            item.image
                                                        )}
                                                        alt={
                                                            item.caption ||
                                                            title
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </label>

                                        <label className="admin-event-field admin-event-field-full">
                                            <span>
                                                Caption
                                            </span>

                                            <input
                                                type="text"
                                                value={
                                                    item.caption
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    onUpdate(
                                                        index,
                                                        "caption",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                maxLength={
                                                    500
                                                }
                                            />
                                        </label>
                                    </div>
                                </SortableCard>
                            )
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            {gallery.length ===
                0 && (
                <div className="admin-event-empty-state">
                    Chưa có hình ảnh.
                </div>
            )}

            <div className="admin-event-add-action">
                <button
                    type="button"
                    className="admin-event-secondary-button admin-event-add-button"
                    onClick={onAdd}
                >
                    + Thêm ảnh
                </button>
            </div>
        </section>
    );
};


/* ============================================================
   EVENT FORM
   ============================================================ */

const EventForm = ({
    mode = "create",
    eventId = null
}) => {
    const navigate =
        useNavigate();

    const {
        accessToken
    } = useAuth();

    const [form, setForm] =
        useState(
            createInitialForm()
        );

    const [
        fieldErrors,
        setFieldErrors
    ] = useState({});

    const [
        touched,
        setTouched
    ] = useState({});

    const [
        submitted,
        setSubmitted
    ] = useState(false);

    const [
        loading,
        setLoading
    ] = useState(
        mode === "edit"
    );

    const [
        saving,
        setSaving
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        success,
        setSuccess
    ] = useState("");

    const [
        uploadLoading,
        setUploadLoading
    ] = useState("");

    const [
        localVideoPreview,
        setLocalVideoPreview
    ] = useState("");

    const [
        localVideoName,
        setLocalVideoName
    ] = useState("");

    const [
        localTrailerVideoPreview,
        setLocalTrailerVideoPreview
    ] = useState("");

    const [
        localTrailerVideoName,
        setLocalTrailerVideoName
    ] = useState("");

    const [
        scheduleBackup,
        setScheduleBackup
    ] = useState(null);

    const [
        seatCloneSources,
        setSeatCloneSources
    ] = useState([]);

    const [
        seatCloneSourceId,
        setSeatCloneSourceId
    ] = useState("");

    const [
        seatCloneLoading,
        setSeatCloneLoading
    ] = useState(false);

    const [
        seatCloneMessage,
        setSeatCloneMessage
    ] = useState("");

    const [
        seatCloneError,
        setSeatCloneError
    ] = useState("");

    const isEdit =
        mode === "edit";
const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8
        }
    }),
    useSensor(KeyboardSensor, {
        coordinateGetter:
            sortableKeyboardCoordinates
    })
);
    const minDateTime =
        getCurrentDateTimeLocal();

    useEffect(() => {
        return () => {
            if (
                localVideoPreview &&
                localVideoPreview.startsWith("blob:")
            ) {
                URL.revokeObjectURL(localVideoPreview);
            }
        };
    }, [localVideoPreview]);

    useEffect(() => {
        return () => {
            if (
                localTrailerVideoPreview &&
                localTrailerVideoPreview.startsWith(
                    "blob:"
                )
            ) {
                URL.revokeObjectURL(
                    localTrailerVideoPreview
                );
            }
        };
    }, [localTrailerVideoPreview]);


    /* ----------------------------------------------------------
       LOAD
       ---------------------------------------------------------- */

    useEffect(() => {
        if (
            !isEdit ||
            !eventId ||
            !accessToken
        ) {
            return;
        }

        let mounted = true;

        const loadEvent =
            async () => {
                try {
                    setLoading(
                        true
                    );
                    setError("");

                    const result =
                        await getAdminEventById(
                            eventId,
                            accessToken
                        );

                    const event =
                        result?.data?.event ||
                        result?.event ||
                        result?.data;

                    if (!event) {
                        throw new Error(
                            "Không tìm thấy concert."
                        );
                    }

                    if (mounted) {
                        setForm(
                            mapEventToForm(
                                event
                            )
                        );
                    }
                } catch (
                    loadError
                ) {
                    console.error(
                        "Load event error:",
                        loadError
                    );

                    if (mounted) {
                        setError(
                            loadError.message ||
                                "Không thể tải concert."
                        );
                    }
                } finally {
                    if (mounted) {
                        setLoading(
                            false
                        );
                    }
                }
            };

        loadEvent();

        return () => {
            mounted = false;
        };
    }, [
        isEdit,
        eventId,
        accessToken
    ]);

    useEffect(() => {
        if (
            !isEdit ||
            !eventId ||
            !accessToken
        ) {
            return;
        }

        let mounted = true;

        const loadSeatCloneSources =
            async () => {
                try {
                    const result =
                        await getAdminEvents(
                            accessToken
                        );

                    const events =
                        result?.data?.events ||
                        result?.events ||
                        [];

                    const currentLayoutId =
                        resolveEntityId(
                            form.venueLayoutId
                        );

                    const sources =
                        Array.isArray(events)
                            ? events
                                  .filter(
                                      (item) =>
                                          String(
                                              resolveEntityId(
                                                  item?._id
                                              )
                                          ) !==
                                          String(eventId)
                                  )
                                  .filter(
                                      (item) => {
                                          if (
                                              !currentLayoutId
                                          ) {
                                              return true;
                                          }

                                          return (
                                              String(
                                                  resolveEntityId(
                                                      item?.venueLayoutId
                                                  )
                                              ) ===
                                              String(
                                                  currentLayoutId
                                              )
                                          );
                                      }
                                  )
                                  .sort(
                                      (
                                          first,
                                          second
                                      ) =>
                                          new Date(
                                              first?.startAt ||
                                                  0
                                          ) -
                                          new Date(
                                              second?.startAt ||
                                                  0
                                          )
                                  )
                            : [];

                    if (!mounted) {
                        return;
                    }

                    setSeatCloneSources(
                        sources
                    );

                    setSeatCloneSourceId(
                        (
                            previous
                        ) => {
                            if (
                                previous &&
                                sources.some(
                                    (item) =>
                                        String(
                                            resolveEntityId(
                                                item?._id
                                            )
                                        ) ===
                                        String(
                                            previous
                                        )
                                )
                            ) {
                                return previous;
                            }

                            return sources.length ===
                                1
                                ? String(
                                      resolveEntityId(
                                          sources[0]?._id
                                      )
                                  )
                                : "";
                        }
                    );
                } catch (
                    sourceError
                ) {
                    console.error(
                        "Load clone-source events error:",
                        sourceError
                    );

                    if (mounted) {
                        setSeatCloneError(
                            sourceError.message ||
                                "Không thể tải danh sách concert nguồn."
                        );
                    }
                }
            };

        loadSeatCloneSources();

        return () => {
            mounted = false;
        };
    }, [
        isEdit,
        eventId,
        accessToken,
        form.venueLayoutId
    ]);


    /* ----------------------------------------------------------
       COMMON FORM UPDATE
       ---------------------------------------------------------- */

    const markTouched =
        (field) => {
            setTouched(
                (
                    previous
                ) => ({
                    ...previous,
                    [field]:
                        true
                })
            );
        };

    const showError =
        (field) =>
            Boolean(
                fieldErrors[field] &&
                (submitted ||
                    touched[field])
            );

    const updateForm = (
        field,
        value
    ) => {
        const nextForm = {
            ...form,
            [field]:
                value
        };

        setForm(
            nextForm
        );

        setFieldErrors(
            validateForm(
                nextForm
            )
        );

        setError("");
        setSuccess("");
    };


    /* ----------------------------------------------------------
       PROGRAM UPDATE
       ---------------------------------------------------------- */

    const updateProgramPart =
        (
            index,
            field,
            value
        ) => {
            setForm(
                (previous) => {
                    const parts = [
                        ...previous.programParts
                    ];

                    parts[index] =
                        {
                            ...parts[
                                index
                            ],
                            [field]:
                                value
                        };

                    return {
                        ...previous,
                        programParts:
                            parts
                    };
                }
            );
        };

    const updateWork = (
        partIndex,
        workIndex,
        field,
        value
    ) => {
        setForm(
            (previous) => {
                const parts = [
                    ...previous.programParts
                ];

                const part =
                    {
                        ...parts[
                            partIndex
                        ]
                    };

                const works = [
                    ...part.works
                ];

                works[
                    workIndex
                ] = {
                    ...works[
                        workIndex
                    ],
                    [field]:
                        value
                };

                parts[
                    partIndex
                ] = {
                    ...part,
                    works
                };

                return {
                    ...previous,
                    programParts:
                        parts
                };
            }
        );
    };

    const addProgramPart =
        () => {
            setForm(
                (previous) => ({
                    ...previous,
                    programParts: [
                        ...previous.programParts,
                        createProgramPart({
                            order:
                                previous
                                    .programParts
                                    .length +
                                1,
                            title:
                                `Phần ${
                                    previous
                                        .programParts
                                        .length +
                                    1
                                }`
                        })
                    ]
                })
            );
        };

    const removeProgramPart =
        (
            index
        ) => {
            setForm(
                (previous) => ({
                    ...previous,
                    programParts:
                        previous.programParts.filter(
                            (
                                _,
                                itemIndex
                            ) =>
                                itemIndex !==
                                index
                        )
                })
            );
        };

    const addWork =
        (partIndex) => {
            setForm(
                (previous) => {
                    const parts = [
                        ...previous.programParts
                    ];

                    const part =
                        parts[
                            partIndex
                        ];

                    parts[
                        partIndex
                    ] = {
                        ...part,
                        works: [
                            ...part.works,
                            createWork({
                                order:
                                    part
                                        .works
                                        .length +
                                    1
                            })
                        ]
                    };

                    return {
                        ...previous,
                        programParts:
                            parts
                    };
                }
            );
        };

    const removeWork =
        (
            partIndex,
            workIndex
        ) => {
            setForm(
                (previous) => {
                    const parts = [
                        ...previous.programParts
                    ];

                    const part =
                        parts[
                            partIndex
                        ];

                    parts[
                        partIndex
                    ] = {
                        ...part,
                        works:
                            part.works.filter(
                                (
                                    _,
                                    index
                                ) =>
                                    index !==
                                    workIndex
                            )
                    };

                    return {
                        ...previous,
                        programParts:
                            parts
                    };
                }
            );
        };


    /* ----------------------------------------------------------
       PROGRAM PART DRAG
       ---------------------------------------------------------- */

    const handleProgramPartDragEnd =
        (event) => {
            const {
                active,
                over
            } = event;

            if (
                !over ||
                active.id ===
                    over.id
            ) {
                return;
            }

            setForm(
                (previous) => {
                    const oldIndex =
                        previous.programParts.findIndex(
                            (
                                item
                            ) =>
                                item._dragId ===
                                active.id
                        );

                    const newIndex =
                        previous.programParts.findIndex(
                            (
                                item
                            ) =>
                                item._dragId ===
                                over.id
                        );

                    if (
                        oldIndex ===
                            -1 ||
                        newIndex ===
                            -1
                    ) {
                        return previous;
                    }

                    return {
                        ...previous,
                        programParts:
                            arrayMove(
                                previous.programParts,
                                oldIndex,
                                newIndex
                            )
                    };
                }
            );
        };


    /* ----------------------------------------------------------
       WORK DRAG
       ---------------------------------------------------------- */

    const handleWorkDragEnd =
        (
            partIndex,
            event
        ) => {
            const {
                active,
                over
            } = event;

            if (
                !over ||
                active.id ===
                    over.id
            ) {
                return;
            }

            setForm(
                (previous) => {
                    const parts = [
                        ...previous.programParts
                    ];

                    const works = [
                        ...parts[
                            partIndex
                        ].works
                    ];

                    const oldIndex =
                        works.findIndex(
                            (
                                item
                            ) =>
                                item._dragId ===
                                active.id
                        );

                    const newIndex =
                        works.findIndex(
                            (
                                item
                            ) =>
                                item._dragId ===
                                over.id
                        );

                    if (
                        oldIndex ===
                            -1 ||
                        newIndex ===
                            -1
                    ) {
                        return previous;
                    }

                    parts[
                        partIndex
                    ] = {
                        ...parts[
                            partIndex
                        ],
                        works:
                            arrayMove(
                                works,
                                oldIndex,
                                newIndex
                            )
                    };

                    return {
                        ...previous,
                        programParts:
                            parts
                    };
                }
            );
        };


    /* ----------------------------------------------------------
       ARTISTS
       ---------------------------------------------------------- */

    const updateArtist = (
        index,
        field,
        value
    ) => {
        setForm(
            (previous) => {
                const artists = [
                    ...previous.artists
                ];

                artists[index] =
                    {
                        ...artists[
                            index
                        ],
                        [field]:
                            value
                    };

                return {
                    ...previous,
                    artists
                };
            }
        );
    };

    const addArtist =
        () => {
            setForm(
                (previous) => ({
                    ...previous,
                    artists: [
                        ...previous.artists,
                        createArtist()
                    ]
                })
            );
        };

    const removeArtist =
        (index) => {
            setForm(
                (previous) => ({
                    ...previous,
                    artists:
                        previous.artists.filter(
                            (
                                _,
                                itemIndex
                            ) =>
                                itemIndex !==
                                index
                        )
                })
            );
        };

    const handleArtistDragEnd =
        (event) => {
            const {
                active,
                over
            } = event;

            if (
                !over ||
                active.id ===
                    over.id
            ) {
                return;
            }

            setForm(
                (previous) => {
                    const oldIndex =
                        previous.artists.findIndex(
                            (
                                item
                            ) =>
                                item._dragId ===
                                active.id
                        );

                    const newIndex =
                        previous.artists.findIndex(
                            (
                                item
                            ) =>
                                item._dragId ===
                                over.id
                        );

                    if (
                        oldIndex ===
                            -1 ||
                        newIndex ===
                            -1
                    ) {
                        return previous;
                    }

                    return {
                        ...previous,
                        artists:
                            arrayMove(
                                previous.artists,
                                oldIndex,
                                newIndex
                            )
                    };
                }
            );
        };


    /* ----------------------------------------------------------
       TICKET CATEGORIES
       ---------------------------------------------------------- */

    const updateTicketCategory =
        (
            index,
            field,
            value
        ) => {
            setForm(
                (previous) => {
                    const categories =
                        [
                            ...previous.ticketCategories
                        ];

                    categories[
                        index
                    ] = {
                        ...categories[
                            index
                        ],
                        [field]:
                            value
                    };

                    return {
                        ...previous,
                        ticketCategories:
                            categories
                    };
                }
            );
        };

    const addTicketCategory =
        () => {
            setForm(
                (previous) => ({
                    ...previous,
                    ticketCategories: [
                        ...previous.ticketCategories,
                        createTicketCategory()
                    ]
                })
            );
        };

    const removeTicketCategory =
        (
            index
        ) => {
            setForm(
                (previous) => ({
                    ...previous,
                    ticketCategories:
                        previous.ticketCategories.filter(
                            (
                                _,
                                itemIndex
                            ) =>
                                itemIndex !==
                                index
                        )
                })
            );
        };

    const updateTicketBenefit = (
        categoryIndex,
        benefitIndex,
        value
    ) => {
        setForm((previous) => {
            const categories = [
                ...previous.ticketCategories
            ];

            const category = categories[categoryIndex];
            const benefits = [
                ...(category.benefits || [])
            ];

            benefits[benefitIndex] = value;

            categories[categoryIndex] = {
                ...category,
                benefits
            };

            return {
                ...previous,
                ticketCategories: categories
            };
        });
    };

    const addTicketBenefit = (
        categoryIndex
    ) => {
        setForm((previous) => {
            const categories = [
                ...previous.ticketCategories
            ];

            const category = categories[categoryIndex];

            categories[categoryIndex] = {
                ...category,
                benefits: [
                    ...(category.benefits || []),
                    ""
                ]
            };

            return {
                ...previous,
                ticketCategories: categories
            };
        });
    };

    const removeTicketBenefit = (
        categoryIndex,
        benefitIndex
    ) => {
        setForm((previous) => {
            const categories = [
                ...previous.ticketCategories
            ];

            const category = categories[categoryIndex];
            const benefits = (
                category.benefits || []
            ).filter(
                (_, index) => index !== benefitIndex
            );

            categories[categoryIndex] = {
                ...category,
                benefits
            };

            return {
                ...previous,
                ticketCategories: categories
            };
        });
    };


    /* ----------------------------------------------------------
       POLICIES
       ---------------------------------------------------------- */

    const updatePolicy = (
        index,
        field,
        value
    ) => {
        setForm(
            (previous) => {
                const policies =
                    [
                        ...previous.policies
                    ];

                policies[
                    index
                ] = {
                    ...policies[
                        index
                    ],
                    [field]:
                        value
                };

                return {
                    ...previous,
                    policies
                };
            }
        );
    };

    const addPolicy =
        () => {
            setForm(
                (previous) => ({
                    ...previous,
                    policies: [
                        ...previous.policies,
                        createPolicy()
                    ]
                })
            );
        };

    const removePolicy =
        (
            index
        ) => {
            setForm(
                (previous) => ({
                    ...previous,
                    policies:
                        previous.policies.filter(
                            (
                                _,
                                itemIndex
                            ) =>
                                itemIndex !==
                                index
                        )
                })
            );
        };


    /* ----------------------------------------------------------
       GALLERY
       ---------------------------------------------------------- */

    const updateGallery =
        (
            galleryType,
            index,
            field,
            value
        ) => {
            setForm(
                (previous) => {
                    const gallery = [
                        ...previous[
                            galleryType
                        ]
                    ];

                    gallery[
                        index
                    ] = {
                        ...gallery[
                            index
                        ],
                        [field]:
                            value
                    };

                    return {
                        ...previous,
                        [galleryType]:
                            gallery
                    };
                }
            );
        };

    const addGalleryItem =
        (
            galleryType
        ) => {
            const prefix =
                galleryType ===
                "programGallery"
                    ? "program-gallery"
                    : "backstage-gallery";

            setForm(
                (previous) => ({
                    ...previous,
                    [galleryType]: [
                        ...previous[
                            galleryType
                        ],
                        createGalleryItem(
                            {},
                            prefix
                        )
                    ]
                })
            );
        };

    const removeGalleryItem =
        (
            galleryType,
            index
        ) => {
            setForm(
                (previous) => ({
                    ...previous,
                    [galleryType]:
                        previous[
                            galleryType
                        ].filter(
                            (
                                _,
                                itemIndex
                            ) =>
                                itemIndex !==
                                index
                        )
                })
            );
        };

    const reorderGalleryItems =
        (
            galleryType,
            oldIndex,
            newIndex
        ) => {
            setForm(
                (previous) => ({
                    ...previous,
                    [galleryType]:
                        arrayMove(
                            previous[
                                galleryType
                            ],
                            oldIndex,
                            newIndex
                        )
                })
            );
        };


    /* ----------------------------------------------------------
       UPLOAD
       ---------------------------------------------------------- */

const handleUploadImage = async (
    file,
    onSuccess
) => {
    if (!file) {
        return;
    }

    try {
        setUploadLoading("image");
        setError("");

        const result =
            await uploadImage(
                file,
                accessToken
            );

        const url =
            result?.data?.image?.url ||
            result?.data?.url ||
            result?.url;

        if (!url) {
            console.error(
                "Upload image response:",
                result
            );

            throw new Error(
                "Server không trả về đường dẫn ảnh."
            );
        }

        onSuccess(url);
    } catch (uploadError) {
        console.error(
            "Upload image error:",
            uploadError
        );

        setError(
            uploadError.message ||
                "Không thể upload ảnh."
        );
    } finally {
        setUploadLoading("");
    }
};


const handleUploadVideo = async (
    file,
    onSuccess,
    {
        setPreview =
            setLocalVideoPreview,
        setName =
            setLocalVideoName,
        loadingKey = "video"
    } = {}
) => {
    if (!file) {
        return;
    }

    const localUrl =
        URL.createObjectURL(file);

    setPreview(localUrl);
    setName(
        file.name ||
            "Video đã chọn"
    );

    try {
        setUploadLoading(
            loadingKey
        );
        setError("");

        const result =
            await uploadVideo(
                file,
                accessToken
            );

        const url =
            result?.data?.video?.url ||
            result?.data?.file?.url ||
            result?.data?.url ||
            result?.url;

        if (!url) {
            console.error(
                "Upload video response:",
                result
            );

            throw new Error(
                "Server không trả về đường dẫn video."
            );
        }

        onSuccess(url);
    } catch (uploadError) {
        console.error(
            "Upload video error:",
            uploadError
        );

        setError(
            uploadError.message ||
                "Không thể upload video."
        );
    } finally {
        setUploadLoading("");
    }
};


    /* ----------------------------------------------------------
       COMING SOON
       ---------------------------------------------------------- */

    const toggleComingSoon =
        (checked) => {
            if (checked) {
                setScheduleBackup({
                    startAt: form.startAt,
                    endAt: form.endAt,
                    bookingOpenAt:
                        form.bookingOpenAt,
                    bookingCloseAt:
                        form.bookingCloseAt,
                    totalTickets:
                        form.totalTickets,
                    allowBooking:
                        form.allowBooking
                });

                setForm((previous) => ({
                    ...previous,
                    isComingSoon: true,
                    startAt: "",
                    endAt: "",
                    bookingOpenAt: "",
                    bookingCloseAt: "",
                    totalTickets: 0,
                    allowBooking: false
                }));
            } else {
                setForm((previous) => ({
                    ...previous,
                    isComingSoon: false,
                    startAt:
                        scheduleBackup?.startAt ||
                        previous.startAt,
                    endAt:
                        scheduleBackup?.endAt ||
                        previous.endAt,
                    bookingOpenAt:
                        scheduleBackup?.bookingOpenAt ||
                        previous.bookingOpenAt,
                    bookingCloseAt:
                        scheduleBackup?.bookingCloseAt ||
                        previous.bookingCloseAt,
                    totalTickets:
                        scheduleBackup?.totalTickets ??
                        previous.totalTickets,
                    allowBooking:
                        scheduleBackup?.allowBooking ??
                        previous.allowBooking
                }));

                setScheduleBackup(null);
            }

            setFieldErrors({});
            setTouched({});
            setError("");
            setSuccess("");
        };


    /* ----------------------------------------------------------
       CLONE SEAT SETUP
       ---------------------------------------------------------- */

    const handleCloneSeatSetup =
        async () => {
            setSeatCloneError("");
            setSeatCloneMessage("");

            if (
                !isEdit ||
                !eventId
            ) {
                setSeatCloneError(
                    "Hãy lưu concert trước khi tạo sơ đồ ghế."
                );
                return;
            }

            if (
                !seatCloneSourceId
            ) {
                setSeatCloneError(
                    "Vui lòng chọn concert nguồn."
                );
                return;
            }

            if (!accessToken) {
                setSeatCloneError(
                    "Phiên đăng nhập đã hết hạn."
                );
                return;
            }

            const sourceEvent =
                seatCloneSources.find(
                    (item) =>
                        String(
                            resolveEntityId(
                                item?._id
                            )
                        ) ===
                        String(
                            seatCloneSourceId
                        )
                );

            const confirmed =
                window.confirm(
                    `Sao chép cấu hình ghế từ "${
                        sourceEvent?.title ||
                        "concert nguồn"
                    }" và tạo bộ ghế mới cho concert này?\n\nTrạng thái sold/held của concert nguồn sẽ KHÔNG được sao chép.`
                );

            if (!confirmed) {
                return;
            }

            try {
                setSeatCloneLoading(
                    true
                );

                const result =
                    await cloneEventSeatSetup(
                        eventId,
                        seatCloneSourceId,
                        accessToken
                    );

                const count =
                    result?.data
                        ?.seatGeneration
                        ?.count ??
                    result?.data
                        ?.assignmentCount ??
                    0;

                setSeatCloneMessage(
                    `Đã tạo ${
                        count || 274
                    } ghế mới cho concert này. Day 1 và Day 2 đặt vé độc lập.`
                );
            } catch (
                cloneError
            ) {
                console.error(
                    "Clone seat setup error:",
                    cloneError
                );

                setSeatCloneError(
                    cloneError
                        ?.response
                        ?.data
                        ?.message ||
                        cloneError.message ||
                        "Không thể sao chép sơ đồ ghế."
                );
            } finally {
                setSeatCloneLoading(
                    false
                );
            }
        };


    /* ----------------------------------------------------------
       SUBMIT
       ---------------------------------------------------------- */

    const handleSubmit =
        async (
            event
        ) => {
            event.preventDefault();

            setSubmitted(
                true
            );

            setError("");
            setSuccess("");

            const errors =
                validateForm(
                    form
                );

            setFieldErrors(
                errors
            );

            if (
                Object.keys(
                    errors
                ).length > 0
            ) {
                setError(
                    "Vui lòng kiểm tra lại các trường đang có lỗi."
                );
                return;
            }

            if (!accessToken) {
                setError(
                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                );
                return;
            }

            try {
                setSaving(
                    true
                );

                const payload =
                    buildPayload(
                        form
                    );

                const result =
                    isEdit
                        ? await updateEvent(
                              eventId,
                              payload,
                              accessToken
                          )
                        : await createEvent(
                              payload,
                              accessToken
                          );

                console.log(
                    "Event saved:",
                    result
                );

                setSuccess(
                    isEdit
                        ? "Đã cập nhật concert thành công."
                        : "Đã tạo concert thành công."
                );

                setTimeout(
                    () => {
                        navigate(
                            "/admin/events"
                        );
                    },
                    700
                );
            } catch (
                saveError
            ) {
                console.error(
                    "Save event error:",
                    saveError
                );

                const responseData =
                    saveError
                        ?.response
                        ?.data;

                setError(
                    responseData?.message ||
                        saveError.message ||
                        "Không thể lưu concert."
                );
            } finally {
                setSaving(
                    false
                );
            }
        };


    /* ----------------------------------------------------------
       LOADING
       ---------------------------------------------------------- */

    if (loading) {
        return (
            <section className="admin-event-loading-state">
                <p>
                    Đang tải thông tin concert...
                </p>
            </section>
        );
    }


    /* ==========================================================
       RENDER
       ========================================================== */

    return (
        <section className="admin-event-create-page">
            <div className="admin-event-create-header">
                <div className="admin-event-create-header-main">
                    <div className="admin-event-eyebrow">
                        FYCE ADMIN
                    </div>

                    <h1>
                        {isEdit
                            ? "Chỉnh sửa concert"
                            : "Tạo concert mới"}
                    </h1>

                    <p>
                        Quản lý thông tin concert,
                        chương trình biểu diễn,
                        nghệ sĩ, hình ảnh và vé.
                    </p>
                </div>

                <Link
                    to="/admin/events"
                    className="admin-event-back-button"
                >
                    ← Danh sách concert
                </Link>
            </div>


            {error && (
                <div className="admin-event-form-alert admin-event-form-alert-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="admin-event-form-alert admin-event-form-alert-success">
                    {success}
                </div>
            )}


            <form
                className="admin-event-form"
                onSubmit={
                    handleSubmit
                }
            >
                {/* ==================================================
                    01 BASIC
                    ================================================== */}

                <section className="admin-event-form-section">
                    <div className="admin-event-section-heading">
                        <span className="admin-event-section-number">
                            01
                        </span>

                        <div>
                            <h2>
                                Thông tin concert
                            </h2>

                            <p>
                                Thông tin cơ bản
                                của chương trình.
                            </p>
                        </div>
                    </div>

                    <div className="admin-event-create-grid">
                        <label
                            className={`admin-event-field ${
                                showError(
                                    "title"
                                )
                                    ? "has-error"
                                    : ""
                            }`}
                        >
                            <span>
                                Tên concert *
                            </span>

                            <input
                                type="text"
                                value={
                                    form.title
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "title",
                                        event
                                            .target
                                            .value
                                    )
                                }
                                onBlur={() =>
                                    markTouched(
                                        "title"
                                    )
                                }
                                placeholder="Ví dụ: The Us of Totoro"
                            />

                            <FieldError
                                error={
                                    showError(
                                        "title"
                                    )
                                        ? fieldErrors.title
                                        : ""
                                }
                            />
                        </label>

                        <label className="admin-event-field">
                            <span>
                                Badge
                            </span>

                            <input
                                type="text"
                                value={
                                    form.badge
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "badge",
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="SPECIAL CONCERT"
                            />
                        </label>

                        <label className="admin-event-field">
                            <span>
                                Subtitle
                            </span>

                            <input
                                type="text"
                                value={
                                    form.subtitle
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "subtitle",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label className="admin-event-field admin-event-field-full">
                            <span>
                                Mô tả ngắn
                            </span>

                            <textarea
                                rows="3"
                                maxLength={
                                    500
                                }
                                value={
                                    form.shortDescription
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "shortDescription",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label className="admin-event-field admin-event-field-full">
                            <span>
                                Mô tả chi tiết
                            </span>

                            <textarea
                                rows="6"
                                value={
                                    form.description
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "description",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </label>
                    </div>
                </section>


                {/* ==================================================
                    02 MEDIA
                    ================================================== */}

                <section className="admin-event-form-section">
                    <div className="admin-event-section-heading">
                        <span className="admin-event-section-number">
                            02
                        </span>

                        <div>
                            <h2>
                                Hình ảnh & Media
                            </h2>

                            <p>
                                Media chính của
                                concert.
                            </p>
                        </div>
                    </div>

                    <div className="admin-event-create-grid">
                        <label className="admin-event-field admin-event-field-full">
                            <span>
                                Cover image
                            </span>

                            <div className="admin-event-upload-row">
                                <input
                                    type="text"
                                    value={
                                        form.coverImage
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            "coverImage",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />

                                <label className="admin-event-upload-button">
                                    Upload
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(
                                            event
                                        ) =>
                                            handleUploadImage(
                                                event
                                                    .target
                                                    .files?.[0],
                                                (
                                                    url
                                                ) =>
                                                    updateForm(
                                                        "coverImage",
                                                        url
                                                    )
                                            )
                                        }
                                    />
                                </label>
                            </div>

                            {form.coverImage && (
                                <div className="admin-event-media-preview">
                                    <img
                                        src={getMediaUrl(
                                            form.coverImage
                                        )}
                                        alt="Cover"
                                    />
                                </div>
                            )}
                        </label>

                        <div className="admin-event-field admin-event-field-full">
                            <span>
                                Hero video
                            </span>

                            <div className="admin-event-upload-row admin-event-video-upload-row">
                                <input
                                    type="text"
                                    value={form.heroVideoUrl}
                                    onChange={(event) => {
                                        setLocalVideoPreview("");
                                        setLocalVideoName("");
                                        updateForm(
                                            "heroVideoUrl",
                                            event.target.value
                                        );
                                    }}
                                    placeholder="Dán URL video hoặc chọn file từ máy tính"
                                />

                                <label className="admin-event-upload-button admin-event-upload-button-large">
                                    {uploadLoading === "video"
                                        ? "Đang upload..."
                                        : "Chọn video"}

                                    <input
                                        type="file"
                                        accept="video/*"
                                        hidden
                                        disabled={uploadLoading === "video"}
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];

                                            handleUploadVideo(
                                                file,
                                                (url) =>
                                                    updateForm(
                                                        "heroVideoUrl",
                                                        url
                                                    )
                                            );

                                            event.target.value = "";
                                        }}
                                    />
                                </label>
                            </div>

                            <small>
                                Có thể dán link video hoặc chọn video trực tiếp từ máy tính để xem trước.
                            </small>

                            {localVideoName && (
                                <div className="admin-event-selected-file">
                                    <span>File đang xem trước</span>
                                    <strong>{localVideoName}</strong>
                                </div>
                            )}

                            <VideoPreview
                                value={
                                    localVideoPreview ||
                                    form.heroVideoUrl
                                }
                                title="Hero video preview"
                            />
                        </div>

                        <div className="admin-event-field admin-event-field-full">
                            <span>
                                Trailer video
                            </span>

                            <div className="admin-event-upload-row admin-event-video-upload-row">
                                <input
                                    type="text"
                                    value={
                                        form.trailerVideoUrl
                                    }
                                    onChange={(event) => {
                                        setLocalTrailerVideoPreview(
                                            ""
                                        );
                                        setLocalTrailerVideoName(
                                            ""
                                        );

                                        updateForm(
                                            "trailerVideoUrl",
                                            event.target
                                                .value
                                        );
                                    }}
                                    placeholder="Dán URL trailer hoặc chọn file từ máy tính"
                                />

                                <label className="admin-event-upload-button admin-event-upload-button-large">
                                    {uploadLoading ===
                                    "trailer-video"
                                        ? "Đang upload..."
                                        : "Chọn trailer"}

                                    <input
                                        type="file"
                                        accept="video/*"
                                        hidden
                                        disabled={
                                            uploadLoading ===
                                            "trailer-video"
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            const file =
                                                event
                                                    .target
                                                    .files?.[0];

                                            handleUploadVideo(
                                                file,
                                                (
                                                    url
                                                ) =>
                                                    updateForm(
                                                        "trailerVideoUrl",
                                                        url
                                                    ),
                                                {
                                                    setPreview:
                                                        setLocalTrailerVideoPreview,
                                                    setName:
                                                        setLocalTrailerVideoName,
                                                    loadingKey:
                                                        "trailer-video"
                                                }
                                            );

                                            event.target.value =
                                                "";
                                        }}
                                    />
                                </label>
                            </div>

                            <small>
                                Có thể dán link YouTube/video trực tiếp hoặc upload trailer từ máy tính.
                            </small>

                            {localTrailerVideoName && (
                                <div className="admin-event-selected-file">
                                    <span>
                                        Trailer đang xem trước
                                    </span>
                                    <strong>
                                        {
                                            localTrailerVideoName
                                        }
                                    </strong>
                                </div>
                            )}

                            <VideoPreview
                                value={
                                    localTrailerVideoPreview ||
                                    form.trailerVideoUrl
                                }
                                title="Trailer video preview"
                            />
                        </div>
                    </div>
                </section>


                {/* ==================================================
                    03 SCHEDULE
                    ================================================== */}

                <section className="admin-event-form-section">
                    <div className="admin-event-section-heading">
                        <span className="admin-event-section-number">
                            03
                        </span>

                        <div>
                            <h2>
                                Thời gian
                            </h2>

                            <p>
                                Lịch diễn và lịch
                                mở bán vé.
                            </p>
                        </div>
                    </div>

                    <label className="admin-event-checkbox-row admin-event-coming-soon-toggle">
                        <input
                            type="checkbox"
                            checked={
                                form.isComingSoon
                            }
                            onChange={(
                                event
                            ) =>
                                toggleComingSoon(
                                    event
                                        .target
                                        .checked
                                )
                            }
                        />

                        <div>
                            <strong>
                                Coming Soon
                            </strong>

                            <small>
                                Chưa công bố lịch
                                chính thức.
                            </small>
                        </div>
                    </label>

                    {!form.isComingSoon && (
                        <div className="admin-event-create-grid">
                            <label
                                className={`admin-event-field ${
                                    showError(
                                        "startAt"
                                    )
                                        ? "has-error"
                                        : ""
                                }`}
                            >
                                <span>
                                    Bắt đầu *
                                </span>

                                <input
                                    type="datetime-local"
                                    min={
                                        minDateTime
                                    }
                                    value={
                                        form.startAt
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            "startAt",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    onBlur={() =>
                                        markTouched(
                                            "startAt"
                                        )
                                    }
                                />

                                <FieldError
                                    error={
                                        showError(
                                            "startAt"
                                        )
                                            ? fieldErrors.startAt
                                            : ""
                                    }
                                />
                            </label>

                            <label
                                className={`admin-event-field ${
                                    showError(
                                        "endAt"
                                    )
                                        ? "has-error"
                                        : ""
                                }`}
                            >
                                <span>
                                    Kết thúc *
                                </span>

                                <input
                                    type="datetime-local"
                                    min={
                                        form.startAt &&
                                        form.startAt > minDateTime
                                            ? form.startAt
                                            : minDateTime
                                    }
                                    value={
                                        form.endAt
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            "endAt",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    onBlur={() =>
                                        markTouched(
                                            "endAt"
                                        )
                                    }
                                />

                                <FieldError
                                    error={
                                        showError(
                                            "endAt"
                                        )
                                            ? fieldErrors.endAt
                                            : ""
                                    }
                                />
                            </label>

                            <label
                                className={`admin-event-field ${
                                    showError(
                                        "bookingOpenAt"
                                    )
                                        ? "has-error"
                                        : ""
                                }`}
                            >
                                <span>
                                    Mở bán *
                                </span>

                                <input
                                    type="datetime-local"
                                    min={
                                        minDateTime
                                    }
                                    max={
                                        form.startAt ||
                                        undefined
                                    }
                                    value={
                                        form.bookingOpenAt
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            "bookingOpenAt",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    onBlur={() =>
                                        markTouched(
                                            "bookingOpenAt"
                                        )
                                    }
                                />

                                <small>
                                    Có thể chỉnh sửa khi Edit. Thời gian mở bán phải bằng hoặc sau thời điểm hiện tại.
                                </small>

                                <FieldError
                                    error={
                                        showError(
                                            "bookingOpenAt"
                                        )
                                            ? fieldErrors.bookingOpenAt
                                            : ""
                                    }
                                />
                            </label>

                            <label
                                className={`admin-event-field ${
                                    showError(
                                        "bookingCloseAt"
                                    )
                                        ? "has-error"
                                        : ""
                                }`}
                            >
                                <span>
                                    Đóng bán *
                                </span>

                                <input
                                    type="datetime-local"
                                    min={
                                        form.bookingOpenAt &&
                                        form.bookingOpenAt > minDateTime
                                            ? form.bookingOpenAt
                                            : minDateTime
                                    }
                                    max={
                                        form.startAt ||
                                        undefined
                                    }
                                    value={
                                        form.bookingCloseAt
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            "bookingCloseAt",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    onBlur={() =>
                                        markTouched(
                                            "bookingCloseAt"
                                        )
                                    }
                                />

                                <FieldError
                                    error={
                                        showError(
                                            "bookingCloseAt"
                                        )
                                            ? fieldErrors.bookingCloseAt
                                            : ""
                                    }
                                />
                            </label>
                        </div>
                    )}
                </section>


                {/* ==================================================
                    04 VENUE
                    ================================================== */}

                <section className="admin-event-form-section">
                    <div className="admin-event-section-heading">
                        <span className="admin-event-section-number">
                            04
                        </span>

                        <div>
                            <h2>
                                Địa điểm
                            </h2>
                        </div>
                    </div>

                    <div className="admin-event-create-grid">
                        <label
                            className={`admin-event-field ${
                                showError(
                                    "venue"
                                )
                                    ? "has-error"
                                    : ""
                            }`}
                        >
                            <span>
                                Tên địa điểm *
                            </span>

                            <input
                                type="text"
                                value={
                                    form.venue
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "venue",
                                        event
                                            .target
                                            .value
                                    )
                                }
                                onBlur={() =>
                                    markTouched(
                                        "venue"
                                    )
                                }
                            />

                            <FieldError
                                error={
                                    showError(
                                        "venue"
                                    )
                                        ? fieldErrors.venue
                                        : ""
                                }
                            />
                        </label>

                        <label className="admin-event-field">
                            <span>
                                Thành phố
                            </span>

                            <input
                                type="text"
                                value={
                                    form.city
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "city",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label className="admin-event-field admin-event-field-full">
                            <span>
                                Địa chỉ
                            </span>

                            <input
                                type="text"
                                value={
                                    form.address
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "address",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label className="admin-event-field admin-event-field-full">
                            <span>
                                Mô tả địa điểm
                            </span>

                            <textarea
                                rows="3"
                                value={
                                    form.venueDescription
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "venueDescription",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </label>
                    </div>
                </section>


                {/* ==================================================
                    05 PROGRAM
                    ================================================== */}

                <section className="admin-event-form-section">
                    <div className="admin-event-section-heading">
                        <span className="admin-event-section-number">
                            05
                        </span>

                        <div>
                            <h2>
                                Chương trình biểu diễn
                            </h2>

                            <p>
                                Concert được chia
                                thành nhiều phần.
                                Mỗi phần có nhiều
                                tác phẩm.
                            </p>
                        </div>

                    </div>

                    <DndContext
                        sensors={
                            sensors
                        }
                        collisionDetection={
                            closestCenter
                        }
                        onDragEnd={
                            handleProgramPartDragEnd
                        }
                    >
                        <SortableContext
                            items={form.programParts.map(
                                (
                                    part
                                ) =>
                                    part._dragId
                            )}
                            strategy={
                                verticalListSortingStrategy
                            }
                        >
                            <div className="admin-event-program-parts">
                                {form.programParts.map(
                                    (
                                        part,
                                        partIndex
                                    ) => (
                                        <SortableCard
                                            key={
                                                part._dragId
                                            }
                                            id={
                                                part._dragId
                                            }
                                            className="admin-event-program-part-card"
                                        >
                                            <div className="admin-event-dynamic-card-header">
                                                <div>
                                                    <span>
                                                        PHẦN{" "}
                                                        {partIndex +
                                                            1}
                                                    </span>

                                                    <strong>
                                                        {part.title ||
                                                            `Phần ${
                                                                partIndex +
                                                                1
                                                            }`}
                                                    </strong>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="admin-event-danger-button"
                                                    onClick={() =>
                                                        removeProgramPart(
                                                            partIndex
                                                        )
                                                    }
                                                >
                                                    Xóa phần
                                                </button>
                                            </div>

                                            <div className="admin-event-create-grid">
                                                <label
                                                    className={`admin-event-field ${
                                                        showError(
                                                            `programPart-${partIndex}`
                                                        )
                                                            ? "has-error"
                                                            : ""
                                                    }`}
                                                >
                                                    <span>
                                                        Tên phần *
                                                    </span>

                                                    <input
                                                        type="text"
                                                        value={
                                                            part.title
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateProgramPart(
                                                                partIndex,
                                                                "title",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="Ví dụ: Những thanh âm đầu tiên"
                                                    />

                                                    <FieldError
                                                        error={
                                                            showError(
                                                                `programPart-${partIndex}`
                                                            )
                                                                ? fieldErrors[
                                                                      `programPart-${partIndex}`
                                                                  ]
                                                                : ""
                                                        }
                                                    />
                                                </label>

                                                <label className="admin-event-field">
                                                    <span>
                                                        Subtitle
                                                    </span>

                                                    <input
                                                        type="text"
                                                        value={
                                                            part.subtitle
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateProgramPart(
                                                                partIndex,
                                                                "subtitle",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                    />
                                                </label>

                                                <label className="admin-event-field admin-event-field-full">
                                                    <span>
                                                        Mô tả phần
                                                    </span>

                                                    <textarea
                                                        rows="3"
                                                        value={
                                                            part.description
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateProgramPart(
                                                                partIndex,
                                                                "description",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                    />
                                                </label>
                                            </div>

                                            <div className="admin-event-nested-section">
                                                <div className="admin-event-nested-heading">
                                                    <div>
                                                        <span>
                                                            NHẠC MỤC
                                                        </span>

                                                        <strong>
                                                            {
                                                                part
                                                                    .works
                                                                    .length
                                                            }{" "}
                                                            tác phẩm
                                                        </strong>
                                                    </div>

                                                </div>

                                                <DndContext
                                                    sensors={
                                                        sensors
                                                    }
                                                    collisionDetection={
                                                        closestCenter
                                                    }
                                                    onDragEnd={(
                                                        event
                                                    ) =>
                                                        handleWorkDragEnd(
                                                            partIndex,
                                                            event
                                                        )
                                                    }
                                                >
                                                    <SortableContext
                                                        items={part.works.map(
                                                            (
                                                                work
                                                            ) =>
                                                                work._dragId
                                                        )}
                                                        strategy={
                                                            verticalListSortingStrategy
                                                        }
                                                    >
                                                        <div className="admin-event-work-list">
                                                            {part.works.map(
                                                                (
                                                                    work,
                                                                    workIndex
                                                                ) => (
                                                                    <SortableCard
                                                                        key={
                                                                            work._dragId
                                                                        }
                                                                        id={
                                                                            work._dragId
                                                                        }
                                                                        className="admin-event-work-card"
                                                                    >
                                                                        <div className="admin-event-dynamic-card-header">
                                                                            <div>
                                                                                <span>
                                                                                    TÁC PHẨM{" "}
                                                                                    {workIndex +
                                                                                        1}
                                                                                </span>

                                                                                <strong>
                                                                                    {work.title ||
                                                                                        `Tác phẩm ${
                                                                                            workIndex +
                                                                                            1
                                                                                        }`}
                                                                                </strong>
                                                                            </div>

                                                                            <button
                                                                                type="button"
                                                                                className="admin-event-danger-button"
                                                                                onClick={() =>
                                                                                    removeWork(
                                                                                        partIndex,
                                                                                        workIndex
                                                                                    )
                                                                                }
                                                                            >
                                                                                Xóa
                                                                            </button>
                                                                        </div>

                                                                        <div className="admin-event-create-grid">
                                                                            <label
                                                                                className={`admin-event-field ${
                                                                                    showError(
                                                                                        `work-${partIndex}-${workIndex}`
                                                                                    )
                                                                                        ? "has-error"
                                                                                        : ""
                                                                                }`}
                                                                            >
                                                                                <span>
                                                                                    Tên tác phẩm *
                                                                                </span>

                                                                                <input
                                                                                    type="text"
                                                                                    value={
                                                                                        work.title
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        updateWork(
                                                                                            partIndex,
                                                                                            workIndex,
                                                                                            "title",
                                                                                            event
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                />

                                                                                <FieldError
                                                                                    error={
                                                                                        showError(
                                                                                            `work-${partIndex}-${workIndex}`
                                                                                        )
                                                                                            ? fieldErrors[
                                                                                                  `work-${partIndex}-${workIndex}`
                                                                                              ]
                                                                                            : ""
                                                                                    }
                                                                                />
                                                                            </label>

                                                                            <label className="admin-event-field">
                                                                                <span>
                                                                                    Nhà soạn nhạc
                                                                                </span>

                                                                                <input
                                                                                    type="text"
                                                                                    value={
                                                                                        work.composer
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        updateWork(
                                                                                            partIndex,
                                                                                            workIndex,
                                                                                            "composer",
                                                                                            event
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </label>

                                                                            <label className="admin-event-field">
                                                                                <span>
                                                                                    Subtitle
                                                                                </span>

                                                                                <input
                                                                                    type="text"
                                                                                    value={
                                                                                        work.subtitle
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        updateWork(
                                                                                            partIndex,
                                                                                            workIndex,
                                                                                            "subtitle",
                                                                                            event
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </label>

                                                                            <label className="admin-event-field">
                                                                                <span>
                                                                                    Thời lượng (phút)
                                                                                </span>

                                                                                <input
                                                                                    type="text"
                                                                                    inputMode="numeric"
                                                                                    value={
                                                                                        work.durationMinutes
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        updateWork(
                                                                                            partIndex,
                                                                                            workIndex,
                                                                                            "durationMinutes",
                                                                                            sanitizeInteger(
                                                                                                event
                                                                                                    .target
                                                                                                    .value
                                                                                            )
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </label>

                                                                            <label className="admin-event-field admin-event-field-full">
                                                                                <span>
                                                                                    Mô tả tác phẩm
                                                                                </span>

                                                                                <textarea
                                                                                    rows="3"
                                                                                    value={
                                                                                        work.description
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        updateWork(
                                                                                            partIndex,
                                                                                            workIndex,
                                                                                            "description",
                                                                                            event
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </label>
                                                                        </div>
                                                                    </SortableCard>
                                                                )
                                                            )}
                                                        </div>
                                                    </SortableContext>
                                                </DndContext>

                                                <div className="admin-event-add-action admin-event-add-action-nested">
                                                    <button
                                                        type="button"
                                                        className="admin-event-secondary-button admin-event-add-button"
                                                        onClick={() =>
                                                            addWork(partIndex)
                                                        }
                                                    >
                                                        + Thêm tác phẩm
                                                    </button>
                                                </div>
                                            </div>
                                        </SortableCard>
                                    )
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {form.programParts.length ===
                        0 && (
                        <div className="admin-event-empty-state">
                            Chưa có phần nào.
                        </div>
                    )}

                    <div className="admin-event-add-action">
                        <button
                            type="button"
                            className="admin-event-secondary-button admin-event-add-button"
                            onClick={addProgramPart}
                        >
                            + Thêm phần
                        </button>
                    </div>
                </section>


                {/* ==================================================
                    06 ARTISTS
                    ================================================== */}

                <section className="admin-event-form-section">
                    <div className="admin-event-section-heading">
                        <span className="admin-event-section-number">
                            06
                        </span>

                        <div>
                            <h2>
                                Nghệ sĩ & Ban điều hành
                            </h2>
                        </div>

                    </div>

                    <DndContext
                        sensors={
                            sensors
                        }
                        collisionDetection={
                            closestCenter
                        }
                        onDragEnd={
                            handleArtistDragEnd
                        }
                    >
                        <SortableContext
                            items={form.artists.map(
                                (
                                    artist
                                ) =>
                                    artist._dragId
                            )}
                            strategy={
                                verticalListSortingStrategy
                            }
                        >
                            <div className="admin-event-dynamic-list">
                                {form.artists.map(
                                    (
                                        artist,
                                        index
                                    ) => (
                                        <SortableCard
                                            key={
                                                artist._dragId
                                            }
                                            id={
                                                artist._dragId
                                            }
                                            className="admin-event-artist-form-card"
                                        >
                                            <div className="admin-event-dynamic-card-header">
                                                <div>
                                                    <span>
                                                        NGHỆ SĨ{" "}
                                                        {index +
                                                            1}
                                                    </span>

                                                    <strong>
                                                        {artist.name ||
                                                            "Nghệ sĩ mới"}
                                                    </strong>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="admin-event-danger-button"
                                                    onClick={() =>
                                                        removeArtist(
                                                            index
                                                        )
                                                    }
                                                >
                                                    Xóa
                                                </button>
                                            </div>

                                            <div className="admin-event-create-grid">
                                                <label
                                                    className={`admin-event-field ${
                                                        showError(
                                                            `artist-name-${index}`
                                                        )
                                                            ? "has-error"
                                                            : ""
                                                    }`}
                                                >
                                                    <span>
                                                        Tên nghệ sĩ *
                                                    </span>

                                                    <input
                                                        type="text"
                                                        value={
                                                            artist.name
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateArtist(
                                                                index,
                                                                "name",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                    />

                                                    <FieldError
                                                        error={
                                                            showError(
                                                                `artist-name-${index}`
                                                            )
                                                                ? fieldErrors[
                                                                      `artist-name-${index}`
                                                                  ]
                                                                : ""
                                                        }
                                                    />
                                                </label>

                                                <label
                                                    className={`admin-event-field ${
                                                        showError(
                                                            `artist-role-${index}`
                                                        )
                                                            ? "has-error"
                                                            : ""
                                                    }`}
                                                >
                                                    <span>
                                                        Vai trò *
                                                    </span>

                                                    <input
                                                        type="text"
                                                        value={
                                                            artist.role
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateArtist(
                                                                index,
                                                                "role",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="Violin / Piano / Conductor..."
                                                    />

                                                    <FieldError
                                                        error={
                                                            showError(
                                                                `artist-role-${index}`
                                                            )
                                                                ? fieldErrors[
                                                                      `artist-role-${index}`
                                                                  ]
                                                                : ""
                                                        }
                                                    />
                                                </label>

                                                <label className="admin-event-field">
                                                    <span>
                                                        Nhạc cụ
                                                    </span>

                                                    <input
                                                        type="text"
                                                        value={
                                                            artist.instrument
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateArtist(
                                                                index,
                                                                "instrument",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                    />
                                                </label>

                                                <label className="admin-event-field">
                                                    <span>
                                                        Ảnh nghệ sĩ
                                                    </span>

                                                    <div className="admin-event-upload-row">
                                                        <input
                                                            type="text"
                                                            value={
                                                                artist.image
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateArtist(
                                                                    index,
                                                                    "image",
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />

                                                        <label className="admin-event-upload-button">
                                                            Upload
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                hidden
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    handleUploadImage(
                                                                        event
                                                                            .target
                                                                            .files?.[0],
                                                                        (
                                                                            url
                                                                        ) =>
                                                                            updateArtist(
                                                                                index,
                                                                                "image",
                                                                                url
                                                                            )
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                    </div>

                                                    {artist.image && (
                                                        <div className="admin-event-small-image-preview">
                                                            <img
                                                                src={getMediaUrl(
                                                                    artist.image
                                                                )}
                                                                alt={
                                                                    artist.name ||
                                                                    "Artist"
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </label>

                                                <label className="admin-event-field admin-event-field-full">
                                                    <span>
                                                        Tiểu sử
                                                    </span>

                                                    <textarea
                                                        rows="5"
                                                        maxLength={
                                                            2000
                                                        }
                                                        value={
                                                            artist.bio
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateArtist(
                                                                index,
                                                                "bio",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                    />

                                                    <small>
                                                        {
                                                            artist
                                                                .bio
                                                                .length
                                                        }
                                                        /2000
                                                    </small>
                                                </label>
                                            </div>
                                        </SortableCard>
                                    )
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {form.artists.length ===
                        0 && (
                        <div className="admin-event-empty-state">
                            Chưa có nghệ sĩ.
                        </div>
                    )}

                    <div className="admin-event-add-action">
                        <button
                            type="button"
                            className="admin-event-secondary-button admin-event-add-button"
                            onClick={addArtist}
                        >
                            + Thêm nghệ sĩ
                        </button>
                    </div>
                </section>


                {/* ==================================================
                    07 PROGRAM GALLERY
                    ================================================== */}

                <GallerySection
                    number="07"
                    title="Ảnh chương trình"
                    description="Ảnh trực tiếp liên quan đến concert, sân khấu và phần biểu diễn."
                    gallery={
                        form.programGallery
                    }
                    onAdd={() =>
                        addGalleryItem(
                            "programGallery"
                        )
                    }
                    onRemove={(index) =>
                        removeGalleryItem(
                            "programGallery",
                            index
                        )
                    }
                    onReorder={(
                        oldIndex,
                        newIndex
                    ) =>
                        reorderGalleryItems(
                            "programGallery",
                            oldIndex,
                            newIndex
                        )
                    }
                    onUpdate={(
                        index,
                        field,
                        value
                    ) =>
                        updateGallery(
                            "programGallery",
                            index,
                            field,
                            value
                        )
                    }
                    onUpload={
                        handleUploadImage
                    }
                />


                {/* ==================================================
                    08 BACKSTAGE GALLERY
                    ================================================== */}

                <GallerySection
                    number="08"
                    title="Ảnh hậu trường"
                    description="Ảnh rehearsal, tập luyện, chuẩn bị sân khấu và hoạt động phía sau concert."
                    gallery={
                        form.backstageGallery
                    }
                    onAdd={() =>
                        addGalleryItem(
                            "backstageGallery"
                        )
                    }
                    onRemove={(index) =>
                        removeGalleryItem(
                            "backstageGallery",
                            index
                        )
                    }
                    onReorder={(
                        oldIndex,
                        newIndex
                    ) =>
                        reorderGalleryItems(
                            "backstageGallery",
                            oldIndex,
                            newIndex
                        )
                    }
                    onUpdate={(
                        index,
                        field,
                        value
                    ) =>
                        updateGallery(
                            "backstageGallery",
                            index,
                            field,
                            value
                        )
                    }
                    onUpload={
                        handleUploadImage
                    }
                />


                {/* ==================================================
                    09 TICKETS
                    ================================================== */}

                <section className="admin-event-form-section">
                    <div className="admin-event-section-heading">
                        <span className="admin-event-section-number">
                            09
                        </span>

                        <div>
                            <h2>
                                Vé & Hạng ghế
                            </h2>
                        </div>

                    </div>

                    <div className="admin-event-create-grid">
                        <label
                            className={`admin-event-field ${
                                showError(
                                    "ticketCategories"
                                )
                                    ? "has-error"
                                    : ""
                            }`}
                        >
                            <span>
                                Tổng số vé
                            </span>

                            <input
                                type="text"
                                inputMode="numeric"
                                disabled={
                                    form.isComingSoon
                                }
                                value={
                                    form.totalTickets
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "totalTickets",
                                        sanitizeInteger(
                                            event
                                                .target
                                                .value
                                        )
                                    )
                                }
                            />
                        </label>

                        <label className="admin-event-checkbox-row">
                            <input
                                type="checkbox"
                                checked={
                                    form.allowBooking
                                }
                                disabled={
                                    form.isComingSoon
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "allowBooking",
                                        event
                                            .target
                                            .checked
                                    )
                                }
                            />

                            <div>
                                <strong>
                                    Cho phép đặt vé
                                </strong>

                                <small>
                                    Người dùng có thể
                                    bắt đầu booking.
                                </small>
                            </div>
                        </label>

                        <label className="admin-event-field admin-event-field-full">
                            <span>
                                Sơ đồ khán phòng
                            </span>

                            <div className="admin-event-upload-row">
                                <input
                                    type="text"
                                    value={
                                        form.seatingChartImage
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            "seatingChartImage",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />

                                <label className="admin-event-upload-button">
                                    Upload
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(
                                            event
                                        ) =>
                                            handleUploadImage(
                                                event
                                                    .target
                                                    .files?.[0],
                                                (
                                                    url
                                                ) =>
                                                    updateForm(
                                                        "seatingChartImage",
                                                        url
                                                    )
                                            )
                                        }
                                    />
                                </label>
                            </div>

                            {form.seatingChartImage && (
                                <div className="admin-event-gallery-preview">
                                    <img
                                        src={getMediaUrl(
                                            form.seatingChartImage
                                        )}
                                        alt="Seating chart"
                                    />
                                </div>
                            )}
                        </label>
                    </div>

                    {showError(
                        "ticketCategories"
                    ) && (
                        <FieldError
                            error={
                                fieldErrors.ticketCategories
                            }
                        />
                    )}

                    <div className="admin-event-dynamic-list">
                        {form.ticketCategories.map(
                            (
                                category,
                                index
                            ) => (
                                <div
                                    className="admin-event-dynamic-card"
                                    key={
                                        category._dragId
                                    }
                                >
                                    <div className="admin-event-dynamic-card-header">
                                        <div>
                                            <span>
                                                HẠNG VÉ{" "}
                                                {index +
                                                    1}
                                            </span>

                                            <strong>
                                                {category.name ||
                                                    "Hạng vé mới"}
                                            </strong>
                                        </div>

                                        <button
                                            type="button"
                                            className="admin-event-danger-button"
                                            onClick={() =>
                                                removeTicketCategory(
                                                    index
                                                )
                                            }
                                        >
                                            Xóa
                                        </button>
                                    </div>

                                    <div className="admin-event-create-grid">
                                        <label
                                            className={`admin-event-field ${
                                                showError(
                                                    `ticket-code-${index}`
                                                )
                                                    ? "has-error"
                                                    : ""
                                            }`}
                                        >
                                            <span>
                                                Code *
                                            </span>

                                            <input
                                                type="text"
                                                value={
                                                    category.code
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateTicketCategory(
                                                        index,
                                                        "code",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                maxLength={30}
                                            />
                                            <FieldError
                                                error={
                                                    showError(
                                                        `ticket-code-${index}`
                                                    )
                                                        ? fieldErrors[
                                                              `ticket-code-${index}`
                                                          ]
                                                        : ""
                                                }
                                            />
                                        </label>

                                        <label
                                            className={`admin-event-field ${
                                                showError(
                                                    `ticket-name-${index}`
                                                )
                                                    ? "has-error"
                                                    : ""
                                            }`}
                                        >
                                            <span>
                                                Tên *
                                            </span>

                                            <input
                                                type="text"
                                                value={
                                                    category.name
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateTicketCategory(
                                                        index,
                                                        "name",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                            <FieldError
                                                error={
                                                    showError(
                                                        `ticket-name-${index}`
                                                    )
                                                        ? fieldErrors[
                                                              `ticket-name-${index}`
                                                          ]
                                                        : ""
                                                }
                                            />
                                        </label>

                                        <label
                                            className={`admin-event-field ${
                                                showError(
                                                    `ticket-price-${index}`
                                                )
                                                    ? "has-error"
                                                    : ""
                                            }`}
                                        >
                                            <span>
                                                Giá (VND)
                                            </span>

                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={
                                                    category.price
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateTicketCategory(
                                                        index,
                                                        "price",
                                                        sanitizeInteger(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    )
                                                }
                                            />
                                            <FieldError
                                                error={
                                                    showError(
                                                        `ticket-price-${index}`
                                                    )
                                                        ? fieldErrors[
                                                              `ticket-price-${index}`
                                                          ]
                                                        : ""
                                                }
                                            />
                                        </label>

                                        <label className="admin-event-field">
                                            <span>
                                                Màu hiển thị
                                            </span>

                                            <div className="admin-event-color-input">
                                                <input
                                                    type="color"
                                                    value={
                                                        category.colorCode ||
                                                        "#2D7F73"
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateTicketCategory(
                                                            index,
                                                            "colorCode",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                                <input
                                                    type="text"
                                                    value={
                                                        category.colorCode
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateTicketCategory(
                                                            index,
                                                            "colorCode",
                                                            event.target.value
                                                        )
                                                    }
                                                    maxLength={7}
                                                    placeholder="#2D7F73"
                                                />
                                            </div>
                                        </label>


                                        <label
                                            className={`admin-event-field ${
                                                showError(
                                                    `ticket-max-${index}`
                                                )
                                                    ? "has-error"
                                                    : ""
                                            }`}
                                        >
                                            <span>
                                                Tối đa / đơn
                                            </span>

                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={
                                                    category.maxPerOrder
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateTicketCategory(
                                                        index,
                                                        "maxPerOrder",
                                                        sanitizeInteger(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    )
                                                }
                                            />
                                            <FieldError
                                                error={
                                                    showError(
                                                        `ticket-max-${index}`
                                                    )
                                                        ? fieldErrors[
                                                              `ticket-max-${index}`
                                                          ]
                                                        : ""
                                                }
                                            />
                                        </label>

                                        <div className="admin-event-field admin-event-field-full admin-event-benefits-field">
                                            <div className="admin-event-inline-heading">
                                                <div>
                                                    <span>
                                                        Quyền lợi hạng vé
                                                    </span>
                                                    <small>
                                                        Liệt kê quyền lợi hiển thị cho khách hàng.
                                                    </small>
                                                </div>

                                            </div>

                                            <div className="admin-event-benefits-list">
                                                {(category.benefits || []).length === 0 && (
                                                    <div className="admin-event-benefits-empty">
                                                        Chưa có quyền lợi.
                                                    </div>
                                                )}

                                                {(category.benefits || []).map(
                                                    (benefit, benefitIndex) => (
                                                        <div
                                                            className="admin-event-benefit-row"
                                                            key={`${category._dragId}-benefit-${benefitIndex}`}
                                                        >
                                                            <span>
                                                                {benefitIndex + 1}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={benefit}
                                                                placeholder="Ví dụ: Hỗ trợ đổi ghế trước giờ diễn"
                                                                onChange={(event) =>
                                                                    updateTicketBenefit(
                                                                        index,
                                                                        benefitIndex,
                                                                        event.target.value
                                                                    )
                                                                }
                                                            />
                                                            <button
                                                                type="button"
                                                                className="admin-event-icon-danger-button"
                                                                onClick={() =>
                                                                    removeTicketBenefit(
                                                                        index,
                                                                        benefitIndex
                                                                    )
                                                                }
                                                                aria-label={`Xóa quyền lợi ${benefitIndex + 1}`}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            <div className="admin-event-add-action admin-event-add-action-compact">
                                                <button
                                                    type="button"
                                                    className="admin-event-secondary-button admin-event-mini-button admin-event-add-button"
                                                    onClick={() =>
                                                        addTicketBenefit(index)
                                                    }
                                                >
                                                    + Thêm quyền lợi
                                                </button>
                                            </div>
                                        </div>

                                        <label className="admin-event-checkbox-row">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    category.isActive
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateTicketCategory(
                                                        index,
                                                        "isActive",
                                                        event
                                                            .target
                                                            .checked
                                                    )
                                                }
                                            />

                                            <div>
                                                <strong>
                                                    Đang hoạt động
                                                </strong>
                                            </div>
                                        </label>

                                        <label className="admin-event-field admin-event-field-full">
                                            <span>
                                                Mô tả
                                            </span>

                                            <textarea
                                                rows="3"
                                                value={
                                                    category.description
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateTicketCategory(
                                                        index,
                                                        "description",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    <div className="admin-event-add-action">
                        <button
                            type="button"
                            className="admin-event-secondary-button admin-event-add-button"
                            onClick={addTicketCategory}
                        >
                            + Thêm hạng vé
                        </button>
                    </div>
                </section>


                {/* ==================================================
                    10 POLICIES
                    ================================================== */}

                <section className="admin-event-form-section">
                    <div className="admin-event-section-heading">
                        <span className="admin-event-section-number">
                            10
                        </span>

                        <div>
                            <h2>
                                Quy định khán phòng
                            </h2>
                        </div>

                    </div>

                    <div className="admin-event-dynamic-list">
                        {form.policies.map(
                            (
                                policy,
                                index
                            ) => (
                                <div
                                    className="admin-event-dynamic-card"
                                    key={
                                        policy._dragId
                                    }
                                >
                                    <div className="admin-event-dynamic-card-header">
                                        <div>
                                            <span>
                                                QUY ĐỊNH{" "}
                                                {index +
                                                    1}
                                            </span>

                                            <strong>
                                                {policy.title ||
                                                    "Quy định mới"}
                                            </strong>
                                        </div>

                                        <button
                                            type="button"
                                            className="admin-event-danger-button"
                                            onClick={() =>
                                                removePolicy(
                                                    index
                                                )
                                            }
                                        >
                                            Xóa
                                        </button>
                                    </div>

                                    <div className="admin-event-create-grid">
                                        <label className="admin-event-field">
                                            <span>
                                                Tiêu đề *
                                            </span>

                                            <input
                                                type="text"
                                                value={
                                                    policy.title
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updatePolicy(
                                                        index,
                                                        "title",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className="admin-event-field">
                                            <span>
                                                Loại
                                            </span>

                                            <select
                                                value={
                                                    policy.type
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updatePolicy(
                                                        index,
                                                        "type",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            >
                                                <option value="dress_code">
                                                    Dress code
                                                </option>

                                                <option value="arrival">
                                                    Arrival
                                                </option>

                                                <option value="age">
                                                    Age
                                                </option>

                                                <option value="mobile">
                                                    Mobile
                                                </option>

                                                <option value="ticket">
                                                    Ticket
                                                </option>

                                                <option value="information">
                                                    Information
                                                </option>

                                                <option value="venue">
                                                    Venue
                                                </option>

                                                <option value="general">
                                                    General
                                                </option>
                                            </select>
                                        </label>

                                        <label className="admin-event-field">
                                            <span>
                                                Icon
                                            </span>

                                            <input
                                                type="text"
                                                value={
                                                    policy.icon
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updatePolicy(
                                                        index,
                                                        "icon",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className="admin-event-field admin-event-field-full">
                                            <span>
                                                Nội dung *
                                            </span>

                                            <textarea
                                                rows="4"
                                                value={
                                                    policy.description
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updatePolicy(
                                                        index,
                                                        "description",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    <div className="admin-event-add-action">
                        <button
                            type="button"
                            className="admin-event-secondary-button admin-event-add-button"
                            onClick={addPolicy}
                        >
                            + Thêm quy định
                        </button>
                    </div>
                </section>


                {/* ==================================================
                    11 STATUS
                    ================================================== */}

                <section className="admin-event-form-section">
                    <div className="admin-event-section-heading">
                        <span className="admin-event-section-number">
                            11
                        </span>

                        <div>
                            <h2>
                                Trạng thái concert
                            </h2>

                            <p>
                                Trạng thái hiện tại
                                được giữ khi edit.
                            </p>
                        </div>
                    </div>

                    <div className="admin-event-create-grid">
                        <label className="admin-event-field">
                            <span>
                                Status
                            </span>

                            <select
                                value={
                                    form.status
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "status",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="draft">
                                    Draft
                                </option>

                                <option value="published">
                                    Published
                                </option>

                                <option value="sold_out">
                                    Sold out
                                </option>

                                <option value="cancelled">
                                    Cancelled
                                </option>

                                <option value="completed">
                                    Completed
                                </option>
                            </select>
                        </label>

                        <label className="admin-event-checkbox-row">
                            <input
                                type="checkbox"
                                checked={
                                    form.isFeatured
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "isFeatured",
                                        event
                                            .target
                                            .checked
                                    )
                                }
                            />

                            <div>
                                <strong>
                                    Featured event
                                </strong>

                                <small>
                                    Backend đảm bảo
                                    chỉ có một event
                                    featured.
                                </small>
                            </div>
                        </label>

                        <label className="admin-event-field">
                            <span>
                                Nhạc trưởng
                            </span>

                            <input
                                type="text"
                                value={
                                    form.conductor
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateForm(
                                        "conductor",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </label>
                    </div>
                </section>


                {isEdit && (
                    <section className="admin-event-form-section admin-event-seat-clone-section">
                        <div className="admin-event-section-heading">
                            <span className="admin-event-section-number">
                                12
                            </span>

                            <div>
                                <h2>
                                    Sơ đồ ghế Day 2
                                </h2>

                                <p>
                                    Sao chép cách phân hạng ghế từ một concert cùng layout và tạo bộ Seat mới hoàn toàn cho concert hiện tại.
                                </p>
                            </div>
                        </div>

                        <div className="admin-event-seat-clone-card">
                            <label className="admin-event-field">
                                <span>
                                    Concert nguồn
                                </span>

                                <select
                                    value={
                                        seatCloneSourceId
                                    }
                                    onChange={(
                                        event
                                    ) => {
                                        setSeatCloneSourceId(
                                            event.target
                                                .value
                                        );

                                        setSeatCloneError(
                                            ""
                                        );

                                        setSeatCloneMessage(
                                            ""
                                        );
                                    }}
                                    disabled={
                                        seatCloneLoading
                                    }
                                >
                                    <option value="">
                                        Chọn Day 1 / concert nguồn
                                    </option>

                                    {seatCloneSources.map(
                                        (
                                            item
                                        ) => {
                                            const sourceId =
                                                resolveEntityId(
                                                    item?._id
                                                );

                                            const start =
                                                item?.startAt
                                                    ? new Date(
                                                          item.startAt
                                                      )
                                                    : null;

                                            const dateLabel =
                                                start &&
                                                !Number.isNaN(
                                                    start.getTime()
                                                )
                                                    ? start.toLocaleDateString(
                                                          "vi-VN"
                                                      )
                                                    : "Chưa có ngày";

                                            return (
                                                <option
                                                    key={
                                                        sourceId
                                                    }
                                                    value={
                                                        sourceId
                                                    }
                                                >
                                                    {item?.title ||
                                                        "Concert"}{" "}
                                                    —{" "}
                                                    {
                                                        dateLabel
                                                    }
                                                </option>
                                            );
                                        }
                                    )}
                                </select>

                                <small>
                                    Chỉ hiển thị các concert dùng cùng VenueLayout với concert hiện tại.
                                </small>
                            </label>

                            <div className="admin-event-seat-clone-actions">
                                <button
                                    type="button"
                                    className="admin-event-primary-button admin-event-seat-clone-button"
                                    onClick={
                                        handleCloneSeatSetup
                                    }
                                    disabled={
                                        seatCloneLoading ||
                                        !seatCloneSourceId ||
                                        saving
                                    }
                                >
                                    {seatCloneLoading
                                        ? "Đang tạo 274 ghế..."
                                        : "Sao chép sơ đồ ghế & tạo ghế"}
                                </button>

                                <div className="admin-event-seat-clone-note">
                                    <strong>
                                        An toàn booking
                                    </strong>

                                    <span>
                                        Chỉ copy section / row / number và ánh xạ hạng vé theo code VIP, STANDARD... Không copy sold, held, holdToken hay người đang giữ ghế.
                                    </span>
                                </div>
                            </div>

                            {seatCloneMessage && (
                                <div className="admin-event-seat-clone-message is-success">
                                    {
                                        seatCloneMessage
                                    }
                                </div>
                            )}

                            {seatCloneError && (
                                <div className="admin-event-seat-clone-message is-error">
                                    {
                                        seatCloneError
                                    }
                                </div>
                            )}
                        </div>
                    </section>
                )}


                {/* ==================================================
                    ACTIONS
                    ================================================== */}

                <div className="admin-event-form-footer">
                    <div className="admin-event-form-actions">
                        <button
                            type="button"
                        className="admin-event-secondary-button admin-event-cancel-button"
                        disabled={
                            saving
                        }
                        onClick={() =>
                            navigate(
                                "/admin/events"
                            )
                        }
                    >
                        Hủy
                    </button>

                    <button
                        type="submit"
                        className="admin-event-primary-button"
                        disabled={
                            saving
                        }
                    >
                        {saving
                            ? "Đang lưu..."
                            : isEdit
                            ? "Lưu thay đổi"
                            : "Tạo concert"}
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
};

export default EventForm;