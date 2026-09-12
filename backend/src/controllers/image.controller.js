export const uploadImageFile = (
    req,
    res,
    next
) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message:
                    "Vui lòng chọn hình ảnh."
            });
        }

        return res.status(201).json({
            success: true,
            message:
                "Upload hình ảnh thành công",
            data: {
                image: {
                    originalName:
                        req.file.originalname,
                    fileName:
                        req.file.filename,
                    mimeType:
                        req.file.mimetype,
                    size:
                        req.file.size,
                    url:
                        `/uploads/images/${req.file.filename}`
                }
            }
        });
    } catch (error) {
        if (
            error.message ===
            "IMAGE_TYPE_INVALID"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Định dạng hình ảnh không được hỗ trợ."
            });
        }

        next(error);
    }
};