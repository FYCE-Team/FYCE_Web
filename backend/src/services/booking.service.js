import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

import Booking from "../models/Booking.js";
import Event from "../models/Event.js";
import Seat from "../models/Seat.js";
import User from "../models/User.js";
import {
    releaseExpiredHolds
} from "./seat.service.js";

const ensureObjectId = (
    value,
    fieldName
) => {
    if (
        !value ||
        !mongoose.Types.ObjectId.isValid(
            value
        )
    ) {
        throw new Error(
            `${fieldName}_INVALID`
        );
    }

    return new mongoose.Types.ObjectId(
        value
    );
};

const createServiceError = (
    code,
    details = {}
) => {
    const error = new Error(code);
    error.details = details;
    return error;
};

const normalizeSeatIds = (
    seatIds
) => {
    if (
        !Array.isArray(seatIds) ||
        seatIds.length === 0
    ) {
        throw new Error(
            "BOOKING_SEAT_IDS_REQUIRED"
        );
    }

    const uniqueIds = [
        ...new Set(
            seatIds.map((seatId) =>
                String(seatId)
            )
        )
    ];

    return uniqueIds.map((seatId) =>
        ensureObjectId(
            seatId,
            "SEAT_ID"
        )
    );
};

const normalizeHoldToken = (
    holdToken
) => {
    const normalized = String(
        holdToken || ""
    ).trim();

    if (!normalized) {
        throw new Error(
            "HOLD_TOKEN_REQUIRED"
        );
    }

    if (normalized.length > 200) {
        throw new Error(
            "HOLD_TOKEN_INVALID"
        );
    }

    return normalized;
};


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

    if (
        section === "center" &&
        VIP_ROWS.has(row)
    ) {
        return "VIP";
    }

    return "STANDARD";
};

const resolveSeatCategory = (
    seat,
    event
) => {
    const categories =
        Array.isArray(
            event?.ticketCategories
        )
            ? event.ticketCategories
            : [];

    const directMatch =
        categories.find(
            (category) =>
                String(
                    category?._id || ""
                ) ===
                String(
                    seat?.ticketCategoryId ||
                        ""
                )
        );

    if (directMatch) {
        return {
            category: directMatch,
            usedFallback: false
        };
    }

    const explicitCode =
        normalizeCategoryCode(
            seat?.ticketCategoryCode
        );

    if (explicitCode) {
        const byExplicitCode =
            categories.find(
                (category) =>
                    normalizeCategoryCode(
                        category?.code
                    ) ===
                    explicitCode
            );

        if (byExplicitCode) {
            return {
                category:
                    byExplicitCode,
                usedFallback: true
            };
        }
    }

    /*
     * Compatibility fallback for the current FYCE
     * auditorium layout:
     * - center rows B-G = VIP
     * - all remaining seats = STANDARD
     *
     * This only runs when the stored ticketCategoryId
     * no longer matches the current Event.ticketCategories.
     * It prevents old generated seats from breaking after
     * the event ticketCategories array was replaced/edited.
     */
    const inferredCode =
        inferFyceCategoryCode(seat);

    const inferredCategory =
        categories.find(
            (category) =>
                normalizeCategoryCode(
                    category?.code
                ) === inferredCode
        );

    if (inferredCategory) {
        return {
            category:
                inferredCategory,
            usedFallback: true
        };
    }

    return {
        category: null,
        usedFallback: false
    };
};

const generateBookingCode = () => {
    const datePart = new Date()
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "");

    const randomPart = randomBytes(4)
        .toString("hex")
        .toUpperCase();

    return `FYCE-${datePart}-${randomPart}`;
};

const assertEventBookable = (
    event
) => {
    const now = new Date();

    if (event.status === "sold_out") {
        throw new Error(
            "EVENT_SOLD_OUT"
        );
    }

    if (
        event.status !== "published" ||
        event.allowBooking === false
    ) {
        throw new Error(
            "EVENT_BOOKING_NOT_ALLOWED"
        );
    }

    if (
        event.bookingOpenAt &&
        new Date(event.bookingOpenAt) > now
    ) {
        throw new Error(
            "EVENT_BOOKING_NOT_OPEN"
        );
    }

    if (
        event.bookingCloseAt &&
        new Date(event.bookingCloseAt) <= now
    ) {
        throw new Error(
            "EVENT_BOOKING_CLOSED"
        );
    }

    if (
        event.startAt &&
        new Date(event.startAt) <= now
    ) {
        throw new Error(
            "EVENT_BOOKING_CLOSED"
        );
    }
};

const releaseBookingSeats = async (
    booking
) => {
    const seatIds = booking.items.map(
        (item) => item.seatId
    );

    await Seat.updateMany(
        {
            _id: {
                $in: seatIds
            },
            eventId:
                booking.eventId,
            status: "held",
            holdToken:
                booking.holdToken,
            heldByUserId:
                booking.userId
        },
        {
            $set: {
                status: "available",
                holdToken: null,
                heldByUserId: null,
                holdExpiresAt: null
            }
        }
    );
};

const expireBookingDocument = async (
    booking
) => {
    if (
        booking.status !==
        "pending_payment"
    ) {
        return booking;
    }

    if (
        !booking.holdExpiresAt ||
        booking.holdExpiresAt >
            new Date()
    ) {
        return booking;
    }

    await releaseBookingSeats(
        booking
    );

    booking.status = "expired";
    booking.expiredAt = new Date();

    await booking.save();

    return booking;
};

export const expirePendingBookings =
    async ({
        userId = null,
        eventId = null
    } = {}) => {
        const now = new Date();

        const query = {
            status: "pending_payment",
            holdExpiresAt: {
                $lte: now
            }
        };

        if (userId) {
            query.userId =
                ensureObjectId(
                    userId,
                    "USER_ID"
                );
        }

        if (eventId) {
            query.eventId =
                ensureObjectId(
                    eventId,
                    "EVENT_ID"
                );
        }

        const bookings =
            await Booking.find(query);

        for (const booking of bookings) {
            await expireBookingDocument(
                booking
            );
        }

        return {
            expiredCount:
                bookings.length
        };
    };

/*
 * Repair legacy/orphan unpaid bookings created by older seat-release logic.
 *
 * A valid pending booking must still own every booked seat as an active hold.
 * If at least one seat is no longer held by this booking, the order must not
 * remain payable. We deliberately skip candidates that already have a SOLD
 * seat because that can be the very short transition window while a payment
 * confirmation is moving the booking to confirmed.
 */
const cancelOrphanedPendingBookings =
    async ({
        userId = null,
        eventId = null
    } = {}) => {
        const now = new Date();

        const query = {
            status:
                "pending_payment",
            paymentStatus:
                "unpaid",
            holdExpiresAt: {
                $gt: now
            }
        };

        if (userId) {
            query.userId =
                ensureObjectId(
                    userId,
                    "USER_ID"
                );
        }

        if (eventId) {
            query.eventId =
                ensureObjectId(
                    eventId,
                    "EVENT_ID"
                );
        }

        const bookings =
            await Booking.find(query);

        let cancelledCount = 0;

        for (const booking of bookings) {
            const seatIds =
                booking.items.map(
                    (item) =>
                        item.seatId
                );

            const validHeldCount =
                await Seat.countDocuments({
                    _id: {
                        $in: seatIds
                    },
                    eventId:
                        booking.eventId,
                    status:
                        "held",
                    holdToken:
                        booking.holdToken,
                    heldByUserId:
                        booking.userId,
                    holdExpiresAt: {
                        $gt: now
                    }
                });

            if (
                validHeldCount ===
                seatIds.length
            ) {
                continue;
            }

            const soldSeatCount =
                await Seat.countDocuments({
                    _id: {
                        $in: seatIds
                    },
                    eventId:
                        booking.eventId,
                    status:
                        "sold"
                });

            // Do not race the payment confirmation path.
            if (soldSeatCount > 0) {
                continue;
            }

            const cancelledBooking =
                await Booking.findOneAndUpdate(
                    {
                        _id:
                            booking._id,
                        status:
                            "pending_payment",
                        paymentStatus:
                            "unpaid"
                    },
                    {
                        $set: {
                            status:
                                "cancelled",
                            cancelledAt:
                                now
                        }
                    },
                    {
                        new: true
                    }
                );

            if (!cancelledBooking) {
                continue;
            }

            await releaseBookingSeats(
                cancelledBooking
            );

            cancelledCount += 1;
        }

        return {
            cancelledCount
        };
    };

export const getActiveBookingByEvent =
    async (
        eventId,
        userId
    ) => {
        const normalizedEventId =
            ensureObjectId(
                eventId,
                "EVENT_ID"
            );

        const normalizedUserId =
            ensureObjectId(
                userId,
                "USER_ID"
            );

        await expirePendingBookings({
            userId:
                normalizedUserId,
            eventId:
                normalizedEventId
        });

        await cancelOrphanedPendingBookings({
            userId:
                normalizedUserId,
            eventId:
                normalizedEventId
        });

        return Booking.findOne({
            userId:
                normalizedUserId,
            eventId:
                normalizedEventId,
            status:
                "pending_payment",
            paymentStatus: {
                $in: [
                    "unpaid",
                    "processing"
                ]
            },
            holdExpiresAt: {
                $gt: new Date()
            }
        })
            .sort({
                createdAt: -1
            });
    };

const releaseUncommittedHold = async (
    {
        eventId,
        userId,
        holdToken
    }
) => {
    if (!holdToken) {
        return;
    }

    await Seat.updateMany(
        {
            eventId,
            status: "held",
            heldByUserId: userId,
            holdToken
        },
        {
            $set: {
                status: "available",
                holdToken: null,
                heldByUserId: null,
                holdExpiresAt: null
            }
        }
    );
};

/*
 * ============================================================
 * CHECKOUT PREVIEW — KHÔNG TẠO BOOKING DOCUMENT
 * ============================================================
 *
 * Dùng ở bước user đã giữ ghế và bấm "Tiếp tục".
 * Hàm này chỉ xác thực hold + tính lại giá ở backend rồi trả dữ liệu
 * để Checkout hiển thị. KHÔNG gọi Booking.create().
 *
 * Booking chỉ được tạo sau này khi user thực sự bắt đầu thanh toán.
 */
export const previewBooking = async (
    {
        eventId,
        seatIds,
        holdToken
    },
    userId
) => {
    const normalizedEventId =
        ensureObjectId(
            eventId,
            "EVENT_ID"
        );

    const normalizedUserId =
        ensureObjectId(
            userId,
            "USER_ID"
        );

    const normalizedSeatIds =
        normalizeSeatIds(
            seatIds
        );

    const normalizedHoldToken =
        normalizeHoldToken(
            holdToken
        );

    await releaseExpiredHolds(
        normalizedEventId
    );

    const [
        event,
        user
    ] = await Promise.all([
        Event.findById(
            normalizedEventId
        ).lean(),
        User.findById(
            normalizedUserId
        ).lean()
    ]);

    if (!event) {
        throw new Error(
            "EVENT_NOT_FOUND"
        );
    }

    if (!user) {
        throw new Error(
            "USER_NOT_FOUND"
        );
    }

    if (user.isActive === false) {
        throw new Error(
            "USER_INACTIVE"
        );
    }

    assertEventBookable(event);

    const seats = await Seat.find({
        _id: {
            $in: normalizedSeatIds
        },
        eventId:
            normalizedEventId,
        isActive: true
    }).lean();

    if (
        seats.length !==
        normalizedSeatIds.length
    ) {
        throw new Error(
            "BOOKING_SEAT_NOT_FOUND"
        );
    }

    const now = new Date();

    for (const seat of seats) {
        const owned =
            seat.status === "held" &&
            seat.holdToken ===
                normalizedHoldToken &&
            String(
                seat.heldByUserId || ""
            ) ===
                String(
                    normalizedUserId
                ) &&
            seat.holdExpiresAt &&
            new Date(
                seat.holdExpiresAt
            ) > now;

        if (!owned) {
            throw createServiceError(
                "BOOKING_SEAT_HOLD_INVALID",
                {
                    seatId:
                        String(seat._id),
                    seatLabel:
                        seat.label,
                    status:
                        seat.status
                }
            );
        }
    }

    const categoryMap = new Map(
        (event.ticketCategories || [])
            .map((category) => [
                String(category._id),
                category
            ])
    );

    const categoryCounts =
        new Map();

    const categoryRepairs =
        [];

    const items = seats
        .map((seat) => {
            const {
                category,
                usedFallback
            } =
                resolveSeatCategory(
                    seat,
                    event
                );

            if (!category) {
                throw createServiceError(
                    "BOOKING_TICKET_CATEGORY_NOT_FOUND",
                    {
                        seatId:
                            String(seat._id),
                        seatLabel:
                            seat.label,
                        seatTicketCategoryId:
                            String(
                                seat.ticketCategoryId ||
                                    ""
                            ),
                        inferredCode:
                            inferFyceCategoryCode(
                                seat
                            ),
                        currentCategories:
                            (
                                event.ticketCategories ||
                                []
                            ).map(
                                (item) => ({
                                    id:
                                        String(
                                            item._id
                                        ),
                                    code:
                                        item.code,
                                    name:
                                        item.name
                                })
                            )
                    }
                );
            }

            if (
                category.isActive === false
            ) {
                throw createServiceError(
                    "BOOKING_TICKET_CATEGORY_INACTIVE",
                    {
                        categoryId:
                            String(category._id),
                        categoryName:
                            category.name
                    }
                );
            }

            if (
                usedFallback &&
                String(
                    seat.ticketCategoryId ||
                        ""
                ) !==
                    String(category._id)
            ) {
                categoryRepairs.push({
                    updateOne: {
                        filter: {
                            _id: seat._id,
                            eventId:
                                normalizedEventId
                        },
                        update: {
                            $set: {
                                ticketCategoryId:
                                    category._id
                            }
                        }
                    }
                });
            }

            const categoryId =
                String(category._id);

            categoryCounts.set(
                categoryId,
                (categoryCounts.get(
                    categoryId
                ) || 0) + 1
            );

            return {
                seatId: seat._id,
                seatLabel: seat.label,
                section: seat.section,
                row: seat.row,
                number: seat.number,
                ticketCategoryId:
                    category._id,
                ticketCategoryCode:
                    category.code,
                ticketCategoryName:
                    category.name,
                unitPrice:
                    Number(
                        category.price
                    ) || 0
            };
        })
        .sort((a, b) => {
            if (a.row !== b.row) {
                return a.row.localeCompare(
                    b.row,
                    "vi"
                );
            }

            return a.number - b.number;
        });

    if (categoryRepairs.length > 0) {
        await Seat.bulkWrite(
            categoryRepairs,
            {
                ordered: false
            }
        );
    }

    for (
        const [
            categoryId,
            count
        ] of categoryCounts.entries()
    ) {
        const category =
            categoryMap.get(
                categoryId
            );

        const maxPerOrder =
            Number(
                category?.maxPerOrder
            ) || 6;

        if (count > maxPerOrder) {
            throw createServiceError(
                "BOOKING_MAX_PER_ORDER_EXCEEDED",
                {
                    categoryName:
                        category?.name ||
                        "Hạng vé",
                    maxPerOrder,
                    requested: count
                }
            );
        }
    }

    const holdExpiresAt =
        seats.reduce(
            (earliest, seat) => {
                const current = new Date(
                    seat.holdExpiresAt
                );

                if (
                    !earliest ||
                    current < earliest
                ) {
                    return current;
                }

                return earliest;
            },
            null
        );

    if (
        !holdExpiresAt ||
        holdExpiresAt <= new Date()
    ) {
        throw new Error(
            "BOOKING_HOLD_EXPIRED"
        );
    }

    const subtotal = items.reduce(
        (sum, item) =>
            sum + item.unitPrice,
        0
    );

    return {
        eventId:
            normalizedEventId,
        eventSnapshot: {
            title: event.title,
            slug: event.slug,
            startAt:
                event.startAt || null,
            venue:
                event.venue || "",
            address:
                event.address || ""
        },
        customer: {
            fullName:
                user.fullName,
            email:
                user.email,
            phone:
                user.phone || ""
        },
        items,
        subtotal,
        totalAmount: subtotal,
        holdToken:
            normalizedHoldToken,
        holdExpiresAt
    };
};

export const createBooking = async (
    {
        eventId,
        seatIds,
        holdToken
    },
    userId
) => {
    const normalizedEventId =
        ensureObjectId(
            eventId,
            "EVENT_ID"
        );

    const normalizedUserId =
        ensureObjectId(
            userId,
            "USER_ID"
        );

    const normalizedSeatIds =
        normalizeSeatIds(
            seatIds
        );

    const normalizedHoldToken =
        normalizeHoldToken(
            holdToken
        );

    await releaseExpiredHolds(
        normalizedEventId
    );

    await expirePendingBookings({
        userId: normalizedUserId,
        eventId: normalizedEventId
    });

    const [
        event,
        user
    ] = await Promise.all([
        Event.findById(
            normalizedEventId
        ).lean(),
        User.findById(
            normalizedUserId
        ).lean()
    ]);

    if (!event) {
        throw new Error(
            "EVENT_NOT_FOUND"
        );
    }

    if (!user) {
        throw new Error(
            "USER_NOT_FOUND"
        );
    }

    if (user.isActive === false) {
        throw new Error(
            "USER_INACTIVE"
        );
    }

    assertEventBookable(event);

    const existingBooking =
        await Booking.findOne({
            userId:
                normalizedUserId,
            eventId:
                normalizedEventId,
            holdToken:
                normalizedHoldToken,
            status:
                "pending_payment",
            holdExpiresAt: {
                $gt: new Date()
            }
        });

    if (existingBooking) {
        return existingBooking;
    }

    const activeBooking =
        await getActiveBookingByEvent(
            normalizedEventId,
            normalizedUserId
        );

    if (activeBooking) {
        await releaseUncommittedHold({
            eventId:
                normalizedEventId,
            userId:
                normalizedUserId,
            holdToken:
                normalizedHoldToken
        });

        throw createServiceError(
            "ACTIVE_BOOKING_EXISTS",
            {
                bookingCode:
                    activeBooking.bookingCode,
                holdExpiresAt:
                    activeBooking.holdExpiresAt
            }
        );
    }

    const seats = await Seat.find({
        _id: {
            $in: normalizedSeatIds
        },
        eventId:
            normalizedEventId,
        isActive: true
    }).lean();

    if (
        seats.length !==
        normalizedSeatIds.length
    ) {
        throw new Error(
            "BOOKING_SEAT_NOT_FOUND"
        );
    }

    const now = new Date();

    for (const seat of seats) {
        const owned =
            seat.status === "held" &&
            seat.holdToken ===
                normalizedHoldToken &&
            String(
                seat.heldByUserId || ""
            ) ===
                String(
                    normalizedUserId
                ) &&
            seat.holdExpiresAt &&
            new Date(
                seat.holdExpiresAt
            ) > now;

        if (!owned) {
            throw createServiceError(
                "BOOKING_SEAT_HOLD_INVALID",
                {
                    seatId:
                        String(seat._id),
                    seatLabel:
                        seat.label,
                    status:
                        seat.status
                }
            );
        }
    }

    const categoryMap = new Map(
        (event.ticketCategories || [])
            .map((category) => [
                String(category._id),
                category
            ])
    );

    const categoryCounts =
        new Map();

    const categoryRepairs =
        [];

    const items = seats
        .map((seat) => {
            const {
                category,
                usedFallback
            } =
                resolveSeatCategory(
                    seat,
                    event
                );

            if (!category) {
                throw createServiceError(
                    "BOOKING_TICKET_CATEGORY_NOT_FOUND",
                    {
                        seatId:
                            String(seat._id),
                        seatLabel:
                            seat.label,
                        seatTicketCategoryId:
                            String(
                                seat.ticketCategoryId ||
                                    ""
                            ),
                        inferredCode:
                            inferFyceCategoryCode(
                                seat
                            ),
                        currentCategories:
                            (
                                event.ticketCategories ||
                                []
                            ).map(
                                (item) => ({
                                    id:
                                        String(
                                            item._id
                                        ),
                                    code:
                                        item.code,
                                    name:
                                        item.name
                                })
                            )
                    }
                );
            }

            if (
                category.isActive === false
            ) {
                throw createServiceError(
                    "BOOKING_TICKET_CATEGORY_INACTIVE",
                    {
                        categoryId:
                            String(category._id),
                        categoryName:
                            category.name
                    }
                );
            }

            if (
                usedFallback &&
                String(
                    seat.ticketCategoryId ||
                        ""
                ) !==
                    String(category._id)
            ) {
                categoryRepairs.push({
                    updateOne: {
                        filter: {
                            _id: seat._id,
                            eventId:
                                normalizedEventId
                        },
                        update: {
                            $set: {
                                ticketCategoryId:
                                    category._id
                            }
                        }
                    }
                });
            }

            const categoryId =
                String(category._id);

            categoryCounts.set(
                categoryId,
                (categoryCounts.get(
                    categoryId
                ) || 0) + 1
            );

            return {
                seatId: seat._id,
                seatLabel: seat.label,
                section: seat.section,
                row: seat.row,
                number: seat.number,
                ticketCategoryId:
                    category._id,
                ticketCategoryCode:
                    category.code,
                ticketCategoryName:
                    category.name,
                unitPrice:
                    Number(
                        category.price
                    ) || 0,
                ticketCode: `TKT-${randomBytes(6).toString("hex").toUpperCase()}`
            };
        })
        .sort((a, b) => {
            if (a.row !== b.row) {
                return a.row.localeCompare(
                    b.row,
                    "vi"
                );
            }

            return a.number - b.number;
        });

    if (categoryRepairs.length > 0) {
        await Seat.bulkWrite(
            categoryRepairs,
            {
                ordered: false
            }
        );
    }

    for (
        const [
            categoryId,
            count
        ] of categoryCounts.entries()
    ) {
        const category =
            categoryMap.get(
                categoryId
            );

        const maxPerOrder =
            Number(
                category?.maxPerOrder
            ) || 6;

        if (count > maxPerOrder) {
            throw createServiceError(
                "BOOKING_MAX_PER_ORDER_EXCEEDED",
                {
                    categoryName:
                        category?.name ||
                        "Hạng vé",
                    maxPerOrder,
                    requested: count
                }
            );
        }
    }

    const holdExpiresAt =
        seats.reduce(
            (earliest, seat) => {
                const current = new Date(
                    seat.holdExpiresAt
                );

                if (
                    !earliest ||
                    current < earliest
                ) {
                    return current;
                }

                return earliest;
            },
            null
        );

    if (
        !holdExpiresAt ||
        holdExpiresAt <= new Date()
    ) {
        throw new Error(
            "BOOKING_HOLD_EXPIRED"
        );
    }

    const subtotal = items.reduce(
        (sum, item) =>
            sum + item.unitPrice,
        0
    );

    const booking = await Booking.create({
        bookingCode:
            generateBookingCode(),
        userId:
            normalizedUserId,
        eventId:
            normalizedEventId,
        eventSnapshot: {
            title: event.title,
            slug: event.slug,
            startAt:
                event.startAt || null,
            venue:
                event.venue || "",
            address:
                event.address || ""
        },
        customer: {
            fullName:
                user.fullName,
            email:
                user.email,
            phone:
                user.phone || ""
        },
        items,
        subtotal,
        totalAmount: subtotal,
        holdToken:
            normalizedHoldToken,
        holdExpiresAt,
        status: "pending_payment",
        paymentStatus: "unpaid"
    });

    return booking;
};

export const getBookingByCode =
    async (
        bookingCode,
        userId
    ) => {
        const normalizedUserId =
            ensureObjectId(
                userId,
                "USER_ID"
            );

        const normalizedCode =
            String(
                bookingCode || ""
            )
                .trim()
                .toUpperCase();

        if (!normalizedCode) {
            throw new Error(
                "BOOKING_CODE_REQUIRED"
            );
        }

        let booking =
            await Booking.findOne({
                bookingCode:
                    normalizedCode,
                userId:
                    normalizedUserId
            });

        if (!booking) {
            throw new Error(
                "BOOKING_NOT_FOUND"
            );
        }

        booking =
            await expireBookingDocument(
                booking
            );

        return booking;
    };

export const getMyBookings =
    async (
        userId,
        {
            status = null,
            limit = 50
        } = {}
    ) => {
        const normalizedUserId =
            ensureObjectId(
                userId,
                "USER_ID"
            );

        await expirePendingBookings({
            userId:
                normalizedUserId
        });

        await cancelOrphanedPendingBookings({
            userId:
                normalizedUserId
        });

        const query = {
            userId:
                normalizedUserId
        };

        if (status) {
            const allowedStatuses =
                new Set([
                    "pending_payment",
                    "confirmed",
                    "expired",
                    "cancelled"
                ]);

            if (
                !allowedStatuses.has(
                    status
                )
            ) {
                throw new Error(
                    "BOOKING_STATUS_INVALID"
                );
            }

            query.status = status;
        }

        const safeLimit = Math.min(
            Math.max(
                Number(limit) || 50,
                1
            ),
            100
        );

        return Booking.find(query)
            .sort({
                createdAt: -1
            })
            .limit(safeLimit)
            .lean();
    };

export const cancelBooking = async (
    bookingCode,
    userId
) => {
    const booking =
        await getBookingByCode(
            bookingCode,
            userId
        );

    if (
        booking.status === "expired"
    ) {
        throw new Error(
            "BOOKING_ALREADY_EXPIRED"
        );
    }

    if (
        booking.status === "cancelled"
    ) {
        return booking;
    }

    if (
        booking.status !==
        "pending_payment" ||
        booking.paymentStatus === "paid"
    ) {
        throw new Error(
            "BOOKING_CANCEL_NOT_ALLOWED"
        );
    }

    await releaseBookingSeats(
        booking
    );

    booking.status = "cancelled";
    booking.cancelledAt = new Date();

    await booking.save();

    return booking;
};
