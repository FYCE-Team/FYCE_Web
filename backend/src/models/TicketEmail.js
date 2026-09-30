import mongoose from "mongoose";
const schema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    status: { type: String, enum: ["pending", "sending", "sent", "skipped"], default: "pending", index: true },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    leaseUntil: { type: Date, default: null },
    leaseId: { type: String, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: null }
}, { timestamps: true });
export default mongoose.model("TicketEmail", schema);
