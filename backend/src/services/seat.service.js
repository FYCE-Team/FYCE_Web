import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Event from "../models/Event.js";
import Seat from "../models/Seat.js";

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

    return clean;
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

        if (requestedToken) {
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
                        normalizedHoldToken ||
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

        const result =
            await Seat.updateMany(
                {
                    _id: {
                        $in:
                            normalizedSeatIds
                    },

                    eventId:
                        event._id,

                    status:
                        "held",

                    holdToken:
                        normalizedHoldToken,

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

        return {
            eventId:
                event._id,

            releasedSeatIds:
                normalizedSeatIds.map(
                    (seatId) =>
                        String(seatId)
                ),

            releasedCount:
                result.modifiedCount ||
                0
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
 */

export const updateSeatStatus =
    async (
        seatId,
        status
    ) => {
        const normalizedSeatId =
            ensureObjectId(
                seatId,
                "SEAT_ID"
            );

        const allowedStatuses =
            new Set([
                "available",
                "blocked"
            ]);

        if (
            !allowedStatuses.has(
                status
            )
        ) {
            throw new Error(
                "SEAT_STATUS_INVALID"
            );
        }

        const seat =
            await Seat.findById(
                normalizedSeatId
            );

        if (!seat) {
            throw new Error(
                "SEAT_NOT_FOUND"
            );
        }

        if (
            seat.status ===
                "sold" ||
            seat.status ===
                "held"
        ) {
            throw new Error(
                "SEAT_STATUS_CHANGE_NOT_ALLOWED"
            );
        }

        seat.status =
            status;

        if (
            status ===
            "available"
        ) {
            seat.holdToken =
                null;

            seat.holdExpiresAt =
                null;
        }

        await seat.save();

        return seat;
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