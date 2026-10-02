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
    ticket,
    issuedAt = null
) => {
    const token = jwt.sign(
        {
            typ: "fyce-ticket",
            tid: String(ticket._id),
            ver: ticket.qrVersion,
            ...(issuedAt ? { iat: Math.floor(new Date(issuedAt).getTime() / 1000) } : {})
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

// Separate signed type/audience: a booking pass cannot be mistaken for one seat.
export const createBookingQrPayload = (booking, issuedAt = null) => `FYCEB1:${jwt.sign({
    typ: "fyce-booking", bid: String(booking._id),
    ...(issuedAt ? { iat: Math.floor(new Date(issuedAt).getTime() / 1000) } : {})
}, getTicketQrSecret(), { algorithm: "HS256", issuer: "fyce-api", audience: "fyce-booking-checkin", expiresIn: process.env.TICKET_QR_EXPIRES || "365d" })}`;
export const verifyBookingQrPayload = raw => {
    const value=String(raw || "").trim();
    if(!value.startsWith("FYCEB1:")) throw new Error("TICKET_QR_INVALID");
    try {
        const payload=jwt.verify(value.slice(7),getTicketQrSecret(),{algorithms:["HS256"],issuer:"fyce-api",audience:"fyce-booking-checkin"});
        if(payload.typ!=="fyce-booking" || !/^[a-f\d]{24}$/i.test(payload.bid))throw new Error("TICKET_QR_INVALID");
        return payload.bid;
    }catch(error){throw new Error(error.name==="TokenExpiredError"?"TICKET_QR_EXPIRED":"TICKET_QR_INVALID");}
};
