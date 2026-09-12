import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(
    __dirname,
    "../../uploads/videos"
);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },

    filename: (_req, file, cb) => {
        const extension = path.extname(
            file.originalname
        );

        const baseName = path
            .basename(
                file.originalname,
                extension
            )
            .replace(
                /[^a-zA-Z0-9-_]/g,
                "-"
            )
            .toLowerCase();

        const uniqueName =
            `${baseName}-${Date.now()}${extension}`;

        cb(null, uniqueName);
    }
});

const allowedMimeTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska"
];

const fileFilter = (
    _req,
    file,
    cb
) => {
    if (
        allowedMimeTypes.includes(
            file.mimetype
        )
    ) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Chỉ cho phép upload file video MP4, WebM, MOV hoặc MKV"
            )
        );
    }
};

export const uploadVideo = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5000 * 1024 * 1024
    }
});