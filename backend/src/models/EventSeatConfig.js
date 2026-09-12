import mongoose from "mongoose";

const seatAssignmentSchema = new mongoose.Schema(
    {
        section: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 50
        },

        row: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
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
        }
    },
    {
        _id: false
    }
);

const eventSeatConfigSchema = new mongoose.Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
            unique: true,
            index: true
        },

        venueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Venue",
            required: true,
            index: true
        },

        venueLayoutId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VenueLayout",
            required: true,
            index: true
        },

        assignments: {
            type: [seatAssignmentSchema],
            default: []
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

eventSeatConfigSchema.index({
    venueLayoutId: 1,
    "assignments.section": 1,
    "assignments.row": 1,
    "assignments.number": 1
});

export default mongoose.model(
    "EventSeatConfig",
    eventSeatConfigSchema
);