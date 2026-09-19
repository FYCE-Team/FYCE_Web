import Booking from "../models/Booking.js";
import Seat from "../models/Seat.js";
import { SePayPgClient } from "sepay-pg-node";
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

    return new SePayPgClient({
        env: getSePayEnvironment(),
        merchant_id: merchantId,
        secret_key: secretKey
    });
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

const retrieveSePayOrderByInvoice = async (invoiceNumber) => {
    try {
        const client = getSePayClient();

        // Official SePay Node SDK expects order_invoice_number here,
        // not SePay's internal order_id (PAY... / SEPAY-...).
        const response =
            await client.order.retrieve(
                invoiceNumber
            );

        return normalizeSePayOrderResponse(
            response
        );
    } catch (error) {
        const status =
            getSePayErrorStatus(error);

        // Immediately after the success redirect, SePay may need a short
        // moment before the order can be retrieved. Treat 404 as pending so
        // the frontend polling loop can retry instead of surfacing a 502.
        if (status === 404) {
            return null;
        }

        console.error(
            "[SePay Reconcile] SDK retrieve failed",
            {
                status: status || null,
                invoiceNumber,
                message:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Unknown SePay SDK error",
                response:
                    error?.response?.data || null
            }
        );

        const requestError = new Error(
            "SEPAY_RECONCILIATION_REQUEST_FAILED"
        );
        requestError.status = status || 502;
        requestError.cause = error;
        throw requestError;
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
        transactionStatus !== "APPROVED"
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
            Number(
                payload?.transaction
                    ?.transaction_amount
            ) ||
            Number(
                payload?.order
                    ?.order_amount
            ) ||
            0
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
        payload?.transfer_type || ""
    ).toLowerCase();

    if (
        transferType &&
        transferType !== "credit"
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

const releaseExpiredBooking = async (
    booking,
    now
) => {
    const seatIds = booking.items.map(
        (item) => item.seatId
    );

    await Seat.updateMany(
        {
            _id: {
                $in: seatIds
            },
            eventId: booking.eventId,
            status: "held",
            holdToken:
                booking.holdToken,
            heldByUserId:
                booking.userId
        },
        {
            $set: {
                status: "available",
                holdToken: null,
                heldByUserId: null,
                holdExpiresAt: null
            }
        }
    );

    booking.status = "expired";
    booking.expiredAt =
        booking.expiredAt || now;

    await booking.save();
};

/**
 * Process a confirmed payment webhook from SePay.
 * The booking is only confirmed while its seat hold is still valid.
 * Confirmed seats are permanently moved from `held` to `sold`.
 */
export const processSePayPayment =
    async (payload) => {
        const isGatewayFormat =
            Boolean(
                payload?.order
                    ?.order_invoice_number
            );

        const payment =
            isGatewayFormat
                ? extractGatewayPayment(
                      payload
                  )
                : extractBalanceWebhookPayment(
                      payload
                  );

        if (!payment.accepted) {
            return {
                success: false,
                message: payment.message
            };
        }

        const {
            bookingCode,
            amountReceived
        } = payment;

        const booking =
            await Booking.findOne({
                bookingCode
            });

        if (!booking) {
            return {
                success: false,
                message: `Booking ${bookingCode} not found`
            };
        }

        // Idempotency for SePay retries / duplicate IPNs.
        if (
            booking.paymentStatus ===
                "paid" &&
            booking.status ===
                "confirmed"
        ) {
            await ensureTicketsForBooking(
                booking
            );

            return {
                success: true,
                message: `Booking ${bookingCode} is already confirmed`
            };
        }

        if (
            booking.status ===
                "cancelled" ||
            booking.status === "expired"
        ) {
            return {
                success: false,
                message: `Booking ${bookingCode} is no longer payable; manual refund/reconciliation is required`
            };
        }

        if (
            booking.status !==
            "pending_payment"
        ) {
            return {
                success: false,
                message: `Booking ${bookingCode} cannot be paid in status ${booking.status}`
            };
        }

        const now = new Date();

        if (
            !booking.holdExpiresAt ||
            booking.holdExpiresAt <= now
        ) {
            await releaseExpiredBooking(
                booking,
                now
            );

            return {
                success: false,
                message: `Booking ${bookingCode} expired before payment confirmation; manual refund/reconciliation is required`
            };
        }

        if (
            !Number.isFinite(
                amountReceived
            ) ||
            amountReceived <
                booking.totalAmount
        ) {
            return {
                success: false,
                message: `Insufficient amount. Expected ${booking.totalAmount}, got ${amountReceived}`
            };
        }

        const seatIds = booking.items.map(
            (item) => item.seatId
        );

        const validHoldFilter = {
            _id: {
                $in: seatIds
            },
            eventId: booking.eventId,
            status: "held",
            holdToken:
                booking.holdToken,
            heldByUserId:
                booking.userId,
            holdExpiresAt: {
                $gt: now
            }
        };

        const heldSeatCount =
            await Seat.countDocuments(
                validHoldFilter
            );

        if (
            heldSeatCount !==
            seatIds.length
        ) {
            return {
                success: false,
                message: `Seat hold for booking ${bookingCode} is no longer valid; manual refund/reconciliation is required`
            };
        }

        const soldResult =
            await Seat.updateMany(
                validHoldFilter,
                {
                    $set: {
                        status: "sold",
                        holdToken: null,
                        heldByUserId: null,
                        holdExpiresAt: null
                    }
                }
            );

        if (
            soldResult.modifiedCount !==
            seatIds.length
        ) {
            return {
                success: false,
                message: `Could not lock all seats for booking ${bookingCode}; manual reconciliation is required`
            };
        }

        try {
            booking.paymentStatus =
                "paid";
            booking.status =
                "confirmed";
            booking.confirmedAt = now;

            await booking.save();
        } catch (error) {
            // Best-effort rollback if confirming the Booking document fails
            // after seats were marked sold.
            await Seat.updateMany(
                {
                    _id: {
                        $in: seatIds
                    },
                    eventId:
                        booking.eventId,
                    status: "sold"
                },
                {
                    $set: {
                        status: "held",
                        holdToken:
                            booking.holdToken,
                        heldByUserId:
                            booking.userId,
                        holdExpiresAt:
                            booking.holdExpiresAt
                    }
                }
            );

            throw error;
        }

        // Ticket issuance is idempotent. Each paid seat receives one
        // server-backed Ticket document; the QR itself is generated only
        // through the authenticated ticket API and never stores PII.
        await ensureTicketsForBooking(
            booking
        );

        return {
            success: true,
            message: `Booking ${bookingCode} successfully confirmed`
        };
    };

/**
 * Fallback reconciliation for local development / missed IPNs.
 *
 * The browser success URL is NOT trusted as proof of payment. The backend
 * retrieves the exact invoice from SePay using the official SDK and only
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
            await ensureTicketsForBooking(
                booking
            );

            return {
                success: true,
                alreadyConfirmed: true,
                message:
                    "Booking is already confirmed"
            };
        }

        if (
            booking.status ===
                "cancelled" ||
            booking.status === "expired"
        ) {
            return {
                success: false,
                pending: false,
                message:
                    "Booking is no longer payable"
            };
        }

        if (
            booking.status !==
            "pending_payment"
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
                    "APPROVED"
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
