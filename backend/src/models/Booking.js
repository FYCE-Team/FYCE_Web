import mongoose from "mongoose";

const bookingItemSchema = new mongoose.Schema(
    {
        seatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seat",
            required: true
        },

        seatLabel: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20
        },

        section: {
            type: String,
            required: true,
            trim: true
        },

        row: {
            type: String,
            required: true,
            trim: true,
            maxlength: 10
        },

        number: {
            type: Number,
            required: true,
            min: 1
        },

        ticketCategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        ticketCategoryCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },

        ticketCategoryName: {
            type: String,
            required: true,
            trim: true
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        _id: false
    }
);

const customerSnapshotSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        phone: {
            type: String,
            default: "",
            trim: true
        }
    },
    {
        _id: false
    }
);

const eventSnapshotSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        startAt: {
            type: Date,
            default: null
        },

        venue: {
            type: String,
            default: "",
            trim: true
        },

        address: {
            type: String,
            default: "",
            trim: true
        }
    },
    {
        _id: false
    }
);

const bookingSchema = new mongoose.Schema(
    {
        bookingCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            uppercase: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
            index: true
        },

        eventSnapshot: {
            type: eventSnapshotSchema,
            required: true
        },

        customer: {
            type: customerSnapshotSchema,
            required: true
        },

        items: {
            type: [bookingItemSchema],
            required: true,
            validate: {
                validator: (items) =>
                    Array.isArray(items) &&
                    items.length > 0,
                message: "BOOKING_ITEMS_REQUIRED"
            }
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        holdToken: {
            type: String,
            required: true,
            index: true
        },

        holdExpiresAt: {
            type: Date,
            required: true,
            index: true
        },

        status: {
            type: String,
            enum: [
                "pending_payment",
                "confirmed",
                "expired",
                "cancelled"
            ],
            default: "pending_payment",
            index: true
        },

        paymentStatus: {
            type: String,
            enum: [
                "unpaid",
                "processing",
                "paid",
                "failed",
                "refunded"
            ],
            default: "unpaid",
            index: true
        },

        cancelledAt: {
            type: Date,
            default: null
        },

        expiredAt: {
            type: Date,
            default: null
        },

        confirmedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

bookingSchema.index({
    userId: 1,
    createdAt: -1
});

bookingSchema.index({
    eventId: 1,
    status: 1,
    createdAt: -1
});

bookingSchema.index({
    userId: 1,
    eventId: 1,
    holdToken: 1,
    status: 1
});

export default mongoose.model(
    "Booking",
    bookingSchema
);
