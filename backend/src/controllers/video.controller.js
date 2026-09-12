import fs from "fs";

import {
    findVideoById,
    getVideoBucket,
    toVideoObjectId,
    uploadVideoFileStream
} from "../services/video.service.js";

const getVideoUrl = (
    videoId
) =>
    `/api/videos/${videoId}`;

const removeTempFile = async (
    filePath
) => {
    if (!filePath) {
        return;
    }

    try {
        await fs.promises.unlink(
            filePath
        );
    } catch (error) {
        if (
            error?.code !== "ENOENT"
        ) {
            console.warn(
                "Không thể xóa file video tạm:",
                error.message
            );
        }
    }
};

export const uploadVideoFile = async (
    req,
    res,
    next
) => {
    const tempPath =
        req.file?.path || null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message:
                    "Vui lòng chọn file video"
            });
        }

        const stored =
            await uploadVideoFileStream({
                filePath:
                    req.file.path,
                originalName:
                    req.file.originalname,
                mimeType:
                    req.file.mimetype,
                uploadedBy:
                    req.user?.userId ||
                    null
            });

        const videoId =
            String(stored.id);

        return res.status(201).json({
            success: true,
            message:
                "Upload video thành công",
            data: {
                video: {
                    id:
                        videoId,
                    originalName:
                        req.file.originalname,
                    fileName:
                        stored.filename,
                    mimeType:
                        req.file.mimetype,
                    size:
                        stored.length,
                    storage:
                        "gridfs",
                    url:
                        getVideoUrl(
                            videoId
                        )
                }
            }
        });
    } catch (error) {
        return next(error);
    } finally {
        await removeTempFile(
            tempPath
        );
    }
};

const parseRangeHeader = (
    rangeHeader,
    totalLength
) => {
    if (!rangeHeader) {
        return null;
    }

    const match =
        /^bytes=(\d*)-(\d*)$/i.exec(
            String(
                rangeHeader
            ).trim()
        );

    if (!match) {
        return {
            invalid: true
        };
    }

    const startText =
        match[1];
    const endText =
        match[2];

    if (
        !startText &&
        !endText
    ) {
        return {
            invalid: true
        };
    }

    let start;
    let end;

    /* bytes=-500 : 500 byte cuối */
    if (!startText) {
        const suffixLength =
            Number(endText);

        if (
            !Number.isInteger(
                suffixLength
            ) ||
            suffixLength <= 0
        ) {
            return {
                invalid: true
            };
        }

        start = Math.max(
            totalLength -
                suffixLength,
            0
        );
        end =
            totalLength - 1;
    } else {
        start =
            Number(startText);

        if (
            !Number.isInteger(
                start
            ) ||
            start < 0 ||
            start >= totalLength
        ) {
            return {
                invalid: true
            };
        }

        if (!endText) {
            end =
                totalLength - 1;
        } else {
            end =
                Number(endText);

            if (
                !Number.isInteger(
                    end
                ) ||
                end < start
            ) {
                return {
                    invalid: true
                };
            }

            end = Math.min(
                end,
                totalLength - 1
            );
        }
    }

    return {
        invalid: false,
        start,
        end
    };
};

/*
 * Public streaming endpoint dùng được trực tiếp trong <video src="...">.
 * Có HTTP Range để browser seek, preload metadata và tua video bình thường.
 */
export const streamVideoFile = async (
    req,
    res,
    next
) => {
    try {
        const objectId =
            toVideoObjectId(
                req.params.id
            );

        if (!objectId) {
            return res.status(400).json({
                success: false,
                message:
                    "Video ID không hợp lệ."
            });
        }

        const file =
            await findVideoById(
                objectId
            );

        if (!file) {
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy video."
            });
        }

        const totalLength =
            Number(file.length);

        if (
            !Number.isFinite(
                totalLength
            ) ||
            totalLength <= 0
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Dung lượng video không hợp lệ."
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
        res.setHeader(
            "Accept-Ranges",
            "bytes"
        );
        res.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable"
        );

        const parsedRange =
            parseRangeHeader(
                req.headers.range,
                totalLength
            );

        if (
            parsedRange?.invalid
        ) {
            res.setHeader(
                "Content-Range",
                `bytes */${totalLength}`
            );

            return res
                .status(416)
                .end();
        }

        if (
            req.method === "HEAD"
        ) {
            res.setHeader(
                "Content-Length",
                String(totalLength)
            );

            return res
                .status(200)
                .end();
        }

        let downloadStream;

        if (parsedRange) {
            const {
                start,
                end
            } = parsedRange;

            const contentLength =
                end - start + 1;

            res.status(206);
            res.setHeader(
                "Content-Range",
                `bytes ${start}-${end}/${totalLength}`
            );
            res.setHeader(
                "Content-Length",
                String(
                    contentLength
                )
            );

            /*
             * GridFS `end` là exclusive, còn HTTP Content-Range `end`
             * là inclusive => truyền end + 1 cho download stream.
             */
            downloadStream =
                getVideoBucket()
                    .openDownloadStream(
                        objectId,
                        {
                            start,
                            end:
                                end + 1
                        }
                    );
        } else {
            res.status(200);
            res.setHeader(
                "Content-Length",
                String(totalLength)
            );

            downloadStream =
                getVideoBucket()
                    .openDownloadStream(
                        objectId
                    );
        }

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
