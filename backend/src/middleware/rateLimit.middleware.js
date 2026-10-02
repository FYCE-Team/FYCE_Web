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

export const ticketScanRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Quá nhiều yêu cầu quét vé. Vui lòng thử lại sau."
    }
});

// Authenticated reconciliation is bounded per account, independent of proxy IPs.
export const paymentSyncRateLimit = rateLimit({
    windowMs: 60000, limit: 30, keyGenerator: req => String(req.user.userId),
    standardHeaders: "draft-8", legacyHeaders: false,
    message: { success: false, message: "Đang kiểm tra thanh toán. Vui lòng đợi một phút trước khi thử lại." }
});

// XLSX generation is bounded per authenticated administrator, separate from scanner traffic.
export const adminExportRateLimit=rateLimit({windowMs:60000,limit:10,keyGenerator:req=>String(req.user.userId),standardHeaders:"draft-8",legacyHeaders:false,message:{success:false,message:"Xuất file quá nhiều lần. Vui lòng chờ một phút rồi thử lại."}});
