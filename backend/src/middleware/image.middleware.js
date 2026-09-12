import multer from "multer";

const storage =
    multer.memoryStorage();

const fileFilter = (
    _req,
    file,
    cb
) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (
        allowedTypes.includes(
            file.mimetype
        )
    ) {
        cb(null, true);
        return;
    }

    cb(
        new Error(
            "IMAGE_TYPE_INVALID"
        )
    );
};

/*
 * Ảnh không còn ghi vào backend/uploads/images.
 * Multer chỉ giữ file tạm trong RAM để controller
 * stream/buffer nó vào MongoDB GridFS ngay trong request.
 */
export const uploadImage =
    multer({
        storage,
        fileFilter,
        limits: {
            fileSize:
                50 *
                1024 *
                1024
        }
    });
