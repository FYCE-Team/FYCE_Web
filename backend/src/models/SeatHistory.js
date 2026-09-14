import mongoose from "mongoose";

const customerSnapshotSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            trim: true,
            maxlength: 150,
            default: null
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 320,
            default: null
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 30,
            default: null
        }
    },
    {
        _id: false
    }
);

const seatHistorySchema = new mongoose.Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
            index: true
        },

        seatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seat",
            required: true,
            index: true
        },

        seatLabel: {
            type: String,
            trim: true,
            maxlength: 20,
            required: true
        },

        action: {
            type: String,
            enum: [
                "blocked",
                "unblocked",
                "booking_created",
                "sold",
                "refund_confirmed",
                "released_after_refund"
            ],
            required: true,
            index: true
        },

        fromStatus: {
            type: String,
            enum: [
                "available",
                "held",
                "sold",
                "blocked",
                null
            ],
            default: null
        },

        toStatus: {
            type: String,
            enum: [
                "available",
                "held",
                "sold",
                "blocked",
                null
            ],
            default: null
        },

        actorType: {
            type: String,
            enum: [
                "admin",
                "user",
                "system",
                "payment"
            ],
            default: "system",
            index: true
        },

        actorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            default: null,
            index: true
        },

        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true
        },

        customerSnapshot: {
            type: customerSnapshotSchema,
            default: null
        },

        reason: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },
    {
        timestamps: true
    }
);

seatHistorySchema.index({
    seatId: 1,
    createdAt: -1
});

seatHistorySchema.index({
    eventId: 1,
    createdAt: -1
});

seatHistorySchema.index({
    bookingId: 1,
    createdAt: -1
});

export default mongoose.model(
    "SeatHistory",
    seatHistorySchema
);
