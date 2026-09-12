import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import multer from "multer";

/*
 * Video KHÔNG còn lưu lâu dài trong backend/uploads/videos.
 *
 * Multer chỉ tạo một file TẠM trong thư mục temp của hệ điều hành.
 * Controller sẽ stream file này vào MongoDB GridFS và xóa file tạm
 * ngay sau khi upload thành công hoặc thất bại.
 *
 * Cách này tránh đưa video lớn vào RAM như memoryStorage().
 */
const tempUploadDir =
    path.join(
        os.tmpdir(),
        "fyce-video-upload-temp"
    );

fs.mkdirSync(
    tempUploadDir,
    {
        recursive: true
    }
);

const storage =
    multer.diskStorage({
        destination: (
            _req,
            _file,
            cb
        ) => {
            cb(
                null,
                tempUploadDir
            );
        },

        filename: (
            _req,
            file,
            cb
        ) => {
            const extension =
                path.extname(
                    file.originalname ||
                        ""
                )
                .toLowerCase();

            cb(
                null,
                `${crypto.randomUUID()}${extension}`
            );
        }
    });

const allowedMimeTypes =
    new Set([
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-matroska"
    ]);

const fileFilter = (
    _req,
    file,
    cb
) => {
    if (
        allowedMimeTypes.has(
            file.mimetype
        )
    ) {
        cb(null, true);
        return;
    }

    cb(
        new Error(
            "VIDEO_TYPE_INVALID"
        )
    );
};

export const uploadVideo =
    multer({
        storage,
        fileFilter,
        limits: {
            /*
             * Giữ cùng giới hạn cũ: 5GB.
             * Nhà cung cấp deploy có thể có giới hạn request thấp hơn.
             */
            fileSize:
                5000 *
                1024 *
                1024
        }
    });
