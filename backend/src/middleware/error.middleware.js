export const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (["HERO_BACKGROUND_SOURCE_CONFLICT", "ABOUT_FEATURE_ORDER_DUPLICATE"].includes(error.message)) return res.status(400).json({ success: false, message: error.message === "HERO_BACKGROUND_SOURCE_CONFLICT" ? "Chỉ chọn ảnh hoặc video nền." : "Thứ tự điểm nổi bật bị trùng." });
    if (error.message === "SEPAY_RECONCILIATION_NOT_CONFIGURED") return res.status(503).json({ success: false, message: "Máy chủ chưa cấu hình thông tin đối soát SePay." });
    if (error.message === "SEPAY_RECONCILIATION_REQUEST_FAILED") return res.status(502).json({ success: false, message: "Chưa truy vấn được SePay. Vui lòng thử lại sau." });
    if (error.message === "SEPAY_RECONCILIATION_AMOUNT_MISMATCH") return res.status(409).json({ success: false, message: "Số tiền tại SePay không khớp đơn. Cần đối soát thủ công." });
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Dữ liệu đã tồn tại." });
    if (["ValidationError", "CastError"].includes(error.name)) return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ. Kiểm tra các trường đã nhập." });
    if (error.name === "VersionError") return res.status(409).json({ success: false, message: "Dữ liệu đã thay đổi. Hãy tải lại." });
    if (error.status === 503) return res.status(503).json({ success: false, message: error.message });
    const status = Number(error.status || error.statusCode);
    if (status >= 400 && status < 500) return res.status(status).json({ success: false, message: error.message });
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể xử lý yêu cầu. Vui lòng thử lại." });
};
