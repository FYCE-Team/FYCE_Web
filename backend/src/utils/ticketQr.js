import jwt from "jsonwebtoken";

const QR_PREFIX = "FYCE1:";

const getTicketQrSecret = () => {
    const dedicatedSecret =
        process.env.TICKET_QR_SECRET;

    if (dedicatedSecret) {
        return dedicatedSecret;
    }

    if (
        process.env.NODE_ENV !== "production" &&
        process.env.JWT_ACCESS_SECRET
    ) {
        return process.env.JWT_ACCESS_SECRET;
    }

    throw new Error(
        "TICKET_QR_SECRET_NOT_CONFIGURED"
    );
};

export const createTicketQrPayload = (
    ticket
) => {
    const token = jwt.sign(
        {
            typ: "fyce-ticket",
            tid: String(ticket._id),
            ver: ticket.qrVersion
        },
        getTicketQrSecret(),
        {
            algorithm: "HS256",
            issuer: "fyce-api",
            audience: "fyce-ticket-checkin",
            expiresIn:
                process.env.TICKET_QR_EXPIRES ||
                "365d"
        }
    );

    return `${QR_PREFIX}${token}`;
};

export const verifyTicketQrPayload = (
    rawValue
) => {
    const value = String(
        rawValue || ""
    ).trim();

    if (!value.startsWith(QR_PREFIX)) {
        throw new Error(
            "TICKET_QR_INVALID"
        );
    }

    const token = value.slice(
        QR_PREFIX.length
    );

    let payload = null;

    try {
        payload = jwt.verify(
            token,
            getTicketQrSecret(),
            {
                algorithms: ["HS256"],
                issuer: "fyce-api",
                audience:
                    "fyce-ticket-checkin"
            }
        );
    } catch (error) {
        if (
            error?.name ===
            "TokenExpiredError"
        ) {
            throw new Error(
                "TICKET_QR_EXPIRED"
            );
        }

        throw new Error(
            "TICKET_QR_INVALID"
        );
    }

    if (
        payload?.typ !== "fyce-ticket" ||
        !payload?.tid ||
        !payload?.ver
    ) {
        throw new Error(
            "TICKET_QR_INVALID"
        );
    }

    return {
        ticketId: String(payload.tid),
        qrVersion: String(payload.ver)
    };
};
