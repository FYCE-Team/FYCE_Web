import express from "express";

import {
    checkInForAdmin,
    getBookingTickets,
    verifyForAdmin
} from "../controllers/ticket.controller.js";
import {
    authenticateToken,
    requireAdmin
} from "../middleware/auth.middleware.js";
import {
    ticketScanRateLimit
} from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.get(
    "/booking/:bookingCode",
    authenticateToken,
    getBookingTickets
);

router.post(
    "/admin/verify",
    authenticateToken,
    requireAdmin,
    ticketScanRateLimit,
    verifyForAdmin
);

router.post(
    "/admin/check-in",
    authenticateToken,
    requireAdmin,
    ticketScanRateLimit,
    checkInForAdmin
);

export default router;
