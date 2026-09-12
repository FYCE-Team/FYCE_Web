import express from "express";

import {
    create,
    preview,
    getOne,
    getMine,
    getActive,
    cancel
} from "../controllers/booking.controller.js";

import {
    authenticateToken
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticateToken);

/*
POST /api/bookings
Body:
{
    "eventId": "...",
    "seatIds": ["..."],
    "holdToken": "..."
}
*/
/*
POST /api/bookings/preview
Chỉ xác thực hold + tính giá checkout.
KHÔNG tạo document Booking.
*/
router.post(
    "/preview",
    preview
);

router.post(
    "/",
    create
);

/*
GET /api/bookings/my
*/
router.get(
    "/my",
    getMine
);

/*
GET /api/bookings/active?eventId=...

Nếu account đã có booking pending_payment còn hiệu lực
cho event này, frontend phải quay lại Checkout thay vì
mở một Seat Selection mới.
*/
router.get(
    "/active",
    getActive
);

/*
GET /api/bookings/:bookingCode
*/
router.get(
    "/:bookingCode",
    getOne
);

/*
POST /api/bookings/:bookingCode/cancel
*/
router.post(
    "/:bookingCode/cancel",
    cancel
);

export default router;
