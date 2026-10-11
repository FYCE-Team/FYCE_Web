import fs from "node:fs";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import mongoose from "mongoose";

const BUCKET_NAME = "images";
const CHUNK_BYTES = 255 * 1024;

const ensureDatabase = () => {
    const database = mongoose.connection.db;
    if (!database) throw new Error("IMAGE_DATABASE_NOT_READY");
    return database;
};

export const getImageBucket = () => new mongoose.mongo.GridFSBucket(ensureDatabase(), { bucketName: BUCKET_NAME });

export const toImageObjectId = value => {
    if (!value || !mongoose.Types.ObjectId.isValid(String(value))) return null;
    return new mongoose.Types.ObjectId(String(value));
};

const buildMetadata = ({ originalName, mimeType, uploadedBy = null, extraMetadata = {} }) => ({
    originalName: originalName || "image",
    contentType: mimeType || "application/octet-stream",
    uploadedBy: uploadedBy || null,
    uploadedAt: new Date(),
    ...extraMetadata
});

const storeImageSource = async ({ source, originalName, mimeType, uploadedBy, extraMetadata }) => {
    let uploadStream;
    try {
        const bucket = getImageBucket();
        uploadStream = bucket.openUploadStream(originalName || "image", {
            chunkSizeBytes: CHUNK_BYTES,
            contentType: mimeType || "application/octet-stream",
            metadata: buildMetadata({ originalName, mimeType, uploadedBy, extraMetadata })
        });
        // write callbacks and finished() handle errors; handle the event between awaits too.
        uploadStream.on("error", () => {});
        // Await bounded writes so cleanup cannot race outstanding chunk inserts.
        for await (const chunk of source) {
            for (let offset = 0; offset < chunk.length; offset += CHUNK_BYTES) {
                const part = chunk.subarray(offset, offset + CHUNK_BYTES);
                await new Promise((resolve, reject) => uploadStream.write(part, error => error ? reject(error) : resolve()));
            }
        }
        const completion = finished(uploadStream, { readable: false, cleanup: true });
        uploadStream.end();
        await completion;
        const file = await bucket.find({ _id: uploadStream.id }).limit(1).next();
        if (!file) throw new Error("IMAGE_UPLOAD_METADATA_MISSING");
        return {
            id: uploadStream.id,
            filename: file.filename || originalName || "image",
            length: Number(file.length),
            contentType: mimeType || "application/octet-stream"
        };
    } catch (error) {
        source.destroy();
        // Only this newly allocated ID is removed; never remove existing/shared files.
        if (uploadStream) {
            try {
                // abort rejects after finalization starts, so also clean the exact ID below.
                try { await uploadStream.abort(); } catch { /* completed or failed finalization */ }
                uploadStream.destroy();
                const database = ensureDatabase();
                await database.collection(`${BUCKET_NAME}.files`).deleteOne({ _id: uploadStream.id });
                await database.collection(`${BUCKET_NAME}.chunks`).deleteMany({ files_id: uploadStream.id });
                error.imageCleanupComplete = true;
            } catch {
                error.imageCleanupComplete = false;
                console.warn("Image upload cleanup failed; reserved storage remains charged.");
            }
        } else {
            error.imageCleanupComplete = true;
        }
        throw error;
    }
};

export const uploadImageBuffer = ({ buffer, ...options }) => {
    if (!Buffer.isBuffer(buffer)) throw new Error("IMAGE_BUFFER_INVALID");
    function* parts() {
        for (let offset = 0; offset < buffer.length; offset += CHUNK_BYTES) yield buffer.subarray(offset, offset + CHUNK_BYTES);
    }
    return storeImageSource({ source: Readable.from(parts()), ...options });
};

export const uploadImageFileStream = ({ filePath, ...options }) => storeImageSource({ source: fs.createReadStream(filePath), ...options });

export const findImageById = async imageId => {
    const objectId = toImageObjectId(imageId);
    if (!objectId) return null;
    return getImageBucket().find({ _id: objectId }).limit(1).next();
};

export const findImageByLegacyPath = async legacyPath => {
    if (!legacyPath) return null;
    return getImageBucket().find({ "metadata.legacyPath": legacyPath }).limit(1).next();
};
