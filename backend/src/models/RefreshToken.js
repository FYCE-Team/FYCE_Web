import mongoose from "mongoose";

const refreshTokenSchema =
    new mongoose.Schema(
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true
            },

            authVersion: { type: Number, default: 0 },
            tokenHash: {
                type: String,
                required: true,
                unique: true
            },

            previousTokenHash: { type: String, index: true, default: null },
            rotatedAt: { type: Date, default: null },
            expiresAt: {
                type: Date,
                required: true
            }
        },
        {
            timestamps: true
        }
    );

refreshTokenSchema.index(
    { expiresAt: 1 },
    {
        expireAfterSeconds: 0
    }
);

export default mongoose.model(
    "RefreshToken",
    refreshTokenSchema
);