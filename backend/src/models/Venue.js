import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        address: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
        },

        capacity: {
            type: Number,
            required: true,
            min: 1
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

venueSchema.index({
    name: 1
});

export default mongoose.model("Venue", venueSchema);