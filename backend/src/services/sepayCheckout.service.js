import { createHmac } from "node:crypto";

// Both signature and submitted fields follow SePay's canonical checkout order.
export const createSePayCheckout = (booking, clientUrl) => {
    const merchant = process.env.SEPAY_MERCHANT_ID?.trim();
    const secret = process.env.SEPAY_SECRET_KEY?.trim();
    if (!merchant || !secret) throw new Error("SEPAY_RECONCILIATION_NOT_CONFIGURED");
    if (!Number.isSafeInteger(booking.totalAmount) || booking.totalAmount <= 0) throw new Error("BOOKING_AMOUNT_INVALID");
    const base = `${clientUrl.replace(/\/$/, "")}/bookings/${encodeURIComponent(booking.bookingCode)}`;
    const fields = {
        order_amount: String(booking.totalAmount), merchant, currency: "VND",
        operation: "PURCHASE", order_description: booking.bookingCode,
        order_invoice_number: booking.bookingCode, payment_method: "BANK_TRANSFER",
        success_url: `${base}?payment=success`, error_url: `${base}?payment=error`, cancel_url: `${base}?payment=cancel`
    };
    const signature = createHmac("sha256", secret).update(Object.entries(fields).map(([key,value]) => `${key}=${value}`).join(",")).digest("base64");
    return { checkoutURL: process.env.SEPAY_ENV?.trim() === "production" ? "https://pay.sepay.vn/v1/checkout/init" : "https://pay-sandbox.sepay.vn/v1/checkout/init", formFields: { ...fields, signature } };
};
