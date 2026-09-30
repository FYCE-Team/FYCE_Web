import mongoose from "mongoose";
import { enqueueTicketEmail } from "./ticketEmail.service.js";
import { randomUUID } from "node:crypto";
import PaymentReview from "../models/PaymentReview.js";
import Booking from "../models/Booking.js";
import Seat from "../models/Seat.js";
import {
    ensureTicketsForBooking
} from "./ticket.service.js";

const getSePayEnvironment = () =>
    process.env.SEPAY_ENV === "production"
        ? "production"
        : "sandbox";

const getSePayClient = () => {
    const merchantId =
        process.env.SEPAY_MERCHANT_ID;
    const secretKey =
        process.env.SEPAY_SECRET_KEY;

    if (!merchantId || !secretKey) {
        throw new Error(
            "SEPAY_RECONCILIATION_NOT_CONFIGURED"
        );
    }

    const api = getSePayEnvironment() === "production" ? "https://pgapi.sepay.vn/v1" : "https://pgapi-sandbox.sepay.vn/v1";
    const request = async path => {
        const response = await fetch(`${api}/${path}`, { headers: { Authorization: `Basic ${Buffer.from(`${merchantId}:${secretKey}`).toString("base64")}` }, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw Object.assign(new Error("SEPAY_HTTP_ERROR"), { status: response.status });
        return { data: await response.json() };
    };
    return { order: {
        retrieve: key => request(`order/detail/${encodeURIComponent(key)}`),
        all: query => request(`order?${new URLSearchParams(query)}`)
    } };
};

const getSePayErrorStatus = (error) =>
    Number(
        error?.response?.status ??
            error?.status ??
            error?.statusCode ??
            0
    );

const normalizeSePayOrderResponse = (response) => {
    // Depending on the SDK's HTTP wrapper, the order can be returned as:
    //   { data: <order> }
    // or { data: { data: <order> } }.
    // Normalize both without trusting browser redirect parameters.
    const firstLevel = response?.data ?? response;

    if (
        firstLevel?.data &&
        typeof firstLevel.data === "object" &&
        !Array.isArray(firstLevel.data)
    ) {
        return firstLevel.data;
    }

    return firstLevel || null;
};

export const retrieveSePayOrderByInvoice = async (invoiceNumber, client = getSePayClient()) => {
    try {
        try {
            const direct = normalizeSePayOrderResponse(await client.order.retrieve(invoiceNumber));
            if (direct?.order_invoice_number === invoiceNumber) return direct;
        } catch (error) {
            if (![400, 404, 422].includes(getSePayErrorStatus(error))) throw error;
        }
        // Some gateway versions require provider order_id despite the SDK parameter name.
        // Search is only a locator: exact invoice and detail response are verified again.
        const response = await client.order.all({ q: invoiceNumber, per_page: 100 });
        const raw = response?.data ?? response;
        const entries = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        const matches = entries.filter(order => order.order_invoice_number === invoiceNumber);
        if (!matches.length) return null;
        if (matches.length !== 1 || !matches[0].order_id) throw new Error("AMBIGUOUS_SEPAY_ORDER");
        const order = normalizeSePayOrderResponse(await client.order.retrieve(matches[0].order_id));
        if (order?.order_invoice_number !== invoiceNumber) throw new Error("SEPAY_INVOICE_MISMATCH");
        return order;
    } catch (error) {
        console.error("[SePay Reconcile] Request failed", { status: getSePayErrorStatus(error) || null });
        throw new Error("SEPAY_RECONCILIATION_REQUEST_FAILED");
    }
};

const extractGatewayPayment = (
    payload
) => {
    const notificationType = String(
        payload?.notification_type || ""
    ).toUpperCase();
    const orderStatus = String(
        payload?.order?.order_status || ""
    ).toUpperCase();
    const transactionStatus = String(
        payload?.transaction
            ?.transaction_status || ""
    ).toUpperCase();

    if (
        notificationType !==
            "ORDER_PAID" ||
        orderStatus !== "CAPTURED" ||
        transactionStatus !== "APPROVED" ||
        (payload?.transaction?.transaction_type && payload.transaction.transaction_type !== "PAYMENT")
    ) {
        return {
            accepted: false,
            message:
                "Ignored SePay gateway notification because the payment is not confirmed"
        };
    }

    const orderCurrency = String(
        payload?.order?.order_currency ||
            "VND"
    ).toUpperCase();
    const transactionCurrency = String(
        payload?.transaction
            ?.transaction_currency ||
            orderCurrency
    ).toUpperCase();

    if (
        orderCurrency !== "VND" ||
        transactionCurrency !== "VND"
    ) {
        return {
            accepted: false,
            message:
                "Unsupported payment currency"
        };
    }

    return {
        accepted: true,
        bookingCode: String(
            payload.order
                .order_invoice_number
        )
            .trim()
            .toUpperCase(),
        amountReceived:
            Number(payload?.transaction?.transaction_amount ?? payload?.order?.order_amount ?? 0)
    };
};

const extractBalanceWebhookPayment = (
    payload
) => {
    const content = String(
        payload?.content || ""
    );
    const amountReceived = Number(
        payload?.transferAmount ??
            payload?.amount ??
            0
    );
    const transferType = String(
        payload?.transferType || payload?.transfer_type || ""
    ).toLowerCase();

    if (
        transferType &&
        !["credit", "in"].includes(transferType)
    ) {
        return {
            accepted: false,
            message:
                "Ignored non-credit bank transaction"
        };
    }

    if (!content || !amountReceived) {
        return {
            accepted: false,
            message:
                "Invalid webhook payload: missing transfer content or amount"
        };
    }

    const bookingCodeMatch =
        content.match(
            /FYCE-\d{8}-[A-F0-9]{8}/i
        );

    if (!bookingCodeMatch) {
        return {
            accepted: false,
            message:
                "No booking code found in transfer content"
        };
    }

    return {
        accepted: true,
        bookingCode:
            bookingCodeMatch[0].toUpperCase(),
        amountReceived
    };
};

const paymentDate = payload => {
    const value = payload?.transaction?.transaction_date || payload?.transactionDate;
    if (!value || typeof value !== "string") return null;
    const normalized = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value) ? value.replace(" ", "T") + "+07:00" : value;
    const date = new Date(normalized);
    return Number.isFinite(date.getTime()) && date <= new Date(Date.now() + 60000) ? date : null;
};

const applySePayPayment = async payload => {
    const payment = payload?.order?.order_invoice_number ? extractGatewayPayment(payload) : extractBalanceWebhookPayment(payload);
    if (!payment.accepted) return { success: false, message: payment.message };
    const { bookingCode, amountReceived } = payment;
    return mongoose.connection.transaction(async session => {
        const booking = await Booking.findOne({ bookingCode }).session(session);
        const reject = message => ({ success: false, reviewRequired: true, message });
        if (!booking) return reject(`Booking ${bookingCode} not found`);
        if (booking.status === "confirmed" && booking.paymentStatus === "paid") {
            await ensureTicketsForBooking(booking, session);
            await enqueueTicketEmail(booking._id, session);
            return { success: true, message: `Booking ${bookingCode} is already confirmed` };
        }
        if (!["pending_payment", "expired"].includes(booking.status)) return reject(`Booking ${bookingCode} is no longer payable; manual reconciliation is required`);
        if (!Number.isFinite(amountReceived) || amountReceived < booking.totalAmount) return reject(`Insufficient amount. Expected ${booking.totalAmount}, got ${amountReceived}`);
        const now = new Date(), paidAt = paymentDate(payload);
        const live = booking.status === "pending_payment" && booking.holdExpiresAt > now;
        // A delayed authenticated IPN can recover an on-time transfer only if every seat is still unclaimed.
        const paidOnTime = paidAt && paidAt >= booking.createdAt && paidAt <= booking.holdExpiresAt;
        if (!live && !paidOnTime) {
            if (booking.status === "pending_payment") {
                await Booking.updateOne({ _id: booking._id }, { status: "expired", expiredAt: now }, { session });
                await Seat.updateMany({ _id: { $in: booking.items.map(i => i.seatId) }, status: "held", holdToken: booking.holdToken, heldByUserId: booking.userId }, { status: "available", holdToken: null, heldByUserId: null, holdExpiresAt: null }, { session });
            }
            return reject(`Booking ${bookingCode} expired; payment requires manual reconciliation`);
        }
        const seatIds = booking.items.map(i => i.seatId);
        const ownership = { status: "held", holdToken: booking.holdToken, heldByUserId: booking.userId, ...(live ? { holdExpiresAt: { $gt: now } } : {}) };
        const filter = { _id: { $in: seatIds }, eventId: booking.eventId, ...(live ? ownership : { $or: [ownership, { status: "available", soldBookingId: null }] }) };
        if (await Seat.countDocuments(filter).session(session) !== seatIds.length) return reject(`Seat ownership for ${bookingCode} has changed; payment requires manual reconciliation`);
        const sold = await Seat.updateMany(filter, { $set: { status: "sold", soldBookingId: booking._id, saleClaimToken: randomUUID(), holdToken: null, heldByUserId: null, holdExpiresAt: null } }, { session });
        if (sold.modifiedCount !== seatIds.length) throw new Error("PAYMENT_SEAT_CONFLICT");
        booking.status = "confirmed"; booking.paymentStatus = "paid"; booking.confirmedAt = now; booking.paymentReviewRequired = false;
        await booking.save({ session });
        await ensureTicketsForBooking(booking, session);
        await enqueueTicketEmail(booking._id, session);
        return { success: true, message: `Booking ${bookingCode} successfully confirmed` };
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
};

// Persist only normalized reconciliation facts; never store webhook secrets or raw personal data.
export const processSePayPayment = async payload => {
    const payment = payload?.order?.order_invoice_number ? extractGatewayPayment(payload) : extractBalanceWebhookPayment(payload);
    if (!payment.accepted) return { success: false, message: payment.message };
    const review = await PaymentReview.create({ bookingCode: payment.bookingCode, amountReceived: Number.isFinite(payment.amountReceived) ? payment.amountReceived : null, outcome: "review_required", message: "Payment processing started; review if this attempt remains incomplete." });
    try {
        const result = await applySePayPayment(payload);
        await PaymentReview.updateOne({ _id: review._id }, { $set: { outcome: result.success ? "accepted" : "review_required", message: result.message.slice(0, 1000) } });
        if (!result.success) await Booking.updateOne({ bookingCode: payment.bookingCode, paymentStatus: { $ne: "paid" } }, { $set: { paymentReviewRequired: true } });
        return result;
    } catch (error) {
        await PaymentReview.updateOne({ _id: review._id }, { $set: { outcome: "error", message: "Payment processing failed; inspect booking, seats and payment provider before retrying." } });
        throw error;
    }
};

/**
 * Fallback reconciliation for local development / missed IPNs.
 *
 * The browser success URL is NOT trusted as proof of payment. The backend
 * retrieves the exact invoice from SePay's authenticated REST API and only
 * confirms a booking when SePay reports CAPTURED with an APPROVED transaction.
 */
export const reconcileSePayPayment =
    async (bookingCode, userId) => {
        const normalizedCode = String(
            bookingCode || ""
        )
            .trim()
            .toUpperCase();

        if (!normalizedCode) {
            throw new Error(
                "BOOKING_CODE_REQUIRED"
            );
        }

        const booking =
            await Booking.findOne({
                bookingCode:
                    normalizedCode,
                userId
            });

        if (!booking) {
            throw new Error(
                "BOOKING_NOT_FOUND"
            );
        }

        if (
            booking.paymentStatus ===
                "paid" &&
            booking.status ===
                "confirmed"
        ) {
            await ensureTicketsForBooking(booking);
            await enqueueTicketEmail(booking._id);

            return {
                success: true,
                alreadyConfirmed: true,
                message:
                    "Booking is already confirmed"
            };
        }

        if (
            booking.status === "cancelled"
        ) {
            return {
                success: false,
                pending: false,
                message:
                    "Booking is no longer payable"
            };
        }

        if (
            !["pending_payment", "expired"].includes(booking.status)
        ) {
            return {
                success: false,
                pending: false,
                message: `Booking cannot be reconciled in status ${booking.status}`
            };
        }

        const order =
            await retrieveSePayOrderByInvoice(
                normalizedCode
            );

        if (!order) {
            return {
                success: false,
                pending: true,
                message:
                    "SePay has not exposed this order for reconciliation yet"
            };
        }

        const invoiceNumber = String(
            order?.order_invoice_number ||
                ""
        )
            .trim()
            .toUpperCase();
        const orderStatus = String(
            order?.order_status || ""
        ).toUpperCase();

        if (
            invoiceNumber !==
            normalizedCode
        ) {
            console.error(
                "[SePay Reconcile] Invoice mismatch",
                {
                    expected:
                        normalizedCode,
                    received:
                        invoiceNumber || null
                }
            );

            throw new Error(
                "SEPAY_RECONCILIATION_REQUEST_FAILED"
            );
        }

        if (
            orderStatus !== "CAPTURED"
        ) {
            return {
                success: false,
                pending: true,
                message: `SePay order status is ${orderStatus || "UNKNOWN"}`
            };
        }

        const orderAmount = Number(
            order?.order_amount ?? 0
        );

        if (
            !Number.isFinite(
                orderAmount
            ) ||
            orderAmount <
                booking.totalAmount
        ) {
            throw new Error(
                "SEPAY_RECONCILIATION_AMOUNT_MISMATCH"
            );
        }

        const transactions =
            Array.isArray(
                order?.transactions
            )
                ? order.transactions
                : [];

        const approvedTransaction =
            transactions.find(
                (transaction) =>
                    String(
                        transaction?.transaction_status ||
                            ""
                    ).toUpperCase() ===
                    "APPROVED" && (!transaction.transaction_type || transaction.transaction_type === "PAYMENT")
            );

        if (!approvedTransaction) {
            return {
                success: false,
                pending: true,
                message:
                    "SePay order is CAPTURED but no APPROVED transaction is available yet"
            };
        }

        const transactionAmount =
            Number(
                approvedTransaction?.transaction_amount ??
                    orderAmount
            );

        if (
            !Number.isFinite(
                transactionAmount
            ) ||
            transactionAmount <
                booking.totalAmount
        ) {
            throw new Error(
                "SEPAY_RECONCILIATION_AMOUNT_MISMATCH"
            );
        }

        return processSePayPayment({
            notification_type:
                "ORDER_PAID",
            order: {
                ...order,
                order_invoice_number:
                    normalizedCode,
                order_status:
                    "CAPTURED"
            },
            transaction: {
                ...approvedTransaction,
                transaction_status:
                    "APPROVED"
            }
        });
    };
