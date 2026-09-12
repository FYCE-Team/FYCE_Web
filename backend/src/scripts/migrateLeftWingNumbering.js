import "dotenv/config";
import mongoose from "mongoose";

import Venue from "../models/Venue.js";
import VenueLayout from "../models/VenueLayout.js";
import Event from "../models/Event.js";
import EventSeatConfig from "../models/EventSeatConfig.js";
import Seat from "../models/Seat.js";

const MONGO_URI =
    process.env.MONGO_URI;

const VENUE_NAME =
    "FYCE Concert Hall";

const LAYOUT_NAME =
    "FYCE Main Concert Layout";

/*
 * ============================================================
 * EXPECTED LEFT WING NUMBERING
 * ============================================================
 */

const EXPECTED_LEFT_WING = {
    B: [30, 28, 26, 24, 22, 20, 18],
    C: [32, 30, 28, 26, 24, 22, 20, 18],
    D: [34, 32, 30, 28, 26, 24, 22, 20],
    E: [38, 36, 34, 32, 30, 28, 26, 24, 22],
    F: [38, 36, 34, 32, 30, 28, 26, 24, 22],
    G: [42, 40, 38, 36, 34, 32, 30, 28, 26, 24]
};

const normalizeSection = (
    value
) => {
    return String(value || "")
        .trim()
        .toUpperCase();
};

const normalizeRow = (
    value
) => {
    return String(value || "")
        .trim()
        .toUpperCase();
};

const arraysEqual = (
    first,
    second
) => {
    return (
        first.length ===
            second.length &&
        first.every(
            (
                value,
                index
            ) =>
                value ===
                second[index]
        )
    );
};

const seatKey = ({
    section,
    row,
    number
}) => {
    return `${normalizeSection(section)}:${normalizeRow(row)}:${Number(number)}`;
};

const seatLabel = (
    row,
    number
) => {
    return `${normalizeRow(row)}${String(number).padStart(2, "0")}`;
};

/*
 * ============================================================
 * VALIDATE ENV
 * ============================================================
 */

if (!MONGO_URI) {
    throw new Error(
        "MONGO_URI is not configured"
    );
}

/*
 * ============================================================
 * LOAD VENUE
 * ============================================================
 */

const loadVenue = async () => {
    const venue =
        await Venue.findOne({
            name:
                VENUE_NAME
        });

    if (!venue) {
        throw new Error(
            `VENUE_NOT_FOUND:${VENUE_NAME}`
        );
    }

    return venue;
};

/*
 * ============================================================
 * LOAD LAYOUT
 * ============================================================
 */

const loadLayout = async (
    venue
) => {
    const layout =
        await VenueLayout.findOne({
            venueId:
                venue._id,

            name:
                LAYOUT_NAME
        });

    if (!layout) {
        throw new Error(
            `VENUE_LAYOUT_NOT_FOUND:${LAYOUT_NAME}`
        );
    }

    if (
        layout.isActive ===
        false
    ) {
        throw new Error(
            "VENUE_LAYOUT_INACTIVE"
        );
    }

    return layout;
};

/*
 * ============================================================
 * PREPARE LEFT WING MIGRATION
 * ============================================================
 *
 * Quy tắc:
 *
 * Vị trí x của ghế KHÔNG đổi.
 *
 * Chỉ đổi:
 *
 * number
 * label
 *
 * Ví dụ:
 *
 * x=120  old B18 → new B30
 * x=158  old B20 → new B28
 * x=196  old B22 → new B26
 * ...
 * x=348  old B30 → new B18
 *
 */

const prepareLayoutMigration = (
    layout
) => {
    const oldToNewMap =
        new Map();

    let changedRows = 0;

    let alreadyMigratedRows =
        0;

    const sections =
        layout.sections;

    const leftWing =
        sections.find(
            (
                section
            ) =>
                normalizeSection(
                    section.code
                ) ===
                "LEFT_WING"
        );

    if (!leftWing) {
        throw new Error(
            "LEFT_WING_NOT_FOUND"
        );
    }

    for (
        const row of
            leftWing.rows
    ) {
        const rowCode =
            normalizeRow(
                row.row
            );

        const expected =
            EXPECTED_LEFT_WING[
                rowCode
            ];

        if (!expected) {
            continue;
        }

        const seats =
            [...row.seats];

        if (
            seats.length !==
            expected.length
        ) {
            throw new Error(
                `LEFT_WING_ROW_COUNT_INVALID:${rowCode}:expected=${expected.length}:actual=${seats.length}`
            );
        }

        const sortedByX =
            [...seats].sort(
                (
                    first,
                    second
                ) =>
                    Number(
                        first.position?.x || 0
                    ) -
                    Number(
                        second.position?.x || 0
                    )
            );

        const currentNumbers =
            sortedByX.map(
                (
                    seat
                ) =>
                    Number(
                        seat.number
                    )
            );

        /*
         * Nếu đã đúng numbering mới,
         * không thực hiện lại.
         */

        if (
            arraysEqual(
                currentNumbers,
                expected
            )
        ) {
            alreadyMigratedRows++;
            continue;
        }

        /*
         * Numbering cũ phải là
         * ngược lại của numbering mới.
         */

        const oldExpected =
            [...expected].reverse();

        if (
            !arraysEqual(
                currentNumbers,
                oldExpected
            )
        ) {
            throw new Error(
                `LEFT_WING_UNEXPECTED_NUMBERING:${rowCode}:actual=${currentNumbers.join(",")}:expectedNew=${expected.join(",")}:expectedOld=${oldExpected.join(",")}`
            );
        }

        /*
         * Tạo mapping:
         *
         * oldKey → newNumber
         */

        sortedByX.forEach(
            (
                seat,
                index
            ) => {
                const oldNumber =
                    Number(
                        seat.number
                    );

                const newNumber =
                    expected[
                        index
                    ];

                const oldKey =
                    seatKey({
                        section:
                            "LEFT_WING",

                        row:
                            rowCode,

                        number:
                            oldNumber
                    });

                const newKey =
                    seatKey({
                        section:
                            "LEFT_WING",

                        row:
                            rowCode,

                        number:
                            newNumber
                    });

                oldToNewMap.set(
                    oldKey,
                    {
                        newNumber,
                        newKey
                    }
                );

                seat.number =
                    newNumber;

                seat.label =
                    seatLabel(
                        rowCode,
                        newNumber
                    );
            }
        );

        changedRows++;
    }

    return {
        changedRows,
        alreadyMigratedRows,
        oldToNewMap
    };
};

/*
 * ============================================================
 * VALIDATE MIGRATED LAYOUT
 * ============================================================
 */

const validateMigratedLayout = (
    layout
) => {
    const leftWing =
        layout.sections.find(
            (
                section
            ) =>
                normalizeSection(
                    section.code
                ) ===
                "LEFT_WING"
        );

    if (!leftWing) {
        throw new Error(
            "LEFT_WING_NOT_FOUND_AFTER_MIGRATION"
        );
    }

    for (
        const row of
            leftWing.rows
    ) {
        const rowCode =
            normalizeRow(
                row.row
            );

        const expected =
            EXPECTED_LEFT_WING[
                rowCode
            ];

        if (!expected) {
            continue;
        }

        const sortedByX =
            [...row.seats].sort(
                (
                    first,
                    second
                ) =>
                    Number(
                        first.position?.x || 0
                    ) -
                    Number(
                        second.position?.x || 0
                    )
            );

        const actual =
            sortedByX.map(
                (
                    seat
                ) =>
                    Number(
                        seat.number
                    )
            );

        if (
            !arraysEqual(
                actual,
                expected
            )
        ) {
            throw new Error(
                `LEFT_WING_MIGRATION_VALIDATION_FAILED:${rowCode}:actual=${actual.join(",")}:expected=${expected.join(",")}`
            );
        }

        for (
            const seat of
                sortedByX
        ) {
            const expectedLabel =
                seatLabel(
                    rowCode,
                    seat.number
                );

            if (
                seat.label !==
                expectedLabel
            ) {
                throw new Error(
                    `LEFT_WING_LABEL_INVALID:${rowCode}:${seat.number}`
                );
            }
        }
    }
};

/*
 * ============================================================
 * GET EVENTS USING THIS LAYOUT
 * ============================================================
 */

const loadEvents =
    async (
        layoutId
    ) => {
        return Event.find({
            venueLayoutId:
                layoutId
        })
            .select(
                "_id title venueId venueLayoutId"
            )
            .lean();
    };

/*
 * ============================================================
 * VALIDATE EVENT SEAT CONFIG
 * ============================================================
 */

const migrateEventSeatConfig =
    async ({
        events,
        oldToNewMap
    }) => {
        let updatedConfigs =
            0;

        let skippedConfigs =
            0;

        for (
            const event of
                events
        ) {
            const config =
                await EventSeatConfig.findOne(
                    {
                        eventId:
                            event._id
                    }
                );

            if (!config) {
                skippedConfigs++;
                continue;
            }

            let changed =
                false;

            const migratedAssignments =
                config.assignments.map(
                    (
                        assignment
                    ) => {
                        const section =
                            normalizeSection(
                                assignment.section
                            );

                        const row =
                            normalizeRow(
                                assignment.row
                            );

                        const number =
                            Number(
                                assignment.number
                            );

                        if (
                            section !==
                            "LEFT_WING"
                        ) {
                            return assignment;
                        }

                        const oldKey =
                            seatKey({
                                section,
                                row,
                                number
                            });

                        const mapping =
                            oldToNewMap.get(
                                oldKey
                            );

                        if (!mapping) {
                            throw new Error(
                                `EVENT_SEAT_CONFIG_MAPPING_NOT_FOUND:${event._id}:${oldKey}`
                            );
                        }

                        changed =
                            changed ||
                            mapping.newNumber !==
                                number;

                        return {
                            ...assignment.toObject(),
                            section:
                                "LEFT_WING",
                            row,
                            number:
                                mapping.newNumber
                        };
                    }
                );

            if (changed) {
                config.assignments =
                    migratedAssignments;

                await config.save();

                updatedConfigs++;
            } else {
                skippedConfigs++;
            }
        }

        return {
            updatedConfigs,
            skippedConfigs
        };
    };

/*
 * ============================================================
 * VALIDATE SOLD / HELD SEATS
 * ============================================================
 *
 * Không đổi numbering của ghế đã held/sold,
 * vì đây là dữ liệu booking thực tế.
 *
 * Nếu phát hiện, migration dừng lại.
 */

const validateSeatsCanBeMigrated =
    async (
        eventIds
    ) => {
        if (
            eventIds.length ===
            0
        ) {
            return 0;
        }

        const protectedCount =
            await Seat.countDocuments({
                eventId: {
                    $in:
                        eventIds
                },

                section:
                    "left_wing",

                status: {
                    $in: [
                        "held",
                        "sold"
                    ]
                }
            });

        if (
            protectedCount > 0
        ) {
            throw new Error(
                `SEAT_MIGRATION_BLOCKED_PROTECTED_SEATS:${protectedCount}`
            );
        }

        return protectedCount;
    };

/*
 * ============================================================
 * MIGRATE SEATS
 * ============================================================
 */

const migrateSeats = async ({
    eventIds,
    oldToNewMap
}) => {
    if (
        eventIds.length ===
        0
    ) {
        return 0;
    }

    const seats =
        await Seat.find({
            eventId: {
                $in:
                    eventIds
            },

            section:
                "left_wing"
        });

    const operations = [];

    for (
        const seat of seats
    ) {
        const oldKey =
            seatKey({
                section:
                    "LEFT_WING",

                row:
                    seat.row,

                number:
                    seat.number
            });

        const mapping =
            oldToNewMap.get(
                oldKey
            );

        /*
         * Nếu migration đã chạy trước đó
         * thì number hiện tại có thể đã là
         * number mới.
         *
         * Trong trường hợp đó tìm mapping
         * ngược theo row + current position
         * sẽ an toàn hơn bằng cách sử dụng
         * layout positions.
         */

        if (!mapping) {
            const row =
                normalizeRow(
                    seat.row
                );

            const expected =
                EXPECTED_LEFT_WING[
                    row
                ];

            if (
                expected &&
                expected.includes(
                    Number(
                        seat.number
                    )
                )
            ) {
                continue;
            }

            throw new Error(
                `SEAT_MIGRATION_MAPPING_NOT_FOUND:${seat._id}:${oldKey}`
            );
        }

        if (
            mapping.newNumber ===
            seat.number
        ) {
            continue;
        }

        operations.push({
            updateOne: {
                filter: {
                    _id:
                        seat._id
                },

                update: {
                    $set: {
                        number:
                            mapping.newNumber,

                        label:
                            seatLabel(
                                seat.row,
                                mapping.newNumber
                            )
                    }
                }
            }
        });
    }

    if (
        operations.length ===
        0
    ) {
        return 0;
    }

    const result =
        await Seat.bulkWrite(
            operations,
            {
                ordered:
                    true
            }
        );

    return result.modifiedCount;
};

/*
 * ============================================================
 * MAIN
 * ============================================================
 */

const run = async () => {
    await mongoose.connect(
        MONGO_URI
    );

    console.log(
        "Connected to MongoDB"
    );

    console.log(
        `Database name: ${mongoose.connection.name}`
    );

    const venue =
        await loadVenue();

    console.log(
        `Venue: ${venue.name}`
    );

    const layout =
        await loadLayout(
            venue
        );

    console.log(
        `Layout: ${layout.name}`
    );

    const {
        changedRows,
        alreadyMigratedRows,
        oldToNewMap
    } =
        prepareLayoutMigration(
            layout
        );

    if (
        changedRows ===
        0
    ) {
        console.log("");
        console.log(
            "LEFT_WING numbering is already up to date."
        );

        console.log(
            `Already migrated rows: ${alreadyMigratedRows}`
        );

        await mongoose.disconnect();

        return;
    }

    console.log("");
    console.log(
        `Rows to migrate: ${changedRows}`
    );

    const events =
        await loadEvents(
            layout._id
        );

    console.log(
        `Events using this layout: ${events.length}`
    );

    const eventIds =
        events.map(
            (
                event
            ) =>
                event._id
        );

    await validateSeatsCanBeMigrated(
        eventIds
    );

    /*
     * ========================================================
     * MIGRATE LAYOUT
     * ========================================================
     */

    validateMigratedLayout(
        layout
    );

    await layout.save();

    console.log(
        "VenueLayout updated."
    );

    /*
     * ========================================================
     * MIGRATE EVENT SEAT CONFIG
     * ========================================================
     */

    const configResult =
        await migrateEventSeatConfig({
            events,
            oldToNewMap
        });

    console.log(
        `EventSeatConfig updated: ${configResult.updatedConfigs}`
    );

    console.log(
        `EventSeatConfig skipped: ${configResult.skippedConfigs}`
    );

    /*
     * ========================================================
     * MIGRATE SEATS
     * ========================================================
     */

    const modifiedSeats =
        await migrateSeats({
            eventIds,
            oldToNewMap
        });

    console.log(
        `Seat documents updated: ${modifiedSeats}`
    );

    /*
     * ========================================================
     * RESULT
     * ========================================================
     */

    console.log("");
    console.log(
        "LEFT_WING migration completed successfully."
    );

    console.log(
        "Positions were preserved."
    );

    console.log(
        "Numbers and labels were reversed from outside → inside."
    );

    await mongoose.disconnect();
};

run().catch(
    async (
        error
    ) => {
        console.error("");
        console.error(
            "LEFT_WING migration failed:"
        );

        console.error(
            error.message
        );

        try {
            await mongoose.disconnect();
        } catch {}

        process.exit(1);
    }
);