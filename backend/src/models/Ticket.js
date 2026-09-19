import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

const eventSnapshotSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
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

const ticketSchema = new mongoose.Schema(
    {
        ticketCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            uppercase: true
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
            index: true
        },
        bookingCode: {
            type: String,
            required: true,
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
        seatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seat",
            required: true,
            index: true
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
        },
        eventSnapshot: {
            type: eventSnapshotSchema,
            required: true
        },
        status: {
            type: String,
            enum: [
                "valid",
                "checked_in",
                "cancelled",
                "refunded"
            ],
            default: "valid",
            index: true
        },
        qrVersion: {
            type: String,
            required: true,
            default: () =>
                randomBytes(16).toString("hex")
        },
        issuedAt: {
            type: Date,
            default: Date.now,
            required: true
        },
        checkedInAt: {
            type: Date,
            default: null
        },
        checkedInBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

ticketSchema.index(
    {
        bookingId: 1,
        seatId: 1
    },
    {
        unique: true
    }
);

ticketSchema.index({
    userId: 1,
    createdAt: -1
});

ticketSchema.index({
    eventId: 1,
    status: 1,
    checkedInAt: -1
});

export default mongoose.model(
    "Ticket",
    ticketSchema
);
