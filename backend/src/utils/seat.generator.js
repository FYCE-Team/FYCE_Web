import mongoose from "mongoose";
import Event from "../models/Event.js";
import Seat from "../models/Seat.js";
import VenueLayout from "../models/VenueLayout.js";
import EventSeatConfig from "../models/EventSeatConfig.js";

/*
 * ============================================================
 * FYCE SEAT GENERATOR
 * ============================================================
 *
 * Luồng:
 *
 * Event
 *   ├── venueId
 *   ├── venueLayoutId
 *   └── ticketCategories
 *
 * VenueLayout
 *   └── sections
 *       └── rows
 *           └── seats
 *
 * EventSeatConfig
 *   └── assignments
 *       ├── section
 *       ├── row
 *       ├── number
 *       └── ticketCategoryId
 *
 *                    ↓
 *
 *                 Seat
 *
 * Generator KHÔNG hard-code:
 * - sơ đồ
 * - số lượng ghế
 * - VIP / STANDARD
 * - giá vé
 *
 * Tất cả được lấy từ database.
 */

/* ============================================================
   CONFIGURATION
   ============================================================ */

const DEFAULT_SEAT_WIDTH = 34;
const DEFAULT_SEAT_HEIGHT = 28;

/* ============================================================
   HELPERS
   ============================================================ */

const normalizeCode = (value) => {
    return String(value || "")
        .trim()
        .toUpperCase();
};

const normalizeSection = (value) => {
    return normalizeCode(value);
};

const normalizeRow = (value) => {
    return normalizeCode(value);
};

const ensureObjectId = (
    value,
    fieldName
) => {
    if (
        !value ||
        !mongoose.Types.ObjectId.isValid(value)
    ) {
        throw new Error(
            `${fieldName}_INVALID`
        );
    }

    return new mongoose.Types.ObjectId(value);
};

/* ============================================================
   EVENT
   ============================================================ */

const loadEvent = async (
    eventId
) => {
    const normalizedEventId =
        ensureObjectId(
            eventId,
            "EVENT_ID"
        );

    const event =
        await Event.findById(
            normalizedEventId
        );

    if (!event) {
        throw new Error(
            "EVENT_NOT_FOUND"
        );
    }

    if (
        !event.venueId
    ) {
        throw new Error(
            "EVENT_VENUE_REQUIRED"
        );
    }

    if (
        !event.venueLayoutId
    ) {
        throw new Error(
            "EVENT_VENUE_LAYOUT_REQUIRED"
        );
    }

    if (
        !Array.isArray(
            event.ticketCategories
        ) ||
        event.ticketCategories.length ===
            0
    ) {
        throw new Error(
            "EVENT_TICKET_CATEGORY_REQUIRED"
        );
    }

    return event;
};

/* ============================================================
   VENUE LAYOUT
   ============================================================ */

const loadAndValidateLayout =
    async (
        event
    ) => {
        const layout =
            await VenueLayout.findById(
                event.venueLayoutId
            ).lean();

        if (!layout) {
            throw new Error(
                "VENUE_LAYOUT_NOT_FOUND"
            );
        }

        if (
            layout.isActive === false
        ) {
            throw new Error(
                "VENUE_LAYOUT_INACTIVE"
            );
        }

        if (
            !layout.venueId
        ) {
            throw new Error(
                "VENUE_LAYOUT_VENUE_REQUIRED"
            );
        }

        if (
            String(
                layout.venueId
            ) !==
            String(
                event.venueId
            )
        ) {
            throw new Error(
                "VENUE_LAYOUT_VENUE_MISMATCH"
            );
        }

        if (
            !Array.isArray(
                layout.sections
            )
        ) {
            throw new Error(
                "VENUE_LAYOUT_SECTIONS_INVALID"
            );
        }

        return layout;
    };

/* ============================================================
   EVENT SEAT CONFIG
   ============================================================ */

const loadAndValidateSeatConfig =
    async (
        event
    ) => {
        const config =
            await EventSeatConfig.findOne(
                {
                    eventId:
                        event._id,
                    isActive:
                        true
                }
            ).lean();

        if (!config) {
            throw new Error(
                "EVENT_SEAT_CONFIG_NOT_FOUND"
            );
        }

        if (
            !config.venueId
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_VENUE_REQUIRED"
            );
        }

        if (
            !config.venueLayoutId
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_LAYOUT_REQUIRED"
            );
        }

        if (
            String(
                config.venueId
            ) !==
            String(
                event.venueId
            )
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_VENUE_MISMATCH"
            );
        }

        if (
            String(
                config.venueLayoutId
            ) !==
            String(
                event.venueLayoutId
            )
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_LAYOUT_MISMATCH"
            );
        }

        if (
            !Array.isArray(
                config.assignments
            )
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_ASSIGNMENTS_INVALID"
            );
        }

        return config;
    };

/* ============================================================
   TICKET CATEGORIES
   ============================================================ */

const buildCategoryMap = (
    event
) => {
    const map =
        new Map();

    for (
        const category of
            event.ticketCategories
    ) {
        if (
            category.isActive === false
        ) {
            continue;
        }

        const code =
            normalizeCode(
                category.code
            );

        if (!code) {
            throw new Error(
                "EVENT_TICKET_CATEGORY_CODE_INVALID"
            );
        }

        map.set(
            String(
                category._id
            ),
            category
        );
    }

    return map;
};

/* ============================================================
   FLATTEN VENUE LAYOUT
   ============================================================ */

const flattenLayoutSeats = (
    layout
) => {
    const seats = [];

    for (
        const section of
            layout.sections
    ) {
        if (
            !section ||
            !section.code
        ) {
            throw new Error(
                "VENUE_LAYOUT_SECTION_INVALID"
            );
        }

        const sectionCode =
            normalizeSection(
                section.code
            );

        if (
            !Array.isArray(
                section.rows
            )
        ) {
            throw new Error(
                `VENUE_LAYOUT_ROWS_INVALID:${sectionCode}`
            );
        }

        for (
            const row of
                section.rows
        ) {
            if (
                !row ||
                !row.row
            ) {
                throw new Error(
                    `VENUE_LAYOUT_ROW_INVALID:${sectionCode}`
                );
            }

            const rowCode =
                normalizeRow(
                    row.row
                );

            if (
                rowCode === "A" ||
                rowCode === "J"
            ) {
                throw new Error(
                    `VENUE_LAYOUT_INVALID_ROW:${rowCode}`
                );
            }

            if (
                !Array.isArray(
                    row.seats
                )
            ) {
                throw new Error(
                    `VENUE_LAYOUT_SEATS_INVALID:${sectionCode}:${rowCode}`
                );
            }

            for (
                const seat of
                    row.seats
            ) {
                if (!seat) {
                    throw new Error(
                        `VENUE_LAYOUT_SEAT_INVALID:${sectionCode}:${rowCode}`
                    );
                }

                const number =
                    Number(
                        seat.number
                    );

                if (
                    !Number.isInteger(
                        number
                    ) ||
                    number < 1
                ) {
                    throw new Error(
                        `VENUE_LAYOUT_SEAT_NUMBER_INVALID:${sectionCode}:${rowCode}`
                    );
                }

                if (
                    !seat.position ||
                    !Number.isFinite(
                        Number(
                            seat.position.x
                        )
                    ) ||
                    !Number.isFinite(
                        Number(
                            seat.position.y
                        )
                    )
                ) {
                    throw new Error(
                        `VENUE_LAYOUT_SEAT_POSITION_INVALID:${sectionCode}:${rowCode}:${number}`
                    );
                }

                const label =
                    String(
                        seat.label ||
                            ""
                    ).trim();

                if (!label) {
                    throw new Error(
                        `VENUE_LAYOUT_SEAT_LABEL_INVALID:${sectionCode}:${rowCode}:${number}`
                    );
                }

                seats.push({
                    section:
                        sectionCode,

                    row:
                        rowCode,

                    number,

                    label,

                    position: {
                        x:
                            Number(
                                seat.position.x
                            ),

                        y:
                            Number(
                                seat.position.y
                            )
                    },

                    width:
                        Number.isFinite(
                            Number(
                                seat.width
                            )
                        )
                            ? Number(
                                  seat.width
                              )
                            : DEFAULT_SEAT_WIDTH,

                    height:
                        Number.isFinite(
                            Number(
                                seat.height
                            )
                        )
                            ? Number(
                                  seat.height
                              )
                            : DEFAULT_SEAT_HEIGHT,

                    rotation:
                        Number.isFinite(
                            Number(
                                seat.rotation
                            )
                        )
                            ? Number(
                                  seat.rotation
                              )
                            : 0,

                    isActive:
                        seat.isActive !==
                        false
                });
            }
        }
    }

    return seats;
};

/* ============================================================
   LAYOUT VALIDATION
   ============================================================ */

const validateLayoutSeats = (
    seats,
    layout
) => {
    if (
        seats.length === 0
    ) {
        throw new Error(
            "VENUE_LAYOUT_EMPTY"
        );
    }

    const uniqueKeys =
        new Set();

    for (
        const seat of seats
    ) {
        const key =
            `${seat.section}:${seat.row}:${seat.number}`;

        if (
            uniqueKeys.has(key)
        ) {
            throw new Error(
                `VENUE_LAYOUT_DUPLICATE_SEAT:${key}`
            );
        }

        uniqueKeys.add(
            key
        );
    }

    const activeSeats =
        seats.filter(
            (seat) =>
                seat.isActive
        );

    if (
        Number.isFinite(
            Number(
                layout.capacity
            )
        ) &&
        activeSeats.length !==
            Number(
                layout.capacity
            )
    ) {
        throw new Error(
            `VENUE_LAYOUT_CAPACITY_MISMATCH:expected=${layout.capacity},actual=${activeSeats.length}`
        );
    }

    return activeSeats;
};

/* ============================================================
   SEAT CONFIG MAP
   ============================================================ */

const buildSeatAssignmentMap = (
    config
) => {
    const map =
        new Map();

    for (
        const assignment of
            config.assignments
    ) {
        if (
            !assignment
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_ASSIGNMENT_INVALID"
            );
        }

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
            !section
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_SECTION_INVALID"
            );
        }

        if (
            !row
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_ROW_INVALID"
            );
        }

        if (
            !Number.isInteger(
                number
            ) ||
            number < 1
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_NUMBER_INVALID"
            );
        }

        if (
            !assignment.ticketCategoryId
        ) {
            throw new Error(
                `EVENT_SEAT_CONFIG_CATEGORY_REQUIRED:${section}:${row}:${number}`
            );
        }

        const key =
            `${section}:${row}:${number}`;

        if (
            map.has(key)
        ) {
            throw new Error(
                `EVENT_SEAT_CONFIG_DUPLICATE:${key}`
            );
        }

        map.set(
            key,
            {
                ticketCategoryId:
                    assignment.ticketCategoryId
            }
        );
    }

    return map;
};

/* ============================================================
   VALIDATE ASSIGNMENTS
   ============================================================ */

const validateAssignments = ({
    layoutSeats,
    assignmentMap,
    categoryMap
}) => {
    if (
        assignmentMap.size !==
            layoutSeats.length
    ) {
        throw new Error(
            `EVENT_SEAT_CONFIG_COUNT_MISMATCH:layout=${layoutSeats.length},assignments=${assignmentMap.size}`
        );
    }

    for (
        const seat of layoutSeats
    ) {
        const key =
            `${seat.section}:${seat.row}:${seat.number}`;

        const assignment =
            assignmentMap.get(
                key
            );

        if (
            !assignment
        ) {
            throw new Error(
                `EVENT_SEAT_CONFIG_MISSING:${key}`
            );
        }

        const categoryId =
            String(
                assignment.ticketCategoryId
            );

        if (
            !categoryMap.has(
                categoryId
            )
        ) {
            throw new Error(
                `EVENT_SEAT_CONFIG_CATEGORY_NOT_IN_EVENT:${key}`
            );
        }
    }

    for (
        const [
            key,
            assignment
        ] of assignmentMap
    ) {
        const exists =
            layoutSeats.some(
                (
                    seat
                ) =>
                    `${seat.section}:${seat.row}:${seat.number}` ===
                    key
            );

        if (!exists) {
            throw new Error(
                `EVENT_SEAT_CONFIG_SEAT_NOT_IN_LAYOUT:${key}`
            );
        }

        if (
            !categoryMap.has(
                String(
                    assignment.ticketCategoryId
                )
            )
        ) {
            throw new Error(
                `EVENT_SEAT_CONFIG_CATEGORY_NOT_IN_EVENT:${key}`
            );
        }
    }
};

/* ============================================================
   BUILD SEAT DOCUMENTS
   ============================================================ */

const buildSeatDocuments = ({
    event,
    layoutSeats,
    assignmentMap
}) => {
    return layoutSeats.map(
        (layoutSeat) => {
            const key =
                `${layoutSeat.section}:${layoutSeat.row}:${layoutSeat.number}`;

            const assignment =
                assignmentMap.get(
                    key
                );

            if (
                !assignment
            ) {
                throw new Error(
                    `EVENT_SEAT_CONFIG_MISSING:${key}`
                );
            }

            return {
                eventId:
                    event._id,

                ticketCategoryId:
                    assignment.ticketCategoryId,

                section:
                    layoutSeat.section.toLowerCase(),

                row:
                    layoutSeat.row,

                number:
                    layoutSeat.number,

                label:
                    layoutSeat.label,

                status:
                    "available",

                holdToken:
                    null,

                holdExpiresAt:
                    null,

                position: {
                    x:
                        layoutSeat.position.x,

                    y:
                        layoutSeat.position.y
                },

                width:
                    layoutSeat.width,

                height:
                    layoutSeat.height,

                rotation:
                    layoutSeat.rotation,

                isActive:
                    true
            };
        }
    );
};

/* ============================================================
   MAIN GENERATOR
   ============================================================ */

export const generateSeatsForEvent =
    async (
        eventId
    ) => {
        const event =
            await loadEvent(
                eventId
            );

        const layout =
            await loadAndValidateLayout(
                event
            );

        const seatConfig =
            await loadAndValidateSeatConfig(
                event
            );

        const existingSeatCount =
            await Seat.countDocuments({
                eventId:
                    event._id
            });

        if (
            existingSeatCount > 0
        ) {
            throw new Error(
                `EVENT_ALREADY_HAS_SEATS:${existingSeatCount}`
            );
        }

        const layoutSeats =
            flattenLayoutSeats(
                layout
            );

        const activeLayoutSeats =
            validateLayoutSeats(
                layoutSeats,
                layout
            );

        const categoryMap =
            buildCategoryMap(
                event
            );

        const assignmentMap =
            buildSeatAssignmentMap(
                seatConfig
            );

        validateAssignments({
            layoutSeats:
                activeLayoutSeats,

            assignmentMap,

            categoryMap
        });

        const seats =
            buildSeatDocuments({
                event,

                layoutSeats:
                    activeLayoutSeats,

                assignmentMap
            });

        if (
            seats.length !==
            activeLayoutSeats.length
        ) {
            throw new Error(
                `SEAT_GENERATION_COUNT_MISMATCH:expected=${activeLayoutSeats.length},actual=${seats.length}`
            );
        }

        /*
         * ========================================================
         * FINAL DUPLICATE CHECK
         * ========================================================
         */

        const keys =
            new Set();

        for (
            const seat of seats
        ) {
            const key =
                `${seat.section}:${seat.row}:${seat.number}`;

            if (
                keys.has(key)
            ) {
                throw new Error(
                    `SEAT_GENERATION_DUPLICATE:${key}`
                );
            }

            keys.add(key);
        }

        /*
         * ========================================================
         * SAVE
         * ========================================================
         */

        const createdSeats =
            await Seat.insertMany(
                seats,
                {
                    ordered: true
                }
            );

        const breakdown = {};
        const categoryBreakdown = {};

        for (
            const seat of
                createdSeats
        ) {
            if (
                !breakdown[
                    seat.section
                ]
            ) {
                breakdown[
                    seat.section
                ] = 0;
            }

            breakdown[
                seat.section
            ]++;

            const categoryId =
                String(
                    seat.ticketCategoryId
                );

            if (
                !categoryBreakdown[
                    categoryId
                ]
            ) {
                categoryBreakdown[
                    categoryId
                ] = 0;
            }

            categoryBreakdown[
                categoryId
            ]++;
        }

        return {
            eventId:
                event._id,

            venueId:
                event.venueId,

            venueLayoutId:
                event.venueLayoutId,

            eventSeatConfigId:
                seatConfig._id,

            count:
                createdSeats.length,

            breakdown,

            categoryBreakdown
        };
    };