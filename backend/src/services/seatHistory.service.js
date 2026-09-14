import mongoose from "mongoose";
import Seat from "../models/Seat.js";
import SeatHistory from "../models/SeatHistory.js";

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

const normalizeOptionalObjectId = (
    value
) => {
    if (!value) {
        return null;
    }

    if (
        !mongoose.Types.ObjectId.isValid(
            value
        )
    ) {
        return null;
    }

    return new mongoose.Types.ObjectId(
        value
    );
};

const normalizeCustomerSnapshot = (
    value
) => {
    if (!value) {
        return null;
    }

    const fullName = String(
        value.fullName || ""
    ).trim();
    const email = String(
        value.email || ""
    ).trim();
    const phone = String(
        value.phone || ""
    ).trim();

    if (
        !fullName &&
        !email &&
        !phone
    ) {
        return null;
    }

    return {
        fullName: fullName || null,
        email: email || null,
        phone: phone || null
    };
};

export const createSeatHistoryEntry =
    async ({
        seat,
        action,
        fromStatus = null,
        toStatus = null,
        actorType = "system",
        actorUserId = null,
        bookingId = null,
        paymentId = null,
        customerSnapshot = null,
        reason = null,
        metadata = null
    }) => {
        if (!seat?._id || !seat?.eventId) {
            throw new Error(
                "SEAT_HISTORY_SEAT_REQUIRED"
            );
        }

        return SeatHistory.create({
            eventId: seat.eventId,
            seatId: seat._id,
            seatLabel:
                seat.label ||
                `${seat.row || ""}${seat.number || ""}`,
            action,
            fromStatus,
            toStatus,
            actorType,
            actorUserId:
                normalizeOptionalObjectId(
                    actorUserId
                ),
            bookingId:
                normalizeOptionalObjectId(
                    bookingId
                ),
            paymentId:
                normalizeOptionalObjectId(
                    paymentId
                ),
            customerSnapshot:
                normalizeCustomerSnapshot(
                    customerSnapshot
                ),
            reason:
                reason
                    ? String(reason)
                          .trim()
                          .slice(0, 500)
                    : null,
            metadata:
                metadata || null
        });
    };

export const getSeatHistoryForAdmin =
    async (
        seatId,
        {
            limit = 100
        } = {}
    ) => {
        const normalizedSeatId =
            ensureObjectId(
                seatId,
                "SEAT_ID"
            );

        const seat =
            await Seat.findById(
                normalizedSeatId
            )
                .select(
                    "eventId label row number section status ticketCategoryId isActive"
                )
                .lean();

        if (!seat) {
            throw new Error(
                "SEAT_NOT_FOUND"
            );
        }

        const safeLimit = Math.min(
            200,
            Math.max(
                1,
                Number(limit) || 100
            )
        );

        const history =
            await SeatHistory.find({
                seatId:
                    normalizedSeatId
            })
                .sort({
                    createdAt: -1
                })
                .limit(safeLimit)
                .populate(
                    "actorUserId",
                    "fullName email username role"
                )
                .populate(
                    "bookingId",
                    "bookingCode status paymentStatus userId customer"
                )
                .lean();

        return {
            seat,
            history
        };
    };
