import fs from "fs";
import mongoose from "mongoose";

const BUCKET_NAME = "images";

const ensureDatabase = () => {
    const database =
        mongoose.connection.db;

    if (!database) {
        throw new Error(
            "IMAGE_DATABASE_NOT_READY"
        );
    }

    return database;
};

export const getImageBucket = () => {
    return new mongoose.mongo.GridFSBucket(
        ensureDatabase(),
        {
            bucketName: BUCKET_NAME
        }
    );
};

export const toImageObjectId = (
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
        originalName || "image",

    contentType:
        mimeType ||
        "application/octet-stream",

    uploadedBy:
        uploadedBy || null,

    uploadedAt:
        new Date(),

    ...extraMetadata
});

export const uploadImageBuffer = ({
    buffer,
    originalName,
    mimeType,
    uploadedBy = null,
    extraMetadata = {}
}) => {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error(
            "IMAGE_BUFFER_INVALID"
        );
    }

    return new Promise(
        (resolve, reject) => {
            const bucket =
                getImageBucket();

            const uploadStream =
                bucket.openUploadStream(
                    originalName ||
                        "image",
                    {
                        contentType:
                            mimeType ||
                            "application/octet-stream",

                        metadata:
                            buildMetadata({
                                originalName,
                                mimeType,
                                uploadedBy,
                                extraMetadata
                            })
                    }
                );

            uploadStream.once(
                "error",
                reject
            );

            uploadStream.once(
                "finish",
                async () => {
                    try {
                        const file =
                            await bucket
                                .find({
                                    _id:
                                        uploadStream.id
                                })
                                .limit(1)
                                .next();

                        resolve({
                            id:
                                uploadStream.id,
                            filename:
                                file?.filename ||
                                originalName ||
                                "image",
                            length:
                                file?.length ||
                                buffer.length,
                            contentType:
                                mimeType ||
                                "application/octet-stream"
                        });
                    } catch (error) {
                        reject(error);
                    }
                }
            );

            uploadStream.end(
                buffer
            );
        }
    );
};

export const uploadImageFileStream = ({
    filePath,
    originalName,
    mimeType,
    uploadedBy = null,
    extraMetadata = {}
}) => {
    return new Promise(
        (resolve, reject) => {
            const bucket =
                getImageBucket();

            const uploadStream =
                bucket.openUploadStream(
                    originalName ||
                        "image",
                    {
                        contentType:
                            mimeType ||
                            "application/octet-stream",

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

            const fail = (error) => {
                source.destroy();
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

                        resolve({
                            id:
                                uploadStream.id,
                            filename:
                                file?.filename ||
                                originalName ||
                                "image",
                            length:
                                file?.length ||
                                stat.size,
                            contentType:
                                mimeType ||
                                "application/octet-stream"
                        });
                    } catch (error) {
                        reject(error);
                    }
                }
            );

            source.pipe(
                uploadStream
            );
        }
    );
};

export const findImageById = async (
    imageId
) => {
    const objectId =
        toImageObjectId(
            imageId
        );

    if (!objectId) {
        return null;
    }

    return getImageBucket()
        .find({
            _id: objectId
        })
        .limit(1)
        .next();
};

export const findImageByLegacyPath = async (
    legacyPath
) => {
    if (!legacyPath) {
        return null;
    }

    return getImageBucket()
        .find({
            "metadata.legacyPath":
                legacyPath
        })
        .limit(1)
        .next();
};
