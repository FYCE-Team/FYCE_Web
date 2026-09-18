import {
    createBooking,
    previewBooking,
    getBookingByCode,
    getMyBookings,
    getActiveBookingByEvent,
    cancelBooking
} from "../services/booking.service.js";
import { SePayPgClient } from "sepay-pg-node";

const handleBookingError = (
    error,
    res,
    next
) => {
    switch (error.message) {
        case "EVENT_ID_INVALID":
        case "SEAT_ID_INVALID":
        case "BOOKING_SEAT_IDS_REQUIRED":
        case "HOLD_TOKEN_REQUIRED":
        case "HOLD_TOKEN_INVALID":
        case "BOOKING_CODE_REQUIRED":
            return res.status(400).json({
                success: false,
                message:
                    "Dữ liệu đặt vé không hợp lệ"
            });

        case "USER_ID_INVALID":
            return res.status(401).json({
                success: false,
                message:
                    "Phiên đăng nhập không hợp lệ"
            });

        case "USER_NOT_FOUND":
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy tài khoản"
            });

        case "USER_INACTIVE":
            return res.status(403).json({
                success: false,
                message:
                    "Tài khoản chưa được kích hoạt"
            });

        case "EVENT_NOT_FOUND":
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy sự kiện"
            });

        case "EVENT_SOLD_OUT":
            return res.status(409).json({
                success: false,
                message:
                    "Sự kiện đã bán hết vé"
            });

        case "EVENT_BOOKING_NOT_ALLOWED":
            return res.status(409).json({
                success: false,
                code:
                    "EVENT_BOOKING_NOT_ALLOWED",
                message:
                    "Sự kiện hiện không cho phép đặt vé"
            });

        case "EVENT_BOOKING_NOT_OPEN":
            return res.status(409).json({
                success: false,
                code:
                    "EVENT_BOOKING_NOT_OPEN",
                message:
                    "Sự kiện chưa đến thời gian mở bán vé"
            });

        case "EVENT_BOOKING_CLOSED":
            return res.status(409).json({
                success: false,
                code:
                    "EVENT_BOOKING_CLOSED",
                message:
                    "Sự kiện đã đóng bán vé"
            });

        case "BOOKING_SEAT_NOT_FOUND":
            return res.status(404).json({
                success: false,
                message:
                    "Một hoặc nhiều ghế không tồn tại"
            });

        case "BOOKING_SEAT_HOLD_INVALID":
            return res.status(409).json({
                success: false,
                code:
                    "BOOKING_SEAT_HOLD_INVALID",
                message:
                    error.details?.seatLabel
                        ? `Ghế ${error.details.seatLabel} không còn thuộc phiên giữ chỗ của bạn`
                        : "Phiên giữ ghế không còn hợp lệ",
                data:
                    error.details || null
            });

        case "BOOKING_HOLD_EXPIRED":
            return res.status(409).json({
                success: false,
                code:
                    "BOOKING_HOLD_EXPIRED",
                message:
                    "Thời gian giữ ghế đã hết"
            });

        case "BOOKING_TICKET_CATEGORY_NOT_FOUND":
            return res.status(409).json({
                success: false,
                code:
                    "BOOKING_TICKET_CATEGORY_NOT_FOUND",
                message:
                    "Không tìm thấy hạng vé của một hoặc nhiều ghế",
                data:
                    error.details || null
            });

        case "BOOKING_TICKET_CATEGORY_INACTIVE":
            return res.status(409).json({
                success: false,
                message:
                    "Hạng vé đã bị ngừng bán",
                data:
                    error.details || null
            });

        case "BOOKING_MAX_PER_ORDER_EXCEEDED":
            return res.status(409).json({
                success: false,
                message:
                    `${error.details?.categoryName || "Hạng vé"} chỉ cho phép tối đa ${error.details?.maxPerOrder || 0} vé mỗi đơn`,
                data:
                    error.details || null
            });

        case "ACTIVE_BOOKING_EXISTS":
            return res.status(409).json({
                success: false,
                code:
                    "ACTIVE_BOOKING_EXISTS",
                message:
                    "Bạn đã có một booking đang chờ thanh toán cho sự kiện này",
                data:
                    error.details || null
            });

        case "BOOKING_NOT_FOUND":
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy đơn đặt vé"
            });

        case "BOOKING_STATUS_INVALID":
            return res.status(400).json({
                success: false,
                message:
                    "Trạng thái booking không hợp lệ"
            });

        case "BOOKING_ALREADY_EXPIRED":
            return res.status(409).json({
                success: false,
                message:
                    "Đơn đặt vé đã hết hạn"
            });

        case "BOOKING_CANCEL_NOT_ALLOWED":
            return res.status(409).json({
                success: false,
                message:
                    "Không thể hủy đơn đặt vé ở trạng thái hiện tại"
            });

        default:
            return next(error);
    }
};

export const preview = async (
    req,
    res,
    next
) => {
    try {
        const checkout =
            await previewBooking(
                req.body || {},
                req.user.userId
            );

        return res.status(200).json({
            success: true,
            message:
                "Xác thực phiên giữ ghế thành công",
            data: {
                checkout
            }
        });
    } catch (error) {
        return handleBookingError(
            error,
            res,
            next
        );
    }
};

export const create = async (
    req,
    res,
    next
) => {
    try {
        const booking =
            await createBooking(
                req.body || {},
                req.user.userId
            );

        let sepayCheckout = null;

        // Initialize SePay Payment Gateway if credentials exist
        if (process.env.SEPAY_MERCHANT_ID && process.env.SEPAY_SECRET_KEY) {
            const client = new SePayPgClient({
                env: "sandbox", // Use "production" for real environment
                merchant_id: process.env.SEPAY_MERCHANT_ID,
                secret_key: process.env.SEPAY_SECRET_KEY
            });

            const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
            const successUrl = `${clientUrl}/bookings/${booking.bookingCode}?payment=success`;
            const cancelUrl = `${clientUrl}/bookings/${booking.bookingCode}?payment=cancel`;
            const errorUrl = `${clientUrl}/bookings/${booking.bookingCode}?payment=error`;

            const checkoutFormFields = client.checkout.initOneTimePaymentFields({
                operation: "PURCHASE",
                payment_method: "BANK_TRANSFER", // Using BANK_TRANSFER to default to VietQR
                order_invoice_number: booking.bookingCode,
                order_amount: booking.totalAmount,
                currency: "VND",
                order_description: booking.bookingCode,
                success_url: successUrl,
                error_url: errorUrl,
                cancel_url: cancelUrl
            });

            sepayCheckout = {
                checkoutURL: client.checkout.initCheckoutUrl(),
                formFields: checkoutFormFields
            };
        }

        return res.status(201).json({
            success: true,
            message:
                "Tạo đơn đặt vé thành công",
            data: {
                booking,
                sepayCheckout
            }
        });
    } catch (error) {
        return handleBookingError(
            error,
            res,
            next
        );
    }
};

export const getActive = async (
    req,
    res,
    next
) => {
    try {
        const eventId =
            req.query.eventId;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                code:
                    "EVENT_ID_REQUIRED",
                message:
                    "Thiếu ID sự kiện"
            });
        }

        const booking =
            await getActiveBookingByEvent(
                eventId,
                req.user.userId
            );

        return res.status(200).json({
            success: true,
            message:
                booking
                    ? "Đã tìm thấy booking đang hoạt động"
                    : "Không có booking đang hoạt động",
            data: {
                booking
            }
        });
    } catch (error) {
        return handleBookingError(
            error,
            res,
            next
        );
    }
};

export const getOne = async (
    req,
    res,
    next
) => {
    try {
        const booking =
            await getBookingByCode(
                req.params.bookingCode,
                req.user.userId
            );

        return res.status(200).json({
            success: true,
            message:
                "Lấy đơn đặt vé thành công",
            data: {
                booking
            }
        });
    } catch (error) {
        return handleBookingError(
            error,
            res,
            next
        );
    }
};

export const getMine = async (
    req,
    res,
    next
) => {
    try {
        const bookings =
            await getMyBookings(
                req.user.userId,
                {
                    status:
                        req.query.status ||
                        null,
                    limit:
                        req.query.limit ||
                        50
                }
            );

        return res.status(200).json({
            success: true,
            message:
                "Lấy lịch sử đặt vé thành công",
            data: {
                bookings,
                count:
                    bookings.length
            }
        });
    } catch (error) {
        return handleBookingError(
            error,
            res,
            next
        );
    }
};

export const cancel = async (
    req,
    res,
    next
) => {
    try {
        const booking =
            await cancelBooking(
                req.params.bookingCode,
                req.user.userId
            );

        return res.status(200).json({
            success: true,
            message:
                "Hủy đơn đặt vé thành công",
            data: {
                booking
            }
        });
    } catch (error) {
        return handleBookingError(
            error,
            res,
            next
        );
    }
};

export const pay = async (
    req,
    res,
    next
) => {
    try {
        const booking = await getBookingByCode(
            req.params.bookingCode,
            req.user.userId
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn đặt vé"
            });
        }

        if (booking.paymentStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "Đơn đặt vé đã được thanh toán"
            });
        }

        let sepayCheckout = null;

        // Initialize SePay Payment Gateway if credentials exist
        if (process.env.SEPAY_MERCHANT_ID && process.env.SEPAY_SECRET_KEY) {
            const client = new SePayPgClient({
                env: "sandbox",
                merchant_id: process.env.SEPAY_MERCHANT_ID,
                secret_key: process.env.SEPAY_SECRET_KEY
            });

            const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
            const successUrl = `${clientUrl}/bookings/${booking.bookingCode}?payment=success`;
            const cancelUrl = `${clientUrl}/bookings/${booking.bookingCode}?payment=cancel`;
            const errorUrl = `${clientUrl}/bookings/${booking.bookingCode}?payment=error`;

            const checkoutFormFields = client.checkout.initOneTimePaymentFields({
                operation: "PURCHASE",
                payment_method: "BANK_TRANSFER",
                order_invoice_number: booking.bookingCode,
                order_amount: booking.totalAmount,
                currency: "VND",
                order_description: booking.bookingCode,
                success_url: successUrl,
                error_url: errorUrl,
                cancel_url: cancelUrl
            });

            sepayCheckout = {
                checkoutURL: client.checkout.initCheckoutUrl(),
                formFields: checkoutFormFields
            };
        }

        return res.status(200).json({
            success: true,
            message: "Tạo link thanh toán thành công",
            data: {
                sepayCheckout
            }
        });
    } catch (error) {
        return handleBookingError(
            error,
            res,
            next
        );
    }
};
