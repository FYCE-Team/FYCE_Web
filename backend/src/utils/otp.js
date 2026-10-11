import crypto from "crypto";

export const generateOtp = () => {
    return crypto
        .randomInt(100000, 1000000)
        .toString();
};

const purposes = new Set(["registration", "password-reset"]);
const hmac = (otp, purpose, subject, nonce) => {
    if (!purposes.has(purpose) || !subject) throw new Error("OTP_CONTEXT_REQUIRED");
    if (!process.env.JWT_REFRESH_SECRET) throw new Error("OTP_SECRET_NOT_CONFIGURED");
    return crypto.createHmac("sha256", process.env.JWT_REFRESH_SECRET)
        .update(JSON.stringify(["fyce-otp-v1", purpose, String(subject), nonce, otp]))
        .digest("hex");
};

// A nonce distinguishes resend generations even if the random six-digit code
// repeats. Purpose and account binding prevent reuse across OTP workflows.
export const hashOtp = (otp, purpose, subject) => {
    const nonce = crypto.randomBytes(16).toString("hex");
    return `hmac-v1:${nonce}:${hmac(otp, purpose, subject, nonce)}`;
};

export const matchesOtp = (otp, stored, purpose, subject) => {
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp) || typeof stored !== "string") return false;
    let expected;
    let supplied;
    if (/^[a-f0-9]{64}$/.test(stored)) {
        // Compatibility for already-issued, short-lived pre-upgrade OTPs.
        // Callers still enforce expiry, attempt limits and atomic consumption.
        expected = crypto.createHash("sha256").update(otp).digest("hex");
        supplied = stored;
    } else {
        const parts = /^hmac-v1:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(stored);
        if (!parts) return false;
        expected = hmac(otp, purpose, subject, parts[1]);
        supplied = parts[2];
    }
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
};
