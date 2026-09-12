import {
    getSeatsByEvent,
    getSeatById,
    getSeatByPosition,
    getAvailableSeats,
    getSeatSummary,
    holdSeats,
    releaseHeldSeats,
    updateSeatCategory,
    updateSeatStatus,
    deleteSeatsByEvent
} from "../services/seat.service.js";

const requireAdmin = (
    req,
    res
) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message:
                "Bạn chưa đăng nhập"
        });

        return false;
    }

    if (
        req.user.role !==
        "admin"
    ) {
        res.status(403).json({
            success: false,
            message:
                "Bạn không có quyền quản trị"
        });

        return false;
    }

    return true;
};

const handleServiceError = (
    error,
    res,
    next
) => {
    switch (
        error.message
    ) {
        case "EVENT_ID_INVALID":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "ID sự kiện không hợp lệ"
                });

        case "EVENT_NOT_FOUND":
            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Không tìm thấy sự kiện"
                });

        case "USER_ID_INVALID":
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Phiên đăng nhập không hợp lệ"
                });

        case "SEAT_ID_INVALID":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "ID ghế không hợp lệ"
                });

        case "SEAT_NOT_FOUND":
            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Không tìm thấy ghế"
                });

        case "TICKET_CATEGORY_ID_INVALID":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "ID hạng vé không hợp lệ"
                });

        case "TICKET_CATEGORY_NOT_IN_EVENT":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Hạng vé không thuộc sự kiện này"
                });

        case "TICKET_CATEGORY_INACTIVE":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Hạng vé đang bị vô hiệu hóa"
                });

        case "SEAT_INACTIVE":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Ghế đang bị vô hiệu hóa"
                });

        case "SEAT_CATEGORY_CHANGE_NOT_ALLOWED":
            return res
                .status(409)
                .json({
                    success: false,
                    message:
                        "Không thể đổi hạng vé của ghế đang được giữ hoặc đã bán"
                });

        case "SEAT_STATUS_INVALID":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Trạng thái ghế không hợp lệ"
                });

        case "SEAT_STATUS_CHANGE_NOT_ALLOWED":
            return res
                .status(409)
                .json({
                    success: false,
                    message:
                        "Không thể thay đổi trạng thái của ghế đang được giữ hoặc đã bán"
                });

        case "SEAT_SECTION_INVALID":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Khu vực ghế không hợp lệ"
                });

        case "SEAT_ROW_INVALID":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Hàng ghế không hợp lệ"
                });

        case "SEAT_NUMBER_INVALID":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Số ghế không hợp lệ"
                });


        case "SEAT_IDS_REQUIRED":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Bạn chưa chọn ghế"
                });

        case "HOLD_TOKEN_REQUIRED":
        case "HOLD_TOKEN_INVALID":
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Mã giữ ghế không hợp lệ"
                });

        case "HOLD_TOKEN_NOT_OWNED":
            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "Phiên giữ ghế không thuộc tài khoản đang đăng nhập"
                });

        case "SEAT_NOT_AVAILABLE":
            return res
                .status(409)
                .json({
                    success: false,
                    message:
                        error.details
                            ?.seatLabel
                            ? `Ghế ${error.details.seatLabel} vừa được người khác giữ hoặc không còn khả dụng`
                            : "Một hoặc nhiều ghế không còn khả dụng",
                    data:
                        error.details ||
                        null
                });

        case "SEAT_RELEASE_NOT_ALLOWED":
            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "Bạn không thể nhả ghế không thuộc phiên giữ chỗ này",
                    data:
                        error.details ||
                        null
                });
        default:
            return next(error);
    }
};

/*
|--------------------------------------------------------------------------
| GET ALL SEATS OF EVENT
|--------------------------------------------------------------------------
|
| GET /api/events/:eventId/seats
|
| Query:
| ?status=available
| ?section=center
| ?ticketCategoryId=...
|
*/

export const getSeats = async (
    req,
    res,
    next
) => {
    try {
        const {
            event,
            seats
        } =
            await getSeatsByEvent(
                req.params.eventId,
                {
                    status:
                        req.query
                            .status,

                    section:
                        req.query
                            .section,

                    ticketCategoryId:
                        req.query
                            .ticketCategoryId
                }
            );

        return res.status(200).json({
            success: true,
            message:
                "Lấy danh sách ghế thành công",
            data: {
                eventId:
                    event._id,

                seats,

                count:
                    seats.length
            }
        });
    } catch (
        error
    ) {
        return handleServiceError(
            error,
            res,
            next
        );
    }
};

/*
|--------------------------------------------------------------------------
| GET AVAILABLE SEATS
|--------------------------------------------------------------------------
|
| GET /api/events/:eventId/seats/available
|
*/

export const getAvailable =
    async (
        req,
        res,
        next
    ) => {
        try {
            const seats =
                await getAvailableSeats(
                    req.params.eventId
                );

            return res
                .status(200)
                .json({
                    success:
                        true,

                    message:
                        "Lấy danh sách ghế còn trống thành công",

                    data: {
                        seats,

                        count:
                            seats.length
                    }
                });
        } catch (
            error
        ) {
            return handleServiceError(
                error,
                res,
                next
            );
        }
    };

/*
|--------------------------------------------------------------------------
| GET SEAT SUMMARY
|--------------------------------------------------------------------------
|
| GET /api/events/:eventId/seats/summary
|
*/

export const getSummary =
    async (
        req,
        res,
        next
    ) => {
        try {
            const result =
                await getSeatSummary(
                    req.params.eventId
                );

            return res
                .status(200)
                .json({
                    success:
                        true,

                    message:
                        "Lấy thống kê ghế thành công",

                    data:
                        result
                });
        } catch (
            error
        ) {
            return handleServiceError(
                error,
                res,
                next
            );
        }
    };

/*
|--------------------------------------------------------------------------
| GET ONE SEAT
|--------------------------------------------------------------------------
|
| GET /api/seats/:seatId
|
*/

export const getOne = async (
    req,
    res,
    next
) => {
    try {
        const seat =
            await getSeatById(
                req.params.seatId
            );

        return res
            .status(200)
            .json({
                success: true,
                message:
                    "Lấy thông tin ghế thành công",
                data: {
                    seat
                }
            });
    } catch (
        error
    ) {
        return handleServiceError(
            error,
            res,
            next
        );
    }
};

/*
|--------------------------------------------------------------------------
| GET SEAT BY POSITION
|--------------------------------------------------------------------------
|
| GET /api/events/:eventId/seats/position
|
| Query:
| ?section=center
| ?row=B
| ?number=1
|
*/

export const getByPosition =
    async (
        req,
        res,
        next
    ) => {
        try {
            const seat =
                await getSeatByPosition(
                    req.params
                        .eventId,
                    {
                        section:
                            req.query
                                .section,

                        row:
                            req.query
                                .row,

                        number:
                            req.query
                                .number
                    }
                );

            return res
                .status(200)
                .json({
                    success:
                        true,

                    message:
                        "Lấy thông tin ghế thành công",

                    data: {
                        seat
                    }
                });
        } catch (
            error
        ) {
            return handleServiceError(
                error,
                res,
                next
            );
        }
    };

/*
 |--------------------------------------------------------------------------
 | AUTHENTICATED: HOLD SEATS
 |--------------------------------------------------------------------------
 |
 | POST /api/seats/hold
 |
 | Body:
 | {
 |     "eventId": "...",
 |     "seatIds": ["..."],
 |     "holdToken": "..." // optional ở lần đầu
 | }
 |
 */

export const hold =
    async (
        req,
        res,
        next
    ) => {
        try {
            const {
                eventId,
                seatIds,
                holdToken
            } =
                req.body || {};

            const result =
                await holdSeats(
                    eventId,
                    seatIds,
                    req.user?.userId,
                    holdToken
                );

            return res
                .status(200)
                .json({
                    success:
                        true,

                    message:
                        "Giữ ghế thành công",

                    data:
                        result
                });
        } catch (
            error
        ) {
            return handleServiceError(
                error,
                res,
                next
            );
        }
    };

/*
 |--------------------------------------------------------------------------
 | AUTHENTICATED: RELEASE HELD SEATS
 |--------------------------------------------------------------------------
 |
 | POST /api/seats/release
 |
 | Body:
 | {
 |     "eventId": "...",
 |     "seatIds": ["..."],
 |     "holdToken": "..."
 | }
 |
 */

export const release =
    async (
        req,
        res,
        next
    ) => {
        try {
            const {
                eventId,
                seatIds,
                holdToken
            } =
                req.body || {};

            const result =
                await releaseHeldSeats(
                    eventId,
                    seatIds,
                    req.user?.userId,
                    holdToken
                );

            return res
                .status(200)
                .json({
                    success:
                        true,

                    message:
                        "Nhả ghế thành công",

                    data:
                        result
                });
        } catch (
            error
        ) {
            return handleServiceError(
                error,
                res,
                next
            );
        }
    };

/*
|--------------------------------------------------------------------------
| ADMIN: UPDATE SEAT CATEGORY
|--------------------------------------------------------------------------
|
| PATCH /api/seats/:seatId/category
|
| Body:
| {
|     "ticketCategoryId": "..."
| }
|
*/

export const updateCategory =
    async (
        req,
        res,
        next
    ) => {
        try {
            if (
                !requireAdmin(
                    req,
                    res
                )
            ) {
                return;
            }

            const {
                ticketCategoryId
            } =
                req.body || {};

            const seat =
                await updateSeatCategory(
                    req.params
                        .seatId,
                    ticketCategoryId
                );

            return res
                .status(200)
                .json({
                    success:
                        true,

                    message:
                        "Cập nhật hạng vé của ghế thành công",

                    data: {
                        seat
                    }
                });
        } catch (
            error
        ) {
            return handleServiceError(
                error,
                res,
                next
            );
        }
    };

/*
|--------------------------------------------------------------------------
| ADMIN: BLOCK / UNBLOCK SEAT
|--------------------------------------------------------------------------
|
| PATCH /api/seats/:seatId/status
|
| Body:
| {
|     "status": "blocked"
| }
|
| Hoặc:
|
| {
|     "status": "available"
| }
|
*/

export const updateStatus =
    async (
        req,
        res,
        next
    ) => {
        try {
            if (
                !requireAdmin(
                    req,
                    res
                )
            ) {
                return;
            }

            const {
                status
            } =
                req.body || {};

            const seat =
                await updateSeatStatus(
                    req.params
                        .seatId,
                    status
                );

            return res
                .status(200)
                .json({
                    success:
                        true,

                    message:
                        status ===
                        "blocked"
                            ? "Đã khóa ghế thành công"
                            : "Đã mở khóa ghế thành công",

                    data: {
                        seat
                    }
                });
        } catch (
            error
        ) {
            return handleServiceError(
                error,
                res,
                next
            );
        }
    };

/*
|--------------------------------------------------------------------------
| ADMIN: DELETE GENERATED SEATS
|--------------------------------------------------------------------------
|
| DELETE /api/events/:eventId/seats
|
| Chỉ phục vụ migration/development.
|
*/

export const removeSeats =
    async (
        req,
        res,
        next
    ) => {
        try {
            if (
                !requireAdmin(
                    req,
                    res
                )
            ) {
                return;
            }

            const result =
                await deleteSeatsByEvent(
                    req.params
                        .eventId
                );

            return res
                .status(200)
                .json({
                    success:
                        true,

                    message:
                        "Đã xóa các ghế chưa bán/chưa giữ",

                    data:
                        result
                });
        } catch (
            error
        ) {
            return handleServiceError(
                error,
                res,
                next
            );
        }
    };