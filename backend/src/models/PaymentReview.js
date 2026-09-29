import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, index: true },
    amountReceived: { type: Number, default: null },
    outcome: {
      type: String,
      enum: ["accepted", "review_required", "error"],
      required: true,
    },
    message: { type: String, maxlength: 1000, required: true },
  },
  { timestamps: true },
);
schema.index({ bookingCode: 1, createdAt: -1 });
export default mongoose.model("PaymentReview", schema);
