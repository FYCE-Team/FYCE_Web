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
    updateCategory,
    updateStatus,
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
PATCH /api/seats/:seatId/status

Body:
{
    "status": "blocked"
}
*/
router.patch(
    "/seats/:seatId/status",
    authenticateToken,
    updateStatus
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