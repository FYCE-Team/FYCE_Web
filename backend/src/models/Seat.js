import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
            index: true
        },

        ticketCategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        section: {
            type: String,
            enum: [
                "center",
                "left_lower",
                "right_lower",
                "left_wing",
                "right_wing"
            ],
            required: true,
            index: true
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

        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20
        },

        status: {
            type: String,
            enum: [
                "available",
                "held",
                "sold",
                "blocked"
            ],
            default: "available",
            index: true
        },

        holdToken: {
            type: String,
            default: null
        },

        heldByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        holdExpiresAt: {
            type: Date,
            default: null,
            index: true
        },

        position: {
            x: {
                type: Number,
                required: true
            },

            y: {
                type: Number,
                required: true
            }
        },

        width: {
            type: Number,
            default: 34,
            min: 1
        },

        height: {
            type: Number,
            default: 28,
            min: 1
        },

        rotation: {
            type: Number,
            default: 0
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

seatSchema.index(
    {
        eventId: 1,
        section: 1,
        row: 1,
        number: 1
    },
    {
        unique: true
    }
);

seatSchema.index({
    eventId: 1,
    status: 1
});

seatSchema.index({
    holdToken: 1,
    status: 1,
    holdExpiresAt: 1
});

seatSchema.index({
    heldByUserId: 1,
    status: 1,
    holdExpiresAt: 1
});

export default mongoose.model(
    "Seat",
    seatSchema
);