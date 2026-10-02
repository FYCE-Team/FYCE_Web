import { getBookingPass } from "../services/bookingPass.service.js";
import {
    checkInTicketForAdmin,
    getTicketsForBooking,
    verifyTicketForAdmin
} from "../services/ticket.service.js";

const handleTicketError = (
    error,
    res,
    next
) => {
    switch (error.message) {
        case "EVENT_ID_INVALID":
            return res.status(400).json({ success: false, message: "Sự kiện không hợp lệ." });
        case "TICKET_EVENT_MISMATCH":
            return res.status(409).json({ success: false, code: error.message, message: "Vé này thuộc sự kiện khác. Không thể check-in tại cổng này." });
        case "BOOKING_CODE_REQUIRED":
            return res.status(400).json({
                success: false,
                code:
                    "BOOKING_CODE_REQUIRED",
                message:
                    "Thiếu mã đơn đặt vé"
            });

        case "BOOKING_NOT_FOUND":
            return res.status(404).json({
                success: false,
                code:
                    "BOOKING_NOT_FOUND",
                message:
                    "Không tìm thấy đơn đặt vé"
            });

        case "TICKET_QR_INVALID":
            return res.status(400).json({
                success: false,
                code:
                    "TICKET_QR_INVALID",
                message:
                    "Mã QR không hợp lệ hoặc đã bị thay đổi"
            });

        case "TICKET_QR_EXPIRED":
            return res.status(410).json({
                success: false,
                code:
                    "TICKET_QR_EXPIRED",
                message:
                    "Mã QR này đã hết hạn. Khách cần mở lại vé để lấy QR mới."
            });

        case "TICKET_NOT_FOUND":
            return res.status(404).json({
                success: false,
                code:
                    "TICKET_NOT_FOUND",
                message:
                    "Không tìm thấy vé tương ứng với mã QR"
            });

        case "TICKET_ALREADY_CHECKED_IN":
            return res.status(409).json({
                success: false,
                code:
                    "TICKET_ALREADY_CHECKED_IN",
                message:
                    "Vé này đã được check-in trước đó",
                data: {
                    checkedInAt:
                        error.details
                            ?.checkedInAt ||
                        null
                }
            });

        case "TICKET_NOT_VALID":
            return res.status(409).json({
                success: false,
                code:
                    "TICKET_NOT_VALID",
                message:
                    "Vé đã bị hủy, hoàn tiền hoặc không còn hiệu lực"
            });

        case "TICKET_QR_SECRET_NOT_CONFIGURED":
            return res.status(503).json({
                success: false,
                code:
                    "TICKET_QR_SECRET_NOT_CONFIGURED",
                message:
                    "Máy chủ chưa cấu hình khóa ký QR vé"
            });

        default:
            return next(error);
    }
};

export const getBookingTickets =
    async (req, res, next) => {
        try {
            const tickets =
                await getTicketsForBooking(
                    req.params.bookingCode,
                    req.user.userId,
                    req.query.pass !== "booking"
                );

            res.set(
                "Cache-Control",
                "no-store, private"
            );

            return res.status(200).json({
                success: true,
                message:
                    "Lấy vé đã phát hành thành công",
                data: {
                    tickets,
                    bookingPass: await getBookingPass(req.params.bookingCode,req.user.userId),
                    count:
                        tickets.length
                }
            });
        } catch (error) {
            return handleTicketError(
                error,
                res,
                next
            );
        }
    };

export const verifyForAdmin =
    async (req, res, next) => {
        try {
            const result =
                await verifyTicketForAdmin(
                    req.body?.qrPayload,
                    req.body?.eventId
                );

            res.set(
                "Cache-Control",
                "no-store, private"
            );

            return res.status(200).json({
                success: true,
                message:
                    result.canCheckIn
                        ? "Vé hợp lệ"
                        : "Đã kiểm tra trạng thái vé",
                data: result
            });
        } catch (error) {
            return handleTicketError(
                error,
                res,
                next
            );
        }
    };

export const checkInForAdmin =
    async (req, res, next) => {
        try {
            const result =
                await checkInTicketForAdmin(
                    req.body?.qrPayload,
                    req.user.userId,
                    req.body?.eventId
                );

            res.set(
                "Cache-Control",
                "no-store, private"
            );

            return res.status(200).json({
                success: true,
                message:
                    "Check-in thành công",
                data: result
            });
        } catch (error) {
            return handleTicketError(
                error,
                res,
                next
            );
        }
    };
