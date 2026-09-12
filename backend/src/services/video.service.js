import fs from "fs";
import mongoose from "mongoose";

const BUCKET_NAME = "videos";

const ensureDatabase = () => {
    const database =
        mongoose.connection.db;

    if (!database) {
        throw new Error(
            "VIDEO_DATABASE_NOT_READY"
        );
    }

    return database;
};

export const getVideoBucket = () => {
    return new mongoose.mongo.GridFSBucket(
        ensureDatabase(),
        {
            bucketName: BUCKET_NAME
        }
    );
};

export const toVideoObjectId = (
    value
) => {
    if (
        !value ||
        !mongoose.Types.ObjectId.isValid(
            String(value)
        )
    ) {
        return null;
    }

    return new mongoose.Types.ObjectId(
        String(value)
    );
};

const buildMetadata = ({
    originalName,
    mimeType,
    uploadedBy = null,
    extraMetadata = {}
}) => ({
    originalName:
        originalName || "video",

    contentType:
        mimeType ||
        "application/octet-stream",

    uploadedBy:
        uploadedBy || null,

    uploadedAt:
        new Date(),

    ...extraMetadata
});

/*
 * Video được stream từ file tạm sang GridFS.
 * Không load toàn bộ video vào RAM.
 */
export const uploadVideoFileStream = ({
    filePath,
    originalName,
    mimeType,
    uploadedBy = null,
    extraMetadata = {}
}) => {
    return new Promise(
        (resolve, reject) => {
            const bucket =
                getVideoBucket();

            const uploadStream =
                bucket.openUploadStream(
                    originalName ||
                        "video",
                    {
                        contentType:
                            mimeType ||
                            "application/octet-stream",

                        /*
                         * Chunk lớn hơn mặc định một chút để giảm
                         * số document khi lưu video dung lượng lớn.
                         */
                        chunkSizeBytes:
                            1024 * 1024,

                        metadata:
                            buildMetadata({
                                originalName,
                                mimeType,
                                uploadedBy,
                                extraMetadata
                            })
                    }
                );

            const source =
                fs.createReadStream(
                    filePath
                );

            let settled = false;

            const fail = (error) => {
                if (settled) {
                    return;
                }

                settled = true;
                source.destroy();
                uploadStream.destroy();
                reject(error);
            };

            source.once(
                "error",
                fail
            );

            uploadStream.once(
                "error",
                fail
            );

            uploadStream.once(
                "finish",
                async () => {
                    if (settled) {
                        return;
                    }

                    try {
                        const file =
                            await bucket
                                .find({
                                    _id:
                                        uploadStream.id
                                })
                                .limit(1)
                                .next();

                        const stat =
                            fs.statSync(
                                filePath
                            );

                        settled = true;

                        resolve({
                            id:
                                uploadStream.id,
                            filename:
                                file?.filename ||
                                originalName ||
                                "video",
                            length:
                                Number(
                                    file?.length
                                ) ||
                                stat.size,
                            contentType:
                                mimeType ||
                                "application/octet-stream"
                        });
                    } catch (error) {
                        fail(error);
                    }
                }
            );

            source.pipe(
                uploadStream
            );
        }
    );
};

export const findVideoById = async (
    videoId
) => {
    const objectId =
        toVideoObjectId(
            videoId
        );

    if (!objectId) {
        return null;
    }

    return getVideoBucket()
        .find({
            _id: objectId
        })
        .limit(1)
        .next();
};

export const findVideoByLegacyPath = async (
    legacyPath
) => {
    if (!legacyPath) {
        return null;
    }

    return getVideoBucket()
        .find({
            "metadata.legacyPath":
                legacyPath
        })
        .limit(1)
        .next();
};
