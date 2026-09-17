import express from "express";
import { handleSePayWebhook } from "../controllers/payment.controller.js";

const router = express.Router();

/*
POST /api/payments/sepay-webhook
This endpoint is called by SePay when a bank transfer is received.
*/
router.post("/sepay-webhook", handleSePayWebhook);

export default router;
