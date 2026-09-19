import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Event from "../models/Event.js";
import Seat from "../models/Seat.js";
import Booking from "../models/Booking.js";
import {
    createSeatHistoryEntry
} from "./seatHistory.service.js";

const normalizeSection = (
    value
) => {
    return String(value || "")
        .trim()
        .toLowerCase();
};

const normalizeRow = (
    value
) => {
    return String(value || "")
        .trim()
        .toUpperCase();
};

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

const SEAT_HOLD_MINUTES =
    Math.max(
        1,
        Number(
            process.env.SEAT_HOLD_MINUTES
        ) || 10
    );

const SEAT_HOLD_DURATION_MS =
    SEAT_HOLD_MINUTES *
    60 *
    1000;

const createServiceError = (
    code,
    details = {}
) => {
    const error =
        new Error(code);

    error.details =
        details;

    return error;
};

const sanitizeSeatForClient = (
    seat
) => {
    const clean =
        seat?.toObject
            ? seat.toObject()
            : {
                  ...seat
              };

    delete clean.holdToken;
    delete clean.heldByUserId;
    delete clean.holdExpiresAt;
    delete clean.blockedReason;
    delete clean.blockedAt;
    delete clean.blockedByUserId;
    delete clean.adminStatusUpdatedAt;
    delete clean.adminStatusUpdatedByUserId;

    return clean;
};

const sanitizeSeatForAdmin = (
    seat
) => {
    const clean =
        seat?.toObject
            ? seat.toObject()
            : {
                  ...seat
              };

    // Never expose the hold token, even to the admin UI.
    delete clean.holdToken;
    delete clean.heldByUserId;

    return clean;
};

const normalizeBlockReason = (
    value
) => {
    const reason = String(
        value || ""
    ).trim();

    if (!reason) {
        throw new Error(
            "SEAT_BLOCK_REASON_REQUIRED"
        );
    }

    if (
        reason.length < 3 ||
        reason.length > 300
    ) {
        throw new Error(
            "SEAT_BLOCK_REASON_INVALID"
        );
    }

    return reason;
};

const normalizeSeatIds = (
    seatIds
) => {
    if (
        !Array.isArray(seatIds) ||
        seatIds.length === 0
    ) {
        throw new Error(
            "SEAT_IDS_REQUIRED"
        );
    }

    const uniqueIds =
        [
            ...new Set(
                seatIds.map(
                    (seatId) =>
                        String(seatId)
                )
            )
        ];

    return uniqueIds.map(
        (seatId) =>
            ensureObjectId(
                seatId,
                "SEAT_ID"
            )
    );
};

const normalizeHoldToken = (
    holdToken,
    {
        required = false
    } = {}
) => {
    const normalized =
        String(
            holdToken || ""
        ).trim();

    if (
        required &&
        !normalized
    ) {
        throw new Error(
            "HOLD_TOKEN_REQUIRED"
        );
    }

    if (
        normalized &&
        normalized.length > 200
    ) {
        throw new Error(
            "HOLD_TOKEN_INVALID"
        );
    }

    return normalized ||
        null;
};

export const releaseExpiredHolds =
    async (
        eventId = null
    ) => {
        const now =
            new Date();

        const query = {
            status: "held",
            holdExpiresAt: {
                $ne: null,
                $lte: now
            }
        };

        if (eventId) {
            query.eventId =
                ensureObjectId(
                    eventId,
                    "EVENT_ID"
                );
        }

        const result =
            await Seat.updateMany(
                query,
                {
                    $set: {
                        status:
                            "available",
                        holdToken:
                            null,
                        heldByUserId:
                            null,
                        holdExpiresAt:
                            null
                    }
                }
            );

        return {
            releasedCount:
                result.modifiedCount ||
                0
        };
    };

/*
 * ============================================================
 * ACTIVE HOLD SESSION OF CURRENT USER
 * ============================================================
 *
 * Hold state is stored in MongoDB, not in the browser.
 * This lets the same account resume the same hold from another
 * browser/device without exposing another user's hold token.
 *
 * Legacy safety: older code could create more than one holdToken
 * for the same user + event. We collapse those active holds into
 * one canonical token and one deadline (the earliest deadline),
 * so every browser sees one shared hold session.
 */

const loadCanonicalUserHoldSession =
    async (
        eventObjectId,
        userObjectId
    ) => {
        const now = new Date();

        const heldSeats =
            await Seat.find({
                eventId:
                    eventObjectId,

                status:
                    "held",

                heldByUserId:
                    userObjectId,

                holdExpiresAt: {
                    $ne: null,
                    $gt: now
                },

                isActive:
                    true
            })
                .sort({
                    holdExpiresAt: 1,
                    createdAt: 1,
                    _id: 1
                });

        if (
            heldSeats.length === 0
        ) {
            return null;
        }

        const firstTokenSeat =
            heldSeats.find(
                (seat) =>
                    normalizeHoldToken(
                        seat.holdToken
                    )
            );

        const canonicalToken =
            normalizeHoldToken(
                firstTokenSeat
                    ?.holdToken
            ) ||
            randomUUID();

        const canonicalExpiresAt =
            heldSeats.reduce(
                (earliest, seat) => {
                    if (
                        !seat.holdExpiresAt
                    ) {
                        return earliest;
                    }

                    if (
                        !earliest ||
                        seat.holdExpiresAt <
                            earliest
                    ) {
                        return seat.holdExpiresAt;
                    }

                    return earliest;
                },
                null
            );

        if (
            !canonicalExpiresAt ||
            canonicalExpiresAt <=
                now
        ) {
            return null;
        }

        const needsRepair =
            heldSeats.some(
                (seat) =>
                    seat.holdToken !==
                        canonicalToken ||
                    !seat.holdExpiresAt ||
                    seat.holdExpiresAt.getTime() !==
                        canonicalExpiresAt.getTime()
            );

        if (needsRepair) {
            await Seat.updateMany(
                {
                    _id: {
                        $in:
                            heldSeats.map(
                                (seat) =>
                                    seat._id
                            )
                    },

                    eventId:
                        eventObjectId,

                    status:
                        "held",

                    heldByUserId:
                        userObjectId,

                    holdExpiresAt: {
                        $gt: now
                    }
                },
                {
                    $set: {
                        holdToken:
                            canonicalToken,

                        holdExpiresAt:
                            canonicalExpiresAt
                    }
                }
            );
        }

        return {
            eventId:
                eventObjectId,

            holdToken:
                canonicalToken,

            holdExpiresAt:
                canonicalExpiresAt,

            holdMinutes:
                SEAT_HOLD_MINUTES,

            seats:
                heldSeats.map(
                    sanitizeSeatForClient
                )
        };
    };

export const getActiveHoldSession =
    async (
        eventId,
        userId
    ) => {
        const event =
            await getEvent(
                eventId
            );

        const normalizedUserId =
            ensureObjectId(
                userId,
                "USER_ID"
            );

        await releaseExpiredHolds(
            event._id
        );

        return loadCanonicalUserHoldSession(
            event._id,
            normalizedUserId
        );
    };

/*
 * ============================================================
 * LOAD EVENT
 * ============================================================
 */

const getEvent = async (
    eventId
) => {
    const normalizedEventId =
        ensureObjectId(
            eventId,
            "EVENT_ID"
        );

    const event =
        await Event.findById(
            normalizedEventId
        ).lean();

    if (!event) {
        throw new Error(
            "EVENT_NOT_FOUND"
        );
    }

    return event;
};

/*
 * ============================================================
 * GET ALL SEATS OF EVENT
 * ============================================================
 */

export const getSeatsByEvent =
    async (
        eventId,
        {
            status,
            section,
            ticketCategoryId
        } = {}
    ) => {
        const event =
            await getEvent(
                eventId
            );

        await releaseExpiredHolds(
            event._id
        );

        const query = {
            eventId:
                event._id,

            isActive:
                true
        };

        if (status) {
            query.status =
                String(
                    status
                ).trim();
        }

        if (section) {
            query.section =
                normalizeSection(
                    section
                );
        }

        if (ticketCategoryId) {
            query.ticketCategoryId =
                ensureObjectId(
                    ticketCategoryId,
                    "TICKET_CATEGORY_ID"
                );
        }

        const seats =
            await Seat.find(
                query
            )
                .sort({
                    section: 1,
                    row: 1,
                    number: 1
                })
                .lean();

        return {
            event,
            seats:
                seats.map(
                    sanitizeSeatForClient
                )
        };
    };

/*
 * ============================================================
 * ADMIN: GET ALL SEATS OF EVENT
 * ============================================================
 *
 * Returns operational fields needed by the admin seat manager,
 * but never exposes holdToken.
 */

export const getAdminSeatsByEvent =
    async (
        eventId
    ) => {
        const event =
            await getEvent(
                eventId
            );

        await releaseExpiredHolds(
            event._id
        );

        const seats =
            await Seat.find({
                eventId:
                    event._id,
                isActive:
                    true
            })
                .sort({
                    section: 1,
                    row: 1,
                    number: 1
                })
                .lean();

        return {
            event: {
                _id: event._id,
                title: event.title,
                status: event.status,
                ticketCategories:
                    event.ticketCategories || []
            },
            seats:
                seats.map(
                    sanitizeSeatForAdmin
                )
        };
    };

/*
 * ============================================================
 * GET ONE SEAT
 * ============================================================
 */

export const getSeatById =
    async (
        seatId
    ) => {
        const normalizedSeatId =
            ensureObjectId(
                seatId,
                "SEAT_ID"
            );

        const seat =
            await Seat.findById(
                normalizedSeatId
            ).lean();

        if (!seat) {
            throw new Error(
                "SEAT_NOT_FOUND"
            );
        }

        return sanitizeSeatForClient(
            seat
        );
    };

/*
 * ============================================================
 * GET SEAT BY POSITION
 * ============================================================
 */

export const getSeatByPosition =
    async (
        eventId,
        {
            section,
            row,
            number
        }
    ) => {
        const event =
            await getEvent(
                eventId
            );

        const normalizedSection =
            normalizeSection(
                section
            );

        const normalizedRow =
            normalizeRow(
                row
            );

        const normalizedNumber =
            Number(
                number
            );

        if (
            !normalizedSection
        ) {
            throw new Error(
                "SEAT_SECTION_INVALID"
            );
        }

        if (
            !normalizedRow
        ) {
            throw new Error(
                "SEAT_ROW_INVALID"
            );
        }

        if (
            !Number.isInteger(
                normalizedNumber
            ) ||
            normalizedNumber < 1
        ) {
            throw new Error(
                "SEAT_NUMBER_INVALID"
            );
        }

        const seat =
            await Seat.findOne({
                eventId:
                    event._id,

                section:
                    normalizedSection,

                row:
                    normalizedRow,

                number:
                    normalizedNumber,

                isActive:
                    true
            }).lean();

        if (!seat) {
            throw new Error(
                "SEAT_NOT_FOUND"
            );
        }

        return sanitizeSeatForClient(
            seat
        );
    };

/*
 * ============================================================
 * GET AVAILABLE SEATS
 * ============================================================
 */

export const getAvailableSeats =
    async (
        eventId
    ) => {
        const event =
            await getEvent(
                eventId
            );

        await releaseExpiredHolds(
            event._id
        );

        const seats =
            await Seat.find({
                eventId:
                    event._id,

                status:
                    "available",

                isActive:
                    true
            })
                .sort({
                    section: 1,
                    row: 1,
                    number: 1
                })
                .lean();

        return seats.map(
            sanitizeSeatForClient
        );
    };

/*
 * ============================================================
 * GET SEAT SUMMARY
 * ============================================================
 */

export const getSeatSummary =
    async (
        eventId
    ) => {
        const event =
            await getEvent(
                eventId
            );

        await releaseExpiredHolds(
            event._id
        );

        const seats =
            await Seat.find({
                eventId:
                    event._id,

                isActive:
                    true
            }).lean();

        const summary = {
            total: seats.length,

            available: 0,
            held: 0,
            sold: 0,
            blocked: 0,

            bySection: {},

            byCategory: {}
        };

        for (
            const seat of seats
        ) {
            if (
                summary[
                    seat.status
                ] !== undefined
            ) {
                summary[
                    seat.status
                ]++;
            }

            if (
                !summary.bySection[
                    seat.section
                ]
            ) {
                summary.bySection[
                    seat.section
                ] = {
                    total: 0,
                    available: 0,
                    held: 0,
                    sold: 0,
                    blocked: 0
                };
            }

            const sectionSummary =
                summary.bySection[
                    seat.section
                ];

            sectionSummary.total++;

            if (
                sectionSummary[
                    seat.status
                ] !== undefined
            ) {
                sectionSummary[
                    seat.status
                ]++;
            }

            const categoryId =
                String(
                    seat.ticketCategoryId
                );

            if (
                !summary.byCategory[
                    categoryId
                ]
            ) {
                summary.byCategory[
                    categoryId
                ] = {
                    total: 0,
                    available: 0,
                    held: 0,
                    sold: 0,
                    blocked: 0
                };
            }

            const categorySummary =
                summary.byCategory[
                    categoryId
                ];

            categorySummary.total++;

            if (
                categorySummary[
                    seat.status
                ] !== undefined
            ) {
                categorySummary[
                    seat.status
                ]++;
            }
        }

        return {
            eventId:
                event._id,

            summary
        };
    };

/*
 * ============================================================
 * AUTHENTICATED: HOLD SEATS
 * ============================================================
 *
 * available -> held
 *
 * Nếu một ghế trong batch không giữ được,
 * các ghế vừa giữ trong request hiện tại sẽ được rollback.
 */

export const holdSeats =
    async (
        eventId,
        seatIds,
        userId,
        holdToken = null
    ) => {
        const event =
            await getEvent(
                eventId
            );

        const normalizedUserId =
            ensureObjectId(
                userId,
                "USER_ID"
            );

        await releaseExpiredHolds(
            event._id
        );

        const normalizedSeatIds =
            normalizeSeatIds(
                seatIds
            );

        const requestedToken =
            normalizeHoldToken(
                holdToken
            );

        const now =
            new Date();

        let effectiveToken =
            null;

        let holdExpiresAt =
            null;

        /*
         * First priority: if this ACCOUNT already has an active
         * hold for the event, every browser/device must reuse it.
         * sessionStorage is intentionally not the source of truth.
         */
        const accountHoldSession =
            await loadCanonicalUserHoldSession(
                event._id,
                normalizedUserId
            );

        if (accountHoldSession) {
            effectiveToken =
                accountHoldSession
                    .holdToken;

            holdExpiresAt =
                accountHoldSession
                    .holdExpiresAt;
        }

        /*
         * Backward-compatible token path. This is mainly useful
         * when the caller has a token but there are no active seats
         * visible for the account yet. A token owned by another
         * account is still rejected.
         */
        if (
            !effectiveToken &&
            requestedToken
        ) {
            const existingHold =
                await Seat.findOne({
                    eventId:
                        event._id,

                    status:
                        "held",

                    holdToken:
                        requestedToken,

                    holdExpiresAt: {
                        $gt: now
                    },

                    isActive:
                        true
                }).lean();

            if (existingHold) {
                if (
                    String(
                        existingHold
                            .heldByUserId ||
                            ""
                    ) !==
                    String(
                        normalizedUserId
                    )
                ) {
                    throw createServiceError(
                        "HOLD_TOKEN_NOT_OWNED"
                    );
                }

                effectiveToken =
                    requestedToken;

                holdExpiresAt =
                    existingHold
                        .holdExpiresAt;
            }
        }

        if (!effectiveToken) {
            effectiveToken =
                randomUUID();

            holdExpiresAt =
                new Date(
                    now.getTime() +
                    SEAT_HOLD_DURATION_MS
                );
        }

        const newlyHeldIds =
            [];

        const resultSeats =
            [];

        try {
            for (
                const seatId of
                normalizedSeatIds
            ) {
                const heldSeat =
                    await Seat.findOneAndUpdate(
                        {
                            _id:
                                seatId,

                            eventId:
                                event._id,

                            isActive:
                                true,

                            status:
                                "available"
                        },
                        {
                            $set: {
                                status:
                                    "held",

                                holdToken:
                                    effectiveToken,

                                heldByUserId:
                                    normalizedUserId,

                                holdExpiresAt
                            }
                        },
                        {
                            returnDocument:
                                "after"
                        }
                    );

                if (heldSeat) {
                    newlyHeldIds.push(
                        heldSeat._id
                    );

                    resultSeats.push(
                        heldSeat
                    );

                    continue;
                }

                const currentSeat =
                    await Seat.findOne({
                        _id:
                            seatId,

                        eventId:
                            event._id,

                        isActive:
                            true
                    });

                if (!currentSeat) {
                    throw createServiceError(
                        "SEAT_NOT_FOUND",
                        {
                            seatId:
                                String(
                                    seatId
                                )
                        }
                    );
                }

                const isOwnedBySameHold =
                    currentSeat.status ===
                        "held" &&
                    currentSeat.holdToken ===
                        effectiveToken &&
                    String(
                        currentSeat
                            .heldByUserId ||
                            ""
                    ) ===
                        String(
                            normalizedUserId
                        ) &&
                    currentSeat.holdExpiresAt &&
                    currentSeat.holdExpiresAt >
                        now;

                if (
                    isOwnedBySameHold
                ) {
                    resultSeats.push(
                        currentSeat
                    );

                    continue;
                }

                throw createServiceError(
                    "SEAT_NOT_AVAILABLE",
                    {
                        seatId:
                            String(
                                currentSeat._id
                            ),

                        seatLabel:
                            currentSeat.label,

                        status:
                            currentSeat.status
                    }
                );
            }
        } catch (error) {
            if (
                newlyHeldIds.length >
                0
            ) {
                await Seat.updateMany(
                    {
                        _id: {
                            $in:
                                newlyHeldIds
                        },

                        eventId:
                            event._id,

                        status:
                            "held",

                        holdToken:
                            effectiveToken,

                        heldByUserId:
                            normalizedUserId
                    },
                    {
                        $set: {
                            status:
                                "available",

                            holdToken:
                                null,

                            heldByUserId:
                                null,

                            holdExpiresAt:
                                null
                        }
                    }
                );
            }

            throw error;
        }

        /*
         * Re-read the account session after the atomic seat updates.
         * This closes the small race where two browsers start holding
         * different seats at almost the same moment and initially create
         * different tokens. The response always converges to one account
         * session and returns ALL seats currently held by that account.
         */
        const canonicalSession =
            await loadCanonicalUserHoldSession(
                event._id,
                normalizedUserId
            );

        if (canonicalSession) {
            return canonicalSession;
        }

        return {
            eventId:
                event._id,

            holdToken:
                effectiveToken,

            holdExpiresAt,

            holdMinutes:
                SEAT_HOLD_MINUTES,

            seats:
                resultSeats.map(
                    sanitizeSeatForClient
                )
        };
    };

/*
 * ============================================================
 * AUTHENTICATED: RELEASE HELD SEATS
 * ============================================================
 *
 * Chỉ holdToken sở hữu ghế mới được release.
 */

export const releaseHeldSeats =
    async (
        eventId,
        seatIds,
        userId,
        holdToken
    ) => {
        const event =
            await getEvent(
                eventId
            );

        const normalizedUserId =
            ensureObjectId(
                userId,
                "USER_ID"
            );

        await releaseExpiredHolds(
            event._id
        );

        const normalizedHoldToken =
            normalizeHoldToken(
                holdToken,
                {
                    required:
                        true
                }
            );

        /*
         * Resolve the account's canonical session first. If another
         * browser still has an older token from a legacy split hold,
         * the authenticated account can still release its own seats.
         */
        const accountHoldSession =
            await loadCanonicalUserHoldSession(
                event._id,
                normalizedUserId
            );

        const effectiveHoldToken =
            accountHoldSession
                ?.holdToken ||
            normalizedHoldToken;

        const normalizedSeatIds =
            normalizeSeatIds(
                seatIds
            );

        const seats =
            await Seat.find({
                _id: {
                    $in:
                        normalizedSeatIds
                },

                eventId:
                    event._id,

                isActive:
                    true
            }).lean();

        if (
            seats.length !==
            normalizedSeatIds.length
        ) {
            throw new Error(
                "SEAT_NOT_FOUND"
            );
        }

        const invalidSeat =
            seats.find(
                (seat) =>
                    seat.status !==
                        "held" ||
                    seat.holdToken !==
                        effectiveHoldToken ||
                    String(
                        seat.heldByUserId ||
                            ""
                    ) !==
                        String(
                            normalizedUserId
                        )
            );

        if (invalidSeat) {
            throw createServiceError(
                "SEAT_RELEASE_NOT_ALLOWED",
                {
                    seatId:
                        String(
                            invalidSeat._id
                        ),

                    seatLabel:
                        invalidSeat.label,

                    status:
                        invalidSeat.status
                }
            );
        }

        /*
         * A pending booking freezes the exact seat list and amount sent to
         * SePay. Releasing one of those booked seats without cancelling the
         * booking creates an orphan booking: the seat becomes available, but
         * "My tickets" still shows an unpaid order for that seat.
         *
         * Business rule:
         * - If the released seat belongs to an UNPAID pending booking, cancel
         *   the whole booking and release every seat of that booking.
         * - If payment is already being processed/paid, do not let the seat
         *   map mutate the booking.
         *
         * This keeps Booking <-> Seat <-> SePay amount immutable once a
         * booking document exists.
         */
        const linkedBooking =
            await Booking.findOne({
                eventId:
                    event._id,
                userId:
                    normalizedUserId,
                status:
                    "pending_payment",
                "items.seatId": {
                    $in:
                        normalizedSeatIds
                }
            });

        if (
            linkedBooking &&
            linkedBooking.paymentStatus !==
                "unpaid"
        ) {
            throw createServiceError(
                "SEAT_RELEASE_BOOKING_PAYMENT_IN_PROGRESS",
                {
                    bookingCode:
                        linkedBooking.bookingCode,
                    paymentStatus:
                        linkedBooking.paymentStatus
                }
            );
        }

        let cancelledBooking =
            null;

        let seatIdsToRelease =
            normalizedSeatIds;

        if (linkedBooking) {
            cancelledBooking =
                await Booking.findOneAndUpdate(
                    {
                        _id:
                            linkedBooking._id,
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
                                new Date()
                        }
                    },
                    {
                        new: true
                    }
                );

            if (!cancelledBooking) {
                throw createServiceError(
                    "SEAT_RELEASE_BOOKING_STATE_CHANGED",
                    {
                        bookingCode:
                            linkedBooking.bookingCode
                    }
                );
            }

            const bookingSeatIds =
                linkedBooking.items.map(
                    (item) =>
                        item.seatId
                );

            const uniqueReleaseIds =
                new Map();

            [
                ...bookingSeatIds,
                ...normalizedSeatIds
            ].forEach((seatId) => {
                uniqueReleaseIds.set(
                    String(seatId),
                    seatId
                );
            });

            seatIdsToRelease =
                [
                    ...uniqueReleaseIds.values()
                ];
        }

        const result =
            await Seat.updateMany(
                {
                    _id: {
                        $in:
                            seatIdsToRelease
                    },

                    eventId:
                        event._id,

                    status:
                        "held",

                    holdToken:
                        effectiveHoldToken,

                    heldByUserId:
                        normalizedUserId
                },
                {
                    $set: {
                        status:
                            "available",

                        holdToken:
                            null,

                        heldByUserId:
                            null,

                        holdExpiresAt:
                            null
                    }
                }
            );

        const remainingHoldSession =
            await loadCanonicalUserHoldSession(
                event._id,
                normalizedUserId
            );

        return {
            eventId:
                event._id,

            releasedSeatIds:
                seatIdsToRelease.map(
                    (seatId) =>
                        String(seatId)
                ),

            releasedCount:
                result.modifiedCount ||
                0,

            bookingCancelled:
                Boolean(
                    cancelledBooking
                ),

            cancelledBookingCode:
                cancelledBooking
                    ?.bookingCode ||
                null,

            holdSession:
                remainingHoldSession
        };
    };

/*
 * ============================================================
 * ADMIN: UPDATE SEAT CATEGORY
 * ============================================================
 *
 * Chỉ dùng khi seat chưa được bán/giữ.
 *
 * Admin có thể:
 *
 * VIP -> STANDARD
 * STANDARD -> VIP
 *
 * mà không cần sửa code.
 */

export const updateSeatCategory =
    async (
        seatId,
        ticketCategoryId
    ) => {
        const normalizedSeatId =
            ensureObjectId(
                seatId,
                "SEAT_ID"
            );

        const normalizedCategoryId =
            ensureObjectId(
                ticketCategoryId,
                "TICKET_CATEGORY_ID"
            );

        const seat =
            await Seat.findById(
                normalizedSeatId
            );

        if (!seat) {
            throw new Error(
                "SEAT_NOT_FOUND"
            );
        }

        if (!seat.isActive) {
            throw new Error(
                "SEAT_INACTIVE"
            );
        }

        if (
            seat.status ===
                "sold" ||
            seat.status ===
                "held"
        ) {
            throw new Error(
                "SEAT_CATEGORY_CHANGE_NOT_ALLOWED"
            );
        }

        const event =
            await Event.findById(
                seat.eventId
            );

        if (!event) {
            throw new Error(
                "EVENT_NOT_FOUND"
            );
        }

        const category =
            event.ticketCategories.find(
                (
                    item
                ) =>
                    String(
                        item._id
                    ) ===
                    String(
                        normalizedCategoryId
                    )
            );

        if (!category) {
            throw new Error(
                "TICKET_CATEGORY_NOT_IN_EVENT"
            );
        }

        if (
            category.isActive ===
            false
        ) {
            throw new Error(
                "TICKET_CATEGORY_INACTIVE"
            );
        }

        seat.ticketCategoryId =
            normalizedCategoryId;

        await seat.save();

        return seat;
    };

/*
 * ============================================================
 * ADMIN: BLOCK / UNBLOCK SEAT
 * ============================================================
 *
 * Only these transitions are allowed from the seat-management UI:
 *
 * available -> blocked
 * blocked   -> available
 *
 * held/sold are protected by the query itself. This makes the
 * operation atomic: if a customer holds the seat milliseconds
 * before the admin clicks Block, the update simply cannot match.
 */

export const blockSeatForAdmin =
    async (
        seatId,
        reason,
        adminUserId
    ) => {
        const normalizedSeatId =
            ensureObjectId(
                seatId,
                "SEAT_ID"
            );

        const normalizedAdminId =
            ensureObjectId(
                adminUserId,
                "USER_ID"
            );

        const normalizedReason =
            normalizeBlockReason(
                reason
            );

        const currentSeat =
            await Seat.findById(
                normalizedSeatId
            ).lean();

        if (!currentSeat) {
            throw new Error(
                "SEAT_NOT_FOUND"
            );
        }

        if (!currentSeat.isActive) {
            throw new Error(
                "SEAT_INACTIVE"
            );
        }

        // A hold may have expired since the admin loaded the page.
        await releaseExpiredHolds(
            currentSeat.eventId
        );

        const now = new Date();

        const seat =
            await Seat.findOneAndUpdate(
                {
                    _id:
                        normalizedSeatId,
                    isActive:
                        true,
                    status:
                        "available"
                },
                {
                    $set: {
                        status:
                            "blocked",
                        blockedReason:
                            normalizedReason,
                        blockedAt:
                            now,
                        blockedByUserId:
                            normalizedAdminId,
                        adminStatusUpdatedAt:
                            now,
                        adminStatusUpdatedByUserId:
                            normalizedAdminId,
                        holdToken:
                            null,
                        heldByUserId:
                            null,
                        holdExpiresAt:
                            null
                    }
                },
                {
                    new: true
                }
            );

        if (seat) {
            await createSeatHistoryEntry({
                seat,
                action: "blocked",
                fromStatus: "available",
                toStatus: "blocked",
                actorType: "admin",
                actorUserId:
                    normalizedAdminId,
                reason:
                    normalizedReason
            });

            return sanitizeSeatForAdmin(
                seat
            );
        }

        const latest =
            await Seat.findById(
                normalizedSeatId
            ).lean();

        if (!latest) {
            throw new Error(
                "SEAT_NOT_FOUND"
            );
        }

        if (
            latest.status ===
            "blocked"
        ) {
            throw createServiceError(
                "SEAT_ALREADY_BLOCKED",
                {
                    seatLabel:
                        latest.label,
                    status:
                        latest.status
                }
            );
        }

        throw createServiceError(
            "SEAT_ADMIN_STATUS_CONFLICT",
            {
                seatLabel:
                    latest.label,
                status:
                    latest.status
            }
        );
    };

export const unblockSeatForAdmin =
    async (
        seatId,
        adminUserId
    ) => {
        const normalizedSeatId =
            ensureObjectId(
                seatId,
                "SEAT_ID"
            );

        const normalizedAdminId =
            ensureObjectId(
                adminUserId,
                "USER_ID"
            );

        const now = new Date();

        const seat =
            await Seat.findOneAndUpdate(
                {
                    _id:
                        normalizedSeatId,
                    isActive:
                        true,
                    status:
                        "blocked"
                },
                {
                    $set: {
                        status:
                            "available",
                        blockedReason:
                            null,
                        blockedAt:
                            null,
                        blockedByUserId:
                            null,
                        adminStatusUpdatedAt:
                            now,
                        adminStatusUpdatedByUserId:
                            normalizedAdminId,
                        holdToken:
                            null,
                        heldByUserId:
                            null,
                        holdExpiresAt:
                            null
                    }
                },
                {
                    new: true
                }
            );

        if (seat) {
            await createSeatHistoryEntry({
                seat,
                action: "unblocked",
                fromStatus: "blocked",
                toStatus: "available",
                actorType: "admin",
                actorUserId:
                    normalizedAdminId,
                reason:
                    "Admin mở bán lại ghế"
            });

            return sanitizeSeatForAdmin(
                seat
            );
        }

        const latest =
            await Seat.findById(
                normalizedSeatId
            ).lean();

        if (!latest) {
            throw new Error(
                "SEAT_NOT_FOUND"
            );
        }

        if (
            latest.status ===
            "available"
        ) {
            throw createServiceError(
                "SEAT_ALREADY_AVAILABLE",
                {
                    seatLabel:
                        latest.label,
                    status:
                        latest.status
                }
            );
        }

        throw createServiceError(
            "SEAT_ADMIN_STATUS_CONFLICT",
            {
                seatLabel:
                    latest.label,
                status:
                    latest.status
            }
        );
    };

/*
 * ============================================================
 * ADMIN: DELETE ALL GENERATED SEATS
 * ============================================================
 *
 * Chỉ dùng trong development/migration.
 *
 * Không dùng cho event đang bán vé.
 */

export const deleteSeatsByEvent =
    async (
        eventId
    ) => {
        const event =
            await getEvent(
                eventId
            );

        const result =
            await Seat.deleteMany({
                eventId:
                    event._id,

                status: {
                    $nin: [
                        "sold",
                        "held"
                    ]
                }
            });

        return {
            eventId:
                event._id,

            deletedCount:
                result.deletedCount
        };
    };