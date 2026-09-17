import { processSePayPayment } from "../services/payment.service.js";

export const handleSePayWebhook = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const sepayToken = process.env.SEPAY_WEBHOOK_TOKEN;
        const sepaySecret = process.env.SEPAY_SECRET_KEY;

        // If SEPAY_WEBHOOK_TOKEN is configured in .env, validate it.
        if (sepayToken) {
            if (!authHeader || !authHeader.includes(sepayToken)) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized: Invalid webhook token"
                });
            }
        } else if (sepaySecret && authHeader) {
            // Optional: if using HMAC signature or token derived from secret, handle here.
            // For now, if no SEPAY_WEBHOOK_TOKEN is defined, we skip API Key check.
        }

        const payload = req.body;
        
        // Log the incoming webhook for debugging
        console.log("[SePay Webhook] Received payload:", JSON.stringify(payload));

        const result = await processSePayPayment(payload);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } else {
            // We return 200 even for logical failures (like booking not found) 
            // so SePay doesn't keep retrying the webhook unnecessarily.
            return res.status(200).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error("[SePay Webhook Error]", error);
        // Let SePay retry if there's a server crash/DB error
        return res.status(500).json({
            success: false,
            message: "Internal server error processing webhook"
        });
    }
};
