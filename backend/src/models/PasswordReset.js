import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },

    otpHash: {
      type: String,
      required: true
    },

    otpExpiresAt: {
      type: Date,
      required: true
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0
    },

    verified: {
      type: Boolean,
      default: false
    },

    resetTokenHash: {
      type: String,
      default: null
    },

    resetTokenExpiresAt: {
      type: Date,
      default: null
    },

    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

passwordResetSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model(
  "PasswordReset",
  passwordResetSchema
);