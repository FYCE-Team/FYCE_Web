import "dotenv/config";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import Event from "../models/Event.js";

import {
    findVideoByLegacyPath,
    uploadVideoFileStream
} from "../services/video.service.js";

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const videosRoot =
    path.resolve(
        __dirname,
        "../../uploads/videos"
    );

const DRY_RUN =
    process.argv.includes(
        "--dry-run"
    );

const VIDEO_EXTENSIONS =
    new Set([
        ".mp4",
        ".webm",
        ".mov",
        ".mkv"
    ]);

const mimeByExtension = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska"
};

const toPosix = (value) =>
    String(value || "")
        .replace(/\\/g, "/");

const safeDecodeURIComponent = (
    value
) => {
    try {
        return decodeURIComponent(
            value
        );
    } catch {
        return value;
    }
};

const normalizeLegacyVideoPath = (
    value
) => {
    if (
        typeof value !==
        "string"
    ) {
        return null;
    }

    let normalized =
        safeDecodeURIComponent(
            toPosix(
                value.trim()
            )
        );

    if (!normalized) {
        return null;
    }

    normalized =
        normalized.split("?")[0]
            .split("#")[0];

    const marker =
        "/uploads/videos/";

    const markerIndex =
        normalized.indexOf(
            marker
        );

    if (
        markerIndex >= 0
    ) {
        return normalized.slice(
            markerIndex
        );
    }

    if (
        normalized.startsWith(
            "uploads/videos/"
        )
    ) {
        return `/${normalized}`;
    }

    return null;
};

const listVideoFiles = (
    directory
) => {
    if (
        !fs.existsSync(directory)
    ) {
        return [];
    }

    const result = [];

    const walk = (
        currentDirectory
    ) => {
        for (
            const entry of
            fs.readdirSync(
                currentDirectory,
                {
                    withFileTypes:
                        true
                }
            )
        ) {
            const fullPath =
                path.join(
                    currentDirectory,
                    entry.name
                );

            if (
                entry.isDirectory()
            ) {
                walk(fullPath);
                continue;
            }

            if (
                !entry.isFile()
            ) {
                continue;
            }

            const extension =
                path.extname(
                    entry.name
                )
                .toLowerCase();

            if (
                !VIDEO_EXTENSIONS.has(
                    extension
                )
            ) {
                continue;
            }

            result.push({
                fullPath,
                relativePath:
                    toPosix(
                        path.relative(
                            videosRoot,
                            fullPath
                        )
                    ),
                extension
            });
        }
    };

    walk(directory);

    return result.sort(
        (a, b) =>
            a.relativePath.localeCompare(
                b.relativePath
            )
    );
};

const buildVideoMap = async (
    diskVideos
) => {
    const map = new Map();

    for (
        const video of
        diskVideos
    ) {
        const legacyPath =
            `/uploads/videos/${video.relativePath}`;

        if (DRY_RUN) {
            map.set(
                legacyPath,
                "DRY_RUN"
            );
            continue;
        }

        let stored =
            await findVideoByLegacyPath(
                legacyPath
            );

        if (!stored) {
            const result =
                await uploadVideoFileStream({
                    filePath:
                        video.fullPath,
                    originalName:
                        path.basename(
                            video.fullPath
                        ),
                    mimeType:
                        mimeByExtension[
                            video.extension
                        ] ||
                        "application/octet-stream",
                    extraMetadata: {
                        legacyPath,
                        relativePath:
                            video.relativePath,
                        migratedAt:
                            new Date()
                    }
                });

            stored = {
                _id:
                    result.id
            };

            console.log(
                `Uploaded: ${legacyPath} -> ${result.id}`
            );
        } else {
            console.log(
                `Reused:   ${legacyPath} -> ${stored._id}`
            );
        }

        map.set(
            legacyPath,
            `/api/videos/${stored._id}`
        );
    }

    return map;
};

const replaceVideoValue = (
    value,
    videoMap
) => {
    const legacyPath =
        normalizeLegacyVideoPath(
            value
        );

    if (!legacyPath) {
        return {
            value,
            changed: false,
            legacyPath: null
        };
    }

    const replacement =
        videoMap.get(
            legacyPath
        );

    if (!replacement) {
        console.warn(
            `Missing disk video for DB reference: ${value}`
        );

        return {
            value,
            changed: false,
            legacyPath
        };
    }

    if (DRY_RUN) {
        return {
            value,
            changed: true,
            legacyPath
        };
    }

    return {
        value: replacement,
        changed:
            replacement !== value,
        legacyPath
    };
};

const migrateEvents = async (
    videoMap
) => {
    const documents =
        await Event.find({})
            .lean();

    const operations = [];
    let changedDocuments = 0;
    let changedFields = 0;

    for (const event of documents) {
        const set = {};
        let documentChanged = false;

        for (
            const field of [
                "heroVideoUrl",
                "trailerVideoUrl"
            ]
        ) {
            const replaced =
                replaceVideoValue(
                    event[field],
                    videoMap
                );

            if (
                !replaced.changed
            ) {
                continue;
            }

            documentChanged = true;
            changedFields += 1;

            if (!DRY_RUN) {
                set[field] =
                    replaced.value;
            }
        }

        if (!documentChanged) {
            continue;
        }

        changedDocuments += 1;

        if (!DRY_RUN) {
            operations.push({
                updateOne: {
                    filter: {
                        _id:
                            event._id
                    },
                    update: {
                        $set: set
                    }
                }
            });
        }
    }

    if (
        !DRY_RUN &&
        operations.length > 0
    ) {
        await Event.bulkWrite(
            operations
        );
    }

    return {
        documents:
            changedDocuments,
        fields:
            changedFields
    };
};

const run = async () => {
    try {
        await connectDB();

        console.log(
            "Videos directory:",
            videosRoot
        );

        const diskVideos =
            listVideoFiles(
                videosRoot
            );

        console.log(
            "Disk videos found:",
            diskVideos.length
        );

        const videoMap =
            await buildVideoMap(
                diskVideos
            );

        const eventResult =
            await migrateEvents(
                videoMap
            );

        console.log("");
        console.log(
            DRY_RUN
                ? "DRY RUN RESULT"
                : "MIGRATION RESULT"
        );
        console.log(
            "Event documents:",
            eventResult.documents
        );
        console.log(
            "Event video fields:",
            eventResult.fields
        );

        if (DRY_RUN) {
            console.log("");
            console.log(
                "Dry run hoàn tất. Database chưa bị thay đổi."
            );
        } else {
            console.log("");
            console.log(
                "Migration hoàn tất. Chưa xóa file local."
            );
            console.log(
                "Hãy kiểm tra phát/tua video trước khi tự xóa backend/uploads/videos."
            );
        }
    } catch (error) {
        console.error(
            "Video GridFS migration failed:",
            error
        );

        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

run();
