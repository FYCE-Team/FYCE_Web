import { timingSafeEqual } from "node:crypto";

import { processSePayPayment } from "../services/payment.service.js";

const safeSecretEquals = (received, expected) => {
    if (!received || !expected) {
        return false;
    }

    const receivedBuffer = Buffer.from(
        String(received)
    );
    const expectedBuffer = Buffer.from(
        String(expected)
    );

    if (
        receivedBuffer.length !==
        expectedBuffer.length
    ) {
        return false;
    }

    return timingSafeEqual(
        receivedBuffer,
        expectedBuffer
    );
};

const isGatewayPayload = (payload) =>
    Boolean(
        payload?.order
            ?.order_invoice_number
    );

const authorizeGatewayIpn = (req) => {
    const secret =
        process.env.SEPAY_SECRET_KEY;

    if (!secret) {
        return {
            ok: false,
            status: 503,
            message:
                "SePay gateway secret is not configured"
        };
    }

    const receivedSecret =
        req.get("X-Secret-Key");

    return safeSecretEquals(
        receivedSecret,
        secret
    )
        ? { ok: true }
        : {
              ok: false,
              status: 401,
              message:
                  "Unauthorized: invalid SePay gateway secret"
          };
};

const authorizeBalanceWebhook = (
    req
) => {
    const webhookToken =
        process.env.SEPAY_WEBHOOK_TOKEN;

    if (!webhookToken) {
        return {
            ok: false,
            status: 503,
            message:
                "SEPAY_WEBHOOK_TOKEN is required for balance webhooks"
        };
    }

    const authorization =
        req.get("Authorization") || "";

    const acceptedHeaders = [
        `Apikey ${webhookToken}`,
        `Bearer ${webhookToken}`
    ];

    const ok = acceptedHeaders.some(
        (value) =>
            safeSecretEquals(
                authorization,
                value
            )
    );

    return ok
        ? { ok: true }
        : {
              ok: false,
              status: 401,
              message:
                  "Unauthorized: invalid SePay webhook token"
          };
};

export const handleSePayWebhook = async (
    req,
    res
) => {
    try {
        const payload = req.body || {};

        const authorization =
            isGatewayPayload(payload)
                ? authorizeGatewayIpn(req)
                : authorizeBalanceWebhook(
                      req
                  );

        if (!authorization.ok) {
            return res
                .status(
                    authorization.status
                )
                .json({
                    success: false,
                    message:
                        authorization.message
                });
        }

        const result =
            await processSePayPayment(
                payload
            );

        // SePay only needs HTTP 200 to acknowledge a processed IPN.
        // Logical failures are returned in the body so the merchant can
        // inspect/refund them without triggering endless retries.
        return res.status(200).json({
            success: result.success,
            message: result.message
        });
    } catch (error) {
        console.error(
            "[SePay Webhook Error]",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal server error processing webhook"
        });
    }
};
