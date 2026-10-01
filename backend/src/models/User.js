import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 30
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        phone: {
            type: String,
            required: false,
            default: "",
            trim: true
        },

        googleId: {
            type: String,
            unique: true,
            sparse: true
        },

        password: {
            type: String,
            required: function () {
                return !this.googleId;
            },
            select: false
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        avatarUrl: { type: String, default: "" },
        authVersion: { type: Number, default: 0 },

        isBlocked: { type: Boolean, default: false, index: true },

        isActive: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

userSchema.add({ deletedAt: { type: Date, default: null, index: true }, deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, trashWasBlocked: Boolean });

const User = mongoose.model("User", userSchema);

export default User;