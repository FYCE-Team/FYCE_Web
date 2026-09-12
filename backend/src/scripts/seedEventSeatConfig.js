import "dotenv/config";
import mongoose from "mongoose";

import Event from "../models/Event.js";
import Venue from "../models/Venue.js";
import VenueLayout from "../models/VenueLayout.js";
import EventSeatConfig from "../models/EventSeatConfig.js";

/*
 * ============================================================
 * SEED EVENT SEAT CONFIG
 * ============================================================
 *
 * Mục đích:
 *
 * 1. Lấy Event bằng EVENT_ID.
 * 2. Gắn Event với Venue hiện tại.
 * 3. Gắn Event với VenueLayout hiện tại.
 * 4. Đọc toàn bộ ghế từ VenueLayout.
 * 5. Tự phân hạng:
 *
 *    CENTER + B/C/D/E/F/G = VIP
 *    Tất cả ghế còn lại    = STANDARD
 *
 * 6. Tạo hoặc cập nhật EventSeatConfig.
 *
 * Giá vé KHÔNG nằm trong script này.
 * Giá được lấy từ Event.ticketCategories.
 *
 * Chạy:
 *
 * EVENT_ID=<event_id> node src/scripts/seedEventSeatConfig.js
 */

/* ============================================================
   CONFIGURATION
   ============================================================ */

const MONGO_URI =
    process.env.MONGO_URI;

const EVENT_ID =
    process.env.EVENT_ID;

const VENUE_NAME =
    "FYCE Concert Hall";

const LAYOUT_NAME =
    "FYCE Main Concert Layout";

const VIP_CODE =
    "VIP";

const STANDARD_CODE =
    "STANDARD";

const VIP_ROWS =
    new Set([
        "B",
        "C",
        "D",
        "E",
        "F",
        "G"
    ]);

if (!MONGO_URI) {
    throw new Error(
        "MONGO_URI is not configured"
    );
}

if (!EVENT_ID) {
    throw new Error(
        "EVENT_ID is required. Example: EVENT_ID=<event_id> node src/scripts/seedEventSeatConfig.js"
    );
}

/* ============================================================
   HELPERS
   ============================================================ */

const normalizeCode = (
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

const ensureObjectId = (
    value,
    fieldName
) => {
    if (
        !mongoose.Types.ObjectId.isValid(
            value
        )
    ) {
        throw new Error(
            `${fieldName}_INVALID`
        );
    }

    return new mongoose.Types.ObjectId(
        value
    );
};

/* ============================================================
   LOAD EVENT
   ============================================================ */

const loadEvent = async () => {
    const eventId =
        ensureObjectId(
            EVENT_ID,
            "EVENT_ID"
        );

    const event =
        await Event.findById(
            eventId
        );

    if (!event) {
        throw new Error(
            "EVENT_NOT_FOUND"
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
   LOAD VENUE
   ============================================================ */

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

    if (
        venue.isActive ===
        false
    ) {
        throw new Error(
            `VENUE_INACTIVE:${VENUE_NAME}`
        );
    }

    return venue;
};

/* ============================================================
   LOAD VENUE LAYOUT
   ============================================================ */

const loadLayout = async (
    venue
) => {
    const layout =
        await VenueLayout.findOne({
            venueId:
                venue._id,

            name:
                LAYOUT_NAME
        }).lean();

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

    if (
        String(
            layout.venueId
        ) !==
        String(
            venue._id
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
   RESOLVE TICKET CATEGORIES
   ============================================================ */

const resolveTicketCategories = (
    event
) => {
    let vipCategory =
        null;

    let standardCategory =
        null;

    for (
        const category of
            event.ticketCategories
    ) {
        if (
            category.isActive ===
            false
        ) {
            continue;
        }

        const code =
            normalizeCode(
                category.code
            );

        if (
            code ===
            VIP_CODE
        ) {
            vipCategory =
                category;
        }

        if (
            code ===
            STANDARD_CODE
        ) {
            standardCategory =
                category;
        }
    }

    if (!vipCategory) {
        throw new Error(
            `TICKET_CATEGORY_NOT_FOUND:${VIP_CODE}`
        );
    }

    if (!standardCategory) {
        throw new Error(
            `TICKET_CATEGORY_NOT_FOUND:${STANDARD_CODE}`
        );
    }

    return {
        vipCategory,
        standardCategory
    };
};

/* ============================================================
   FLATTEN LAYOUT SEATS
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
            normalizeCode(
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
                rowCode ===
                    "A" ||
                rowCode ===
                    "J"
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
   VALIDATE LAYOUT SEATS
   ============================================================ */

const validateLayoutSeats = (
    seats,
    layout
) => {
    const activeSeats =
        seats.filter(
            (
                seat
            ) =>
                seat.isActive
        );

    if (
        activeSeats.length ===
        0
    ) {
        throw new Error(
            "VENUE_LAYOUT_EMPTY"
        );
    }

    const keys =
        new Set();

    for (
        const seat of
            activeSeats
    ) {
        const key =
            `${seat.section}:${seat.row}:${seat.number}`;

        if (
            keys.has(
                key
            )
        ) {
            throw new Error(
                `VENUE_LAYOUT_DUPLICATE_SEAT:${key}`
            );
        }

        keys.add(
            key
        );
    }

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
   BUILD ASSIGNMENTS
   ============================================================ */

const buildAssignments = ({
    seats,
    vipCategory,
    standardCategory
}) => {
    return seats.map(
        (
            seat
        ) => {
            const isVip =
                seat.section ===
                    "CENTER" &&
                VIP_ROWS.has(
                    seat.row
                );

            return {
                section:
                    seat.section,

                row:
                    seat.row,

                number:
                    seat.number,

                ticketCategoryId:
                    isVip
                        ? vipCategory._id
                        : standardCategory._id
            };
        }
    );
};

/* ============================================================
   VALIDATE ASSIGNMENTS
   ============================================================ */

const validateAssignments = ({
    assignments,
    layoutSeats,
    vipCategory,
    standardCategory
}) => {
    const layoutKeys =
        new Set(
            layoutSeats.map(
                (
                    seat
                ) =>
                    `${seat.section}:${seat.row}:${seat.number}`
            )
        );

    const assignmentKeys =
        new Set();

    let vipCount = 0;

    let standardCount =
        0;

    for (
        const assignment of
            assignments
    ) {
        const key =
            `${assignment.section}:${assignment.row}:${assignment.number}`;

        if (
            assignmentKeys.has(
                key
            )
        ) {
            throw new Error(
                `ASSIGNMENT_DUPLICATE:${key}`
            );
        }

        assignmentKeys.add(
            key
        );

        if (
            !layoutKeys.has(
                key
            )
        ) {
            throw new Error(
                `ASSIGNMENT_NOT_IN_LAYOUT:${key}`
            );
        }

        if (
            String(
                assignment.ticketCategoryId
            ) ===
            String(
                vipCategory._id
            )
        ) {
            vipCount++;
        } else if (
            String(
                assignment.ticketCategoryId
            ) ===
            String(
                standardCategory._id
            )
        ) {
            standardCount++;
        } else {
            throw new Error(
                `ASSIGNMENT_INVALID_CATEGORY:${key}`
            );
        }
    }

    if (
        assignmentKeys.size !==
        layoutSeats.length
    ) {
        throw new Error(
            `ASSIGNMENT_COUNT_INVALID:expected=${layoutSeats.length},actual=${assignmentKeys.size}`
        );
    }

    for (
        const layoutSeat of
            layoutSeats
    ) {
        const key =
            `${layoutSeat.section}:${layoutSeat.row}:${layoutSeat.number}`;

        if (
            !assignmentKeys.has(
                key
            )
        ) {
            throw new Error(
                `ASSIGNMENT_MISSING:${key}`
            );
        }
    }

    return {
        vipCount,
        standardCount
    };
};

/* ============================================================
   UPDATE EVENT REFERENCE
   ============================================================ */

const attachLayoutToEvent =
    async (
        event,
        venue,
        layout
    ) => {
        await Event.updateOne(
            {
                _id:
                    event._id
            },
            {
                $set: {
                    venueId:
                        venue._id,

                    venueLayoutId:
                        layout._id
                }
            }
        );
    };

/* ============================================================
   UPSERT EVENT SEAT CONFIG
   ============================================================ */

const saveSeatConfig =
    async ({
        event,
        venue,
        layout,
        assignments
    }) => {
        const existing =
            await EventSeatConfig.findOne({
                eventId:
                    event._id
            });

        if (existing) {
            existing.venueId =
                venue._id;

            existing.venueLayoutId =
                layout._id;

            existing.assignments =
                assignments;

            existing.isActive =
                true;

            await existing.save();

            return {
                config:
                    existing,

                action:
                    "updated"
            };
        }

        const config =
            await EventSeatConfig.create({
                eventId:
                    event._id,

                venueId:
                    venue._id,

                venueLayoutId:
                    layout._id,

                assignments,

                isActive:
                    true
            });

        return {
            config,

            action:
                "created"
        };
    };

/* ============================================================
   MAIN
   ============================================================ */

const seed = async () => {
    await mongoose.connect(
        MONGO_URI
    );

    console.log(
        "Connected to MongoDB"
    );

    console.log(
        "Database name:",
        mongoose.connection.name
    );

    const event =
        await loadEvent();

    console.log(
        `Event: ${event.title}`
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
        vipCategory,
        standardCategory
    } =
        resolveTicketCategories(
            event
        );

    console.log(
        `VIP category: ${vipCategory.name} (${vipCategory._id})`
    );

    console.log(
        `STANDARD category: ${standardCategory.name} (${standardCategory._id})`
    );

    const allLayoutSeats =
        flattenLayoutSeats(
            layout
        );

    const activeLayoutSeats =
        validateLayoutSeats(
            allLayoutSeats,
            layout
        );

    console.log(
        `Active layout seats: ${activeLayoutSeats.length}`
    );

    const assignments =
        buildAssignments({
            seats:
                activeLayoutSeats,

            vipCategory,

            standardCategory
        });

    const {
        vipCount,
        standardCount
    } =
        validateAssignments({
            assignments,

            layoutSeats:
                activeLayoutSeats,

            vipCategory,

            standardCategory
        });

    if (
        vipCount +
            standardCount !==
        activeLayoutSeats.length
    ) {
        throw new Error(
            "ASSIGNMENT_TOTAL_INVALID"
        );
    }

    await attachLayoutToEvent(
        event,
        venue,
        layout
    );

    const {
        config,
        action
    } =
        await saveSeatConfig({
            event,

            venue,

            layout,

            assignments
        });

    console.log("");
    console.log(
        "EventSeatConfig seed completed."
    );

    console.log(
        `Action: ${action}`
    );

    console.log(
        `Event ID: ${event._id}`
    );

    console.log(
        `Venue ID: ${venue._id}`
    );

    console.log(
        `Layout ID: ${layout._id}`
    );

    console.log(
        `Config ID: ${config._id}`
    );

    console.log(
        `VIP seats: ${vipCount}`
    );

    console.log(
        `STANDARD seats: ${standardCount}`
    );

    console.log(
        `Total seats: ${assignments.length}`
    );

    await mongoose.disconnect();
};

seed().catch(
    async (
        error
    ) => {
        console.error(
            "Seed EventSeatConfig failed:"
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