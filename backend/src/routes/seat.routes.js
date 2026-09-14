import express from "express";

import {
    getSeats,
    getAvailable,
    getSummary,
    getOne,
    getByPosition,
    getMyHoldSession,
    hold,
    release,
    getAdminSeats,
    getAdminSeatHistory,
    blockSeat,
    unblockSeat,
    updateCategory,
    removeSeats
} from "../controllers/seat.controller.js";

import {
    authenticateToken
} from "../middleware/auth.middleware.js";

const router =
    express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/

/*
GET /api/events/:eventId/seats/summary
*/
router.get(
    "/events/:eventId/seats/summary",
    getSummary
);

/*
GET /api/events/:eventId/seats/available
*/
router.get(
    "/events/:eventId/seats/available",
    getAvailable
);

/*
GET /api/events/:eventId/seats/position
*/
router.get(
    "/events/:eventId/seats/position",
    getByPosition
);

/*
GET /api/events/:eventId/seats
*/
router.get(
    "/events/:eventId/seats",
    getSeats
);

/*
GET /api/seats/hold-session?eventId=...
Requires: Authorization: Bearer <accessToken>

Returns the current account's active hold session so another
browser/device logged into the same account can resume it.
*/
router.get(
    "/seats/hold-session",
    authenticateToken,
    getMyHoldSession
);

/*
POST /api/seats/hold
Requires: Authorization: Bearer <accessToken>

Body:
{
    "eventId": "...",
    "seatIds": ["..."],
    "holdToken": "..."
}
*/
router.post(
    "/seats/hold",
    authenticateToken,
    hold
);

/*
POST /api/seats/release
Requires: Authorization: Bearer <accessToken>

Body:
{
    "eventId": "...",
    "seatIds": ["..."],
    "holdToken": "..."
}
*/
router.post(
    "/seats/release",
    authenticateToken,
    release
);

/*
GET /api/seats/:seatId
*/
router.get(
    "/seats/:seatId",
    getOne
);

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
*/

/*
GET /api/admin/events/:eventId/seats
*/
router.get(
    "/admin/events/:eventId/seats",
    authenticateToken,
    getAdminSeats
);

/*
GET /api/admin/seats/:seatId/history
*/
router.get(
    "/admin/seats/:seatId/history",
    authenticateToken,
    getAdminSeatHistory
);

/*
POST /api/admin/seats/:seatId/block

Body:
{
    "reason": "Ghế hư"
}
*/
router.post(
    "/admin/seats/:seatId/block",
    authenticateToken,
    blockSeat
);

/*
POST /api/admin/seats/:seatId/unblock
*/
router.post(
    "/admin/seats/:seatId/unblock",
    authenticateToken,
    unblockSeat
);

/*
PATCH /api/seats/:seatId/category

Body:
{
    "ticketCategoryId": "..."
}
*/
router.patch(
    "/seats/:seatId/category",
    authenticateToken,
    updateCategory
);


/*
DELETE /api/events/:eventId/seats

Development / migration only.
*/
router.delete(
    "/events/:eventId/seats",
    authenticateToken,
    removeSeats
);

export default router;