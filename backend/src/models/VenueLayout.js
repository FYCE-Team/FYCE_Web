import mongoose from "mongoose";

const seatDefinitionSchema = new mongoose.Schema(
    {
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
            default: true
        }
    },
    {
        _id: false
    }
);

const rowSchema = new mongoose.Schema(
    {
        row: {
            type: String,
            required: true,
            trim: true,
            maxlength: 10
        },

        seats: {
            type: [seatDefinitionSchema],
            default: []
        }
    },
    {
        _id: false
    }
);

const sectionSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 50
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        },

        rows: {
            type: [rowSchema],
            default: []
        }
    },
    {
        _id: false
    }
);

const venueLayoutSchema = new mongoose.Schema(
    {
        venueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Venue",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
        },

        canvas: {
            width: {
                type: Number,
                required: true,
                min: 100
            },

            height: {
                type: Number,
                required: true,
                min: 100
            }
        },

        sections: {
            type: [sectionSchema],
            default: []
        },

        capacity: {
            type: Number,
            required: true,
            min: 0
        },

        isDefault: {
            type: Boolean,
            default: false,
            index: true
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

venueLayoutSchema.index({
    venueId: 1,
    name: 1
});

venueLayoutSchema.index({
    venueId: 1,
    isDefault: 1
});

export default mongoose.model(
    "VenueLayout",
    venueLayoutSchema
);