import fs from "fs";
import { finished } from "node:stream/promises";
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
export const uploadVideoFileStream = async ({
    filePath,
    originalName,
    mimeType,
    uploadedBy = null,
    extraMetadata = {}
}) => {
    const source = fs.createReadStream(filePath);
    let uploadStream;
    try {
        const bucket = getVideoBucket();
        const chunkSizeBytes = 1024 * 1024;
        uploadStream = bucket.openUploadStream(originalName || "video", {
            contentType: mimeType || "application/octet-stream",
            chunkSizeBytes,
            metadata: buildMetadata({ originalName, mimeType, uploadedBy, extraMetadata })
        });
        uploadStream.on("error", () => {});
        // Sequential bounded writes settle before any failed upload cleanup runs.
        for await (const chunk of source) {
            for (let offset = 0; offset < chunk.length; offset += chunkSizeBytes) {
                const part = chunk.subarray(offset, offset + chunkSizeBytes);
                await new Promise((resolve, reject) => uploadStream.write(part, error => error ? reject(error) : resolve()));
            }
        }
        const completion = finished(uploadStream, { readable: false, cleanup: true });
        uploadStream.end();
        await completion;
        const file = await bucket.find({ _id: uploadStream.id }).limit(1).next();
        if (!file) throw new Error("VIDEO_UPLOAD_METADATA_MISSING");
        return {
            id: uploadStream.id,
            filename: file.filename || originalName || "video",
            length: Number(file.length),
            contentType: mimeType || "application/octet-stream"
        };
    } catch (error) {
        source.destroy();
        if (uploadStream) {
            try {
                // abort cannot run after finalization starts. Explicit fresh-ID cleanup
                // also handles metadata insert/read failure after all chunks were written.
                try { await uploadStream.abort(); } catch { /* already finalized */ }
                uploadStream.destroy();
                const database = ensureDatabase();
                await database.collection(`${BUCKET_NAME}.files`).deleteOne({ _id: uploadStream.id });
                await database.collection(`${BUCKET_NAME}.chunks`).deleteMany({ files_id: uploadStream.id });
            } catch {
                console.warn("Video upload cleanup failed; operator reconciliation is required.");
            }
        }
        throw error;
    }
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
