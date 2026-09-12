import express from "express";
import multer from "multer";

import {
    streamVideoFile,
    uploadVideoFile
} from "../controllers/video.controller.js";

import {
    authenticateToken
} from "../middleware/auth.middleware.js";

import {
    uploadVideo
} from "../middleware/upload.middleware.js";

const router = express.Router();

/*
 * Public endpoint để <video src="..."> đọc trực tiếp.
 */
router.get(
    "/:id",
    streamVideoFile
);

router.head(
    "/:id",
    streamVideoFile
);

router.post(
    "/upload",
    authenticateToken,
    (req, res, next) => {
        uploadVideo.single("video")(
            req,
            res,
            (error) => {
                if (!error) {
                    next();
                    return;
                }

                if (
                    error instanceof
                    multer.MulterError
                ) {
                    if (
                        error.code ===
                        "LIMIT_FILE_SIZE"
                    ) {
                        return res
                            .status(400)
                            .json({
                                success: false,
                                message:
                                    "Video vượt quá dung lượng cho phép. Tối đa 5GB."
                            });
                    }

                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                error.message
                        });
                }

                if (
                    error.message ===
                    "VIDEO_TYPE_INVALID"
                ) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                "Chỉ cho phép video MP4, WebM, MOV hoặc MKV."
                        });
                }

                next(error);
            }
        );
    },
    uploadVideoFile
);

export default router;
