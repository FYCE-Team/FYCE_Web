import { Router } from "express";

import {
    uploadVideoFile
} from "../controllers/video.controller.js";

import {
    uploadVideo
} from "../middleware/upload.middleware.js";

const router = Router();

router.post(
    "/upload",
    uploadVideo.single("video"),
    uploadVideoFile
);

export default router;