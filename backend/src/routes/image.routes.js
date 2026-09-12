import express from "express";
import multer from "multer";

import { uploadImageFile } from "../controllers/image.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { uploadImage } from "../middleware/image.middleware.js";

const router = express.Router();

router.post(
    "/upload",
    authenticateToken,
    (req, res, next) => {
        uploadImage.single("image")(req, res, (error) => {
            if (!error) {
                next();
                return;
            }

            if (error instanceof multer.MulterError) {
                if (error.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({
                        success: false,
                        message: "Hình ảnh vượt quá dung lượng cho phép. Tối đa 50MB."
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message === "IMAGE_TYPE_INVALID") {
                return res.status(400).json({
                    success: false,
                    message: "Định dạng hình ảnh không được hỗ trợ."
                });
            }

            next(error);
        });
    },
    uploadImageFile
);

export default router;