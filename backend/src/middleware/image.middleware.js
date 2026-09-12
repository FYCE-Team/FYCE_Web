import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(
    __dirname,
    "../../uploads/images"
);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const extension =
            path.extname(file.originalname);

        const baseName =
            path
                .basename(
                    file.originalname,
                    extension
                )
                .normalize("NFD")
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .toLowerCase()
                .replace(
                    /[^a-z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                );

        const fileName =
            `${baseName || "image"}-${Date.now()}${extension.toLowerCase()}`;

        cb(null, fileName);
    }
});

const fileFilter = (
    req,
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

export const uploadImage =
    multer({
        storage,
        fileFilter,
        limits: {
            fileSize:
                50 * 1024 * 1024
        }
    });