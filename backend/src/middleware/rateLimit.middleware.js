import rateLimit from "express-rate-limit";

export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Quá nhiều lần đăng nhập. Vui lòng thử lại sau."
    }
});

export const registerRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau."
    }
});

export const otpRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Quá nhiều lần xác thực OTP."
    }
});

export const resendOtpRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Bạn đã yêu cầu gửi lại OTP quá nhiều lần. Vui lòng thử lại sau."
    }
});