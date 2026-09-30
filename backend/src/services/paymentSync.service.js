import Booking from "../models/Booking.js";
import { reconcileSePayPayment } from "./payment.service.js";

// IPN remains the primary path. This durable fallback also works when the buyer
// closes the page or the gateway callback is delayed. Never trust redirect data.
export const reconcileNextPayment = async (reconcile = reconcileSePayPayment) => {
    const now = new Date();
    const booking = await Booking.findOneAndUpdate({
        status: { $in: ["pending_payment", "expired"] },
        paymentStatus: { $in: ["unpaid", "processing", "failed"] },
        paymentReviewRequired: { $ne: true },
        createdAt: { $gte: new Date(Date.now() - 48 * 3600000) },
        $or: [{ paymentNextSyncAt: null }, { paymentNextSyncAt: { $lte: now } }]
    }, { $set: { paymentNextSyncAt: new Date(Date.now() + 120000) }, $inc: { paymentSyncAttempts: 1 } },
    { sort: { paymentNextSyncAt: 1, createdAt: 1 }, returnDocument: "after", timestamps: false });
    if (!booking) return false;
    let delay = booking.status === "expired" ? 300000 : 30000;
    try {
        await reconcile(booking.bookingCode, booking.userId);
    } catch {
        delay = Math.min(900000, 30000 * 2 ** Math.min(booking.paymentSyncAttempts, 5));
        console.warn("Payment reconciliation unavailable; queued for retry.");
    }
    await Booking.updateOne({ _id: booking._id, paymentNextSyncAt: booking.paymentNextSyncAt },
        { $set: { paymentNextSyncAt: new Date(Date.now() + delay) } }, { timestamps: false });
    return true;
};

export const startPaymentSyncWorker = () => {
    if (!process.env.SEPAY_MERCHANT_ID || !process.env.SEPAY_SECRET_KEY) {
        console.warn("Automatic payment reconciliation disabled: SePay credentials are missing.");
        return () => {};
    }
    let busy = false;
    const tick = async () => {
        if (busy) return;
        busy = true;
        try { for (let n = 0; n < 10 && await reconcileNextPayment(); n++); }
        catch { console.error("Payment reconciliation queue unavailable; retrying next cycle."); }
        finally { busy = false; }
    };
    const timer = setInterval(tick, 15000);
    timer.unref(); void tick();
    return () => clearInterval(timer);
};
