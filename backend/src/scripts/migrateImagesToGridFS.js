import "dotenv/config";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "../config/db.js";
import mongoose from "mongoose";

import Event from "../models/Event.js";
import HeroSection from "../models/HeroSection.js";
import AboutSection from "../models/AboutSection.js";
import Gallery from "../models/Gallery.js";

import {
    findImageByLegacyPath,
    uploadImageFileStream
} from "../services/image.service.js";

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const imagesRoot =
    path.resolve(
        __dirname,
        "../../uploads/images"
    );

const DRY_RUN =
    process.argv.includes(
        "--dry-run"
    );

const IMAGE_EXTENSIONS =
    new Set([
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif"
    ]);

const mimeByExtension = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif"
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

const normalizeLegacyImagePath = (
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
        "/uploads/images/";

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
            "uploads/images/"
        )
    ) {
        return `/${normalized}`;
    }

    return null;
};

const listImageFiles = (
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
                !IMAGE_EXTENSIONS.has(
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
                            imagesRoot,
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

const buildImageMap = async (
    diskImages
) => {
    const map = new Map();

    for (
        const image of
        diskImages
    ) {
        const legacyPath =
            `/uploads/images/${image.relativePath}`;

        if (DRY_RUN) {
            map.set(
                legacyPath,
                "DRY_RUN"
            );
            continue;
        }

        let stored =
            await findImageByLegacyPath(
                legacyPath
            );

        if (!stored) {
            const result =
                await uploadImageFileStream({
                    filePath:
                        image.fullPath,
                    originalName:
                        path.basename(
                            image.fullPath
                        ),
                    mimeType:
                        mimeByExtension[
                            image.extension
                        ] ||
                        "application/octet-stream",
                    extraMetadata: {
                        legacyPath,
                        relativePath:
                            image.relativePath,
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
            `/api/images/${stored._id}`
        );
    }

    return map;
};

const replaceImageValue = (
    value,
    imageMap
) => {
    const legacyPath =
        normalizeLegacyImagePath(
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
        imageMap.get(
            legacyPath
        );

    if (!replacement) {
        console.warn(
            `Missing disk image for DB reference: ${value}`
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
    imageMap
) => {
    const documents =
        await Event.find({})
            .lean();

    const operations = [];
    let changedDocuments = 0;
    let changedFields = 0;

    for (const event of documents) {
        const set = {};

        for (
            const field of [
                "coverImage",
                "seatingChartImage"
            ]
        ) {
            const replaced =
                replaceImageValue(
                    event[field],
                    imageMap
                );

            if (replaced.changed) {
                changedFields += 1;

                if (!DRY_RUN) {
                    set[field] =
                        replaced.value;
                }
            }
        }

        const transformArray = (
            source,
            imageField
        ) => {
            if (!Array.isArray(source)) {
                return {
                    value: source,
                    changed: false,
                    count: 0
                };
            }

            let changed = false;
            let count = 0;

            const value =
                source.map(
                    (item) => {
                        const replaced =
                            replaceImageValue(
                                item?.[
                                    imageField
                                ],
                                imageMap
                            );

                        if (
                            !replaced.changed
                        ) {
                            return item;
                        }

                        changed = true;
                        count += 1;

                        if (DRY_RUN) {
                            return item;
                        }

                        return {
                            ...item,
                            [imageField]:
                                replaced.value
                        };
                    }
                );

            return {
                value,
                changed,
                count
            };
        };

        const artists =
            transformArray(
                event.artists,
                "image"
            );

        const programGallery =
            transformArray(
                event.programGallery,
                "image"
            );

        const backstageGallery =
            transformArray(
                event.backstageGallery,
                "image"
            );

        for (
            const [
                field,
                transformed
            ] of [
                ["artists", artists],
                [
                    "programGallery",
                    programGallery
                ],
                [
                    "backstageGallery",
                    backstageGallery
                ]
            ]
        ) {
            if (
                transformed.changed
            ) {
                changedFields +=
                    transformed.count;

                if (!DRY_RUN) {
                    set[field] =
                        transformed.value;
                }
            }
        }

        const changed =
            Object.keys(set).length > 0 ||
            (
                DRY_RUN &&
                [
                    artists,
                    programGallery,
                    backstageGallery
                ].some(
                    (item) =>
                        item.changed
                )
            ) ||
            (
                DRY_RUN &&
                [
                    "coverImage",
                    "seatingChartImage"
                ].some(
                    (field) =>
                        replaceImageValue(
                            event[field],
                            imageMap
                        ).changed
                )
            );

        if (!changed) {
            continue;
        }

        changedDocuments += 1;

        if (!DRY_RUN) {
            operations.push({
                updateOne: {
                    filter: {
                        _id: event._id
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
            operations,
            {
                ordered: false
            }
        );
    }

    return {
        documents:
            changedDocuments,
        fields:
            changedFields
    };
};

const migrateSimpleModel = async ({
    Model,
    field
}) => {
    const documents =
        await Model.find({})
            .lean();

    const operations = [];
    let documentsChanged = 0;

    for (const document of documents) {
        const replaced =
            replaceImageValue(
                document[field],
                globalImageMap
            );

        if (!replaced.changed) {
            continue;
        }

        documentsChanged += 1;

        if (!DRY_RUN) {
            operations.push({
                updateOne: {
                    filter: {
                        _id:
                            document._id
                    },
                    update: {
                        $set: {
                            [field]:
                                replaced.value
                        }
                    }
                }
            });
        }
    }

    if (
        !DRY_RUN &&
        operations.length > 0
    ) {
        await Model.bulkWrite(
            operations,
            {
                ordered: false
            }
        );
    }

    return documentsChanged;
};

let globalImageMap =
    new Map();

const run = async () => {
    await connectDB();

    const diskImages =
        listImageFiles(
            imagesRoot
        );

    console.log(
        `Images directory: ${imagesRoot}`
    );

    console.log(
        `Disk images found: ${diskImages.length}`
    );

    if (
        diskImages.length === 0
    ) {
        console.log(
            "Không tìm thấy ảnh local để migrate."
        );
        return;
    }

    globalImageMap =
        await buildImageMap(
            diskImages
        );

    const eventResult =
        await migrateEvents(
            globalImageMap
        );

    const heroCount =
        await migrateSimpleModel({
            Model:
                HeroSection,
            field:
                "backgroundImage"
        });

    const aboutCount =
        await migrateSimpleModel({
            Model:
                AboutSection,
            field:
                "image"
        });

    const galleryCount =
        await migrateSimpleModel({
            Model:
                Gallery,
            field:
                "image"
        });

    console.log("");
    console.log(
        DRY_RUN
            ? "DRY RUN RESULT"
            : "MIGRATION RESULT"
    );

    console.log(
        `Event documents: ${eventResult.documents}`
    );
    console.log(
        `Event image fields: ${eventResult.fields}`
    );
    console.log(
        `Hero documents: ${heroCount}`
    );
    console.log(
        `About documents: ${aboutCount}`
    );
    console.log(
        `Gallery documents: ${galleryCount}`
    );

    if (!DRY_RUN) {
        console.log("");
        console.log(
            "Migration hoàn tất. Chưa xóa file local."
        );
        console.log(
            "Hãy kiểm tra web trước khi tự xóa backend/uploads/images."
        );
    }
};

run()
    .catch((error) => {
        console.error(
            "Image GridFS migration failed:",
            error
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
