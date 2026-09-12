import path from "path";

export const uploadVideoFile = async (
    req,
    res,
    next
) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn file video"
            });
        }

        const videoUrl =
            `/uploads/videos/${req.file.filename}`;

        return res.status(201).json({
            success: true,
            message: "Upload video thành công",
            data: {
                video: {
                    originalName:
                        req.file.originalname,

                    fileName:
                        req.file.filename,

                    mimeType:
                        req.file.mimetype,

                    size:
                        req.file.size,

                    url: videoUrl
                }
            }
        });
    } catch (error) {
        next(error);
    }
};