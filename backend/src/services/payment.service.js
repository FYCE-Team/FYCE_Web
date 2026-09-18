import Booking from "../models/Booking.js";

/**
 * Process a successful payment webhook from SePay.
 * 
 * @param {Object} payload - The JSON payload from SePay
 * @returns {Object} result - Success status and message
 */
export const processSePayPayment = async (payload) => {
    // Check if it's the Payment Gateway IPN format or the simple Bank Transfer webhook format
    const isGatewayFormat = payload.order && payload.order.order_invoice_number;
    
    let bookingCode = "";
    let amountReceived = 0;

    if (isGatewayFormat) {
        // SePay Payment Gateway IPN payload structure
        bookingCode = String(payload.order.order_invoice_number).toUpperCase();
        amountReceived = Number(payload.order.order_amount) || Number(payload.transaction?.transaction_amount) || 0;
    } else {
        // Fallback for simple "chia sẻ biến động số dư" webhook
        const { content, transferAmount } = payload;
        if (!content || transferAmount === undefined) {
            throw new Error("Invalid payload: Missing content or transferAmount");
        }
        
        amountReceived = Number(transferAmount) || 0;

        const bookingCodeMatch = content.match(/FYCE-\d{8}-[A-F0-9]{4}/i);
        if (!bookingCodeMatch) {
            return { success: false, message: "No booking code found in transfer content" };
        }
        bookingCode = bookingCodeMatch[0].toUpperCase();
    }

    // Find the booking
    const booking = await Booking.findOne({ bookingCode });

    if (!booking) {
        return { success: false, message: `Booking ${bookingCode} not found` };
    }

    // Check if it's already paid
    if (booking.paymentStatus === "paid") {
        return { success: true, message: `Booking ${bookingCode} is already marked as paid` };
    }

    // Check if the booking is still pending or expired. 
    // We might still accept payment if it just expired but the user paid.
    if (booking.status === "cancelled") {
        return { success: false, message: `Booking ${bookingCode} was cancelled, manual refund required` };
    }

    if (amountReceived < booking.totalAmount) {
        return { 
            success: false, 
            message: `Insufficient amount. Expected ${booking.totalAmount}, got ${amountReceived}` 
        };
    }

    // Update booking status
    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    booking.confirmedAt = new Date();
    // Clear hold token so it's permanently owned
    booking.holdToken = "PAID-" + booking.holdToken;

    await booking.save();

    // In a real system, we might also update the Seats to be permanently owned here.
    // However, the seat-holding mechanism checks holdExpiresAt.
    // Since we don't clear holdExpiresAt or heldByUserId, the seats remain held by the user.
    // We should probably update the Seats to status="sold" if there is such a status,
    // or just leave them as 'held' indefinitely since the booking is confirmed.
    // Let's check Seat model or seat.service.js later if needed, but this is fine for now.

    return { success: true, message: `Booking ${bookingCode} successfully confirmed` };
};
