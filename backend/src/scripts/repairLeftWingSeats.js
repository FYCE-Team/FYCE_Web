import "dotenv/config";
import mongoose from "mongoose";

import Event from "../models/Event.js";
import Venue from "../models/Venue.js";
import VenueLayout from "../models/VenueLayout.js";
import Seat from "../models/Seat.js";

const MONGO_URI =
    process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error(
        "MONGO_URI is not configured"
    );
};

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

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const normalizeSection = (
    value
) => {
    return String(
        value || ""
    )
        .trim()
        .toUpperCase();
};

const normalizeRow = (
    value
) => {
    return String(
        value || ""
    )
        .trim()
        .toUpperCase();
};

const makeLabel = (
    row,
    number
) => {
    return `${row}${String(number).padStart(2, "0")}`;
};

const makeKey = ({
    eventId,
    section,
    row,
    number
}) => {
    return [
        String(eventId),
        normalizeSection(section),
        normalizeRow(row),
        Number(number)
    ].join(":");
};

/*
 * ============================================================
 * LOAD VENUE + LAYOUT
 * ============================================================
 */

const loadLayout = async () => {
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

    return {
        venue,
        layout
    };
};

/*
 * ============================================================
 * LOAD EVENTS
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
 * GET LEFT WING POSITIONS FROM LAYOUT
 * ============================================================
 *
 * Layout đã được migrate thành:
 *
 * B:
 * 30 28 26 24 22 20 18
 *
 * Nhưng Seat hiện tại vẫn có numbering cũ.
 *
 * Ta lấy thứ tự vật lý bằng position.x.
 *
 * LEFT WING:
 * nhỏ x = ngoài cùng trái
 * lớn x = gần trung tâm
 *
 * ============================================================
 */

const buildExpectedPositionMap =
    (
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
                "LEFT_WING_NOT_FOUND"
            );
        }

        const map =
            new Map();

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

            const sorted =
                [
                    ...row.seats
                ].sort(
                    (
                        first,
                        second
                    ) =>
                        Number(
                            first.position?.x ||
                                0
                        ) -
                        Number(
                            second.position?.x ||
                                0
                        )
                );

            if (
                sorted.length !==
                expected.length
            ) {
                throw new Error(
                    `LEFT_WING_LAYOUT_COUNT_INVALID:${rowCode}:expected=${expected.length}:actual=${sorted.length}`
                );
            }

            sorted.forEach(
                (
                    seat,
                    index
                ) => {
                    const newNumber =
                        expected[
                            index
                        ];

                    const positionKey =
                        `${rowCode}:${Number(seat.position.x)}:${Number(seat.position.y)}`;

                    map.set(
                        positionKey,
                        {
                            row:
                                rowCode,

                            newNumber,

                            newLabel:
                                makeLabel(
                                    rowCode,
                                    newNumber
                                )
                        }
                    );
                }
            );
        }

        return map;
    };

/*
 * ============================================================
 * FIND MATCHING LAYOUT POSITION
 * ============================================================
 */

const findExpectedNumber =
    (
        layout,
        seat
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
                "LEFT_WING_NOT_FOUND"
            );
        }

        const rowCode =
            normalizeRow(
                seat.row
            );

        const layoutRow =
            leftWing.rows.find(
                (
                    row
                ) =>
                    normalizeRow(
                        row.row
                    ) ===
                    rowCode
            );

        if (!layoutRow) {
            throw new Error(
                `LEFT_WING_ROW_NOT_FOUND:${rowCode}`
            );
        }

        const targetX =
            Number(
                seat.position?.x
            );

        const targetY =
            Number(
                seat.position?.y
            );

        const layoutSeat =
            layoutRow.seats.find(
                (
                    layoutSeat
                ) =>
                    Number(
                        layoutSeat.position?.x
                    ) ===
                        targetX &&
                    Number(
                        layoutSeat.position?.y
                    ) ===
                        targetY
            );

        if (!layoutSeat) {
            throw new Error(
                `LAYOUT_POSITION_NOT_FOUND:${seat._id}:${rowCode}:${targetX}:${targetY}`
            );
        }

        const sorted =
            [
                ...layoutRow.seats
            ].sort(
                (
                    first,
                    second
                ) =>
                    Number(
                        first.position?.x ||
                            0
                    ) -
                    Number(
                        second.position?.x ||
                            0
                    )
            );

        const index =
            sorted.findIndex(
                (
                    item
                ) =>
                    String(
                        item._id
                    ) ===
                    String(
                        layoutSeat._id
                    )
            );

        const expected =
            EXPECTED_LEFT_WING[
                rowCode
            ];

        if (
            index < 0 ||
            !expected ||
            expected[index] ===
                undefined
        ) {
            throw new Error(
                `LAYOUT_POSITION_INDEX_INVALID:${seat._id}`
            );
        }

        return {
            newNumber:
                expected[
                    index
                ],

            newLabel:
                makeLabel(
                    rowCode,
                    expected[
                        index
                    ]
                )
        };
    };

/*
 * ============================================================
 * CHECK PROTECTED SEATS
 * ============================================================
 */

const validateProtectedSeats =
    async (
        eventIds
    ) => {
        const protectedSeats =
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
            protectedSeats > 0
        ) {
            throw new Error(
                `SEAT_MIGRATION_BLOCKED_PROTECTED_SEATS:${protectedSeats}`
            );
        }
    };

/*
 * ============================================================
 * MIGRATE ONE EVENT
 * ============================================================
 */

const migrateEventSeats =
    async (
        event,
        layout
    ) => {
        const seats =
            await Seat.find({
                eventId:
                    event._id,

                section:
                    "left_wing"
            });

        if (
            seats.length ===
            0
        ) {
            return {
                total: 0,
                modified: 0
            };
        }

        const rowGroups =
            new Map();

        for (
            const seat of seats
        ) {
            const rowCode =
                normalizeRow(
                    seat.row
                );

            if (
                !rowGroups.has(
                    rowCode
                )
            ) {
                rowGroups.set(
                    rowCode,
                    []
                );
            }

            rowGroups.get(
                rowCode
            ).push(
                seat
            );
        }

        const changes = [];

        for (
            const [
                row,
                rowSeats
            ] of rowGroups
        ) {
            const expected =
                EXPECTED_LEFT_WING[
                    row
                ];

            if (!expected) {
                throw new Error(
                    `UNEXPECTED_LEFT_WING_ROW:${row}`
                );
            }

            if (
                rowSeats.length !==
                expected.length
            ) {
                throw new Error(
                    `SEAT_ROW_COUNT_INVALID:${event._id}:${row}:expected=${expected.length}:actual=${rowSeats.length}`
                );
            }

            const sortedByX =
                [
                    ...rowSeats
                ].sort(
                    (
                        first,
                        second
                    ) =>
                        Number(
                            first.position?.x ||
                                0
                        ) -
                        Number(
                            second.position?.x ||
                                0
                        )
                );

            sortedByX.forEach(
                (
                    seat,
                    index
                ) => {
                    const newNumber =
                        expected[
                            index
                        ];

                    const newLabel =
                        makeLabel(
                            row,
                            newNumber
                        );

                    changes.push({
                        seatId:
                            seat._id,

                        oldNumber:
                            seat.number,

                        oldLabel:
                            seat.label,

                        newNumber,

                        newLabel
                    });
                }
            );
        }

        /*
         * ========================================================
         * CHECK IF ALREADY CORRECT
         * ========================================================
         */

        const alreadyCorrect =
            changes.every(
                (
                    change
                ) =>
                    Number(
                        change.oldNumber
                    ) ===
                        Number(
                            change.newNumber
                        ) &&
                    change.oldLabel ===
                        change.newLabel
            );

        if (
            alreadyCorrect
        ) {
            return {
                total:
                    changes.length,

                modified: 0
            };
        }

        /*
         * ========================================================
         * TEMPORARY NUMBERS
         * ========================================================
         *
         * Không dùng số âm vì Seat.number có min: 1.
         *
         * 100000 + index tạo key tạm
         * không trùng với số ghế thật.
         */

        const temporaryBase =
            100000;

        const temporaryOperations =
            changes.map(
                (
                    change,
                    index
                ) => ({
                    updateOne: {
                        filter: {
                            _id:
                                change.seatId,

                            eventId:
                                event._id,

                            section:
                                "left_wing"
                        },

                        update: {
                            $set: {
                                number:
                                    temporaryBase +
                                    index,

                                label:
                                    `TMP${temporaryBase + index}`
                            }
                        }
                    }
                })
            );

        await Seat.bulkWrite(
            temporaryOperations,
            {
                ordered:
                    true
            }
        );

        /*
         * ========================================================
         * FINAL NUMBERS
         * ========================================================
         */

        const finalOperations =
            changes.map(
                (
                    change,
                    index
                ) => ({
                    updateOne: {
                        filter: {
                            _id:
                                change.seatId,

                            eventId:
                                event._id,

                            section:
                                "left_wing",

                            number:
                                temporaryBase +
                                index
                        },

                        update: {
                            $set: {
                                number:
                                    change.newNumber,

                                label:
                                    change.newLabel
                            }
                        }
                    }
                })
            );

        await Seat.bulkWrite(
            finalOperations,
            {
                ordered:
                    true
            }
        );

        return {
            total:
                changes.length,

            modified:
                changes.filter(
                    (
                        change
                    ) =>
                        Number(
                            change.oldNumber
                        ) !==
                        Number(
                            change.newNumber
                        ) ||
                        change.oldLabel !==
                            change.newLabel
                ).length
        };
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

    const {
        venue,
        layout
    } =
        await loadLayout();

    console.log(
        `Venue: ${venue.name}`
    );

    console.log(
        `Layout: ${layout.name}`
    );

    const events =
        await loadEvents(
            layout._id
        );

    console.log(
        `Events using this layout: ${events.length}`
    );

    if (
        events.length ===
        0
    ) {
        console.log(
            "No events found. Nothing to migrate."
        );

        await mongoose.disconnect();

        return;
    }

    const eventIds =
        events.map(
            (
                event
            ) =>
                event._id
        );

    await validateProtectedSeats(
        eventIds
    );

    let totalModified =
        0;

    let totalSeats =
        0;

    for (
        const event of
            events
    ) {
        console.log("");
        console.log(
            `Processing event: ${event.title}`
        );

        const result =
            await migrateEventSeats(
                event,
                layout
            );

        console.log(
            `LEFT_WING seats: ${result.total}`
        );

        console.log(
            `Modified: ${result.modified}`
        );

        totalSeats +=
            result.total;

        totalModified +=
            result.modified;
    }

    console.log("");
    console.log(
        "Seat repair completed successfully."
    );

    console.log(
        `Total LEFT_WING seats: ${totalSeats}`
    );

    console.log(
        `Total modified: ${totalModified}`
    );

    console.log(
        "Seat positions were preserved."
    );

    console.log(
        "Only number and label were changed."
    );

    await mongoose.disconnect();
};

run().catch(
    async (
        error
    ) => {
        console.error("");
        console.error(
            "Seat repair failed:"
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