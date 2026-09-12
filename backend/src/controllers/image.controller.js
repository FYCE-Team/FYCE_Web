import {
    findImageById,
    getImageBucket,
    toImageObjectId,
    uploadImageBuffer
} from "../services/image.service.js";

const getImageUrl = (
    imageId
) =>
    `/api/images/${imageId}`;

export const uploadImageFile = async (
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

        const stored =
            await uploadImageBuffer({
                buffer:
                    req.file.buffer,
                originalName:
                    req.file.originalname,
                mimeType:
                    req.file.mimetype,
                uploadedBy:
                    req.user?.userId ||
                    null
            });

        const imageId =
            String(stored.id);

        return res.status(201).json({
            success: true,
            message:
                "Upload hình ảnh thành công",
            data: {
                image: {
                    id:
                        imageId,
                    originalName:
                        req.file.originalname,
                    fileName:
                        stored.filename,
                    mimeType:
                        req.file.mimetype,
                    size:
                        req.file.size,
                    storage:
                        "gridfs",
                    url:
                        getImageUrl(
                            imageId
                        )
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

        return next(error);
    }
};

export const streamImageFile = async (
    req,
    res,
    next
) => {
    try {
        const objectId =
            toImageObjectId(
                req.params.id
            );

        if (!objectId) {
            return res.status(400).json({
                success: false,
                message:
                    "Image ID không hợp lệ."
            });
        }

        const file =
            await findImageById(
                objectId
            );

        if (!file) {
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy hình ảnh."
            });
        }

        const contentType =
            file.metadata?.contentType ||
            file.contentType ||
            "application/octet-stream";

        res.setHeader(
            "Content-Type",
            contentType
        );

        if (
            Number.isFinite(
                Number(file.length)
            )
        ) {
            res.setHeader(
                "Content-Length",
                String(file.length)
            );
        }

        res.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable"
        );

        const downloadStream =
            getImageBucket()
                .openDownloadStream(
                    objectId
                );

        downloadStream.once(
            "error",
            (error) => {
                if (
                    !res.headersSent
                ) {
                    next(error);
                    return;
                }

                res.destroy(error);
            }
        );

        downloadStream.pipe(res);
    } catch (error) {
        return next(error);
    }
};
