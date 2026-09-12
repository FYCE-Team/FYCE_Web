import mongoose from "mongoose";
import Event from "../models/Event.js";
import VenueLayout from "../models/VenueLayout.js";
import EventSeatConfig from "../models/EventSeatConfig.js";
import Seat from "../models/Seat.js";
import { generateSeatsForEvent } from "../utils/seat.generator.js";

const normalizeCode = (value) => {
    return String(value || "")
        .trim()
        .toUpperCase();
};

const normalizeSection = (value) => {
    return normalizeCode(value);
};

const normalizeRow = (value) => {
    return String(value || "")
        .trim()
        .toUpperCase();
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

const getEvent = async (
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

    if (!event.venueId) {
        throw new Error(
            "EVENT_VENUE_REQUIRED"
        );
    }

    if (!event.venueLayoutId) {
        throw new Error(
            "EVENT_VENUE_LAYOUT_REQUIRED"
        );
    }

    return event;
};

const getEventCategories = (
    event
) => {
    if (
        !Array.isArray(
            event.ticketCategories
        ) ||
        event.ticketCategories.length === 0
    ) {
        throw new Error(
            "EVENT_TICKET_CATEGORY_REQUIRED"
        );
    }

    return event.ticketCategories.filter(
        (category) =>
            category.isActive !== false
    );
};

const buildCategoryMap = (
    event
) => {
    const categories =
        getEventCategories(event);

    const categoryMap =
        new Map();

    for (
        const category of categories
    ) {
        const code =
            normalizeCode(
                category.code
            );

        if (!code) {
            throw new Error(
                "EVENT_TICKET_CATEGORY_CODE_INVALID"
            );
        }

        categoryMap.set(
            code,
            category._id
        );
    }

    return categoryMap;
};

const loadLayout = async (
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
        String(layout.venueId) !==
        String(event.venueId)
    ) {
        throw new Error(
            "VENUE_LAYOUT_VENUE_MISMATCH"
        );
    }

    return layout;
};

const buildLayoutSeatMap = (
    layout
) => {
    const seatMap =
        new Map();

    if (
        !Array.isArray(
            layout.sections
        )
    ) {
        throw new Error(
            "VENUE_LAYOUT_SECTIONS_INVALID"
        );
    }

    for (
        const section of layout.sections
    ) {
        const sectionCode =
            normalizeSection(
                section.code
            );

        if (
            !sectionCode
        ) {
            throw new Error(
                "VENUE_LAYOUT_SECTION_INVALID"
            );
        }

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
            const row of section.rows
        ) {
            const rowCode =
                normalizeRow(
                    row.row
                );

            if (
                !rowCode
            ) {
                throw new Error(
                    `VENUE_LAYOUT_ROW_INVALID:${sectionCode}`
                );
            }

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
                const seat of row.seats
            ) {
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

                const key =
                    `${sectionCode}:${rowCode}:${number}`;

                if (
                    seatMap.has(key)
                ) {
                    throw new Error(
                        `VENUE_LAYOUT_DUPLICATE_SEAT:${key}`
                    );
                }

                seatMap.set(
                    key,
                    {
                        section:
                            sectionCode,

                        row:
                            rowCode,

                        number,

                        label:
                            String(
                                seat.label || ""
                            ).trim(),

                        isActive:
                            seat.isActive !==
                            false
                    }
                );
            }
        }
    }

    return seatMap;
};

const normalizeAssignments = (
    assignments
) => {
    if (
        !Array.isArray(
            assignments
        )
    ) {
        throw new Error(
            "SEAT_ASSIGNMENTS_INVALID"
        );
    }

    return assignments.map(
        (
            assignment,
            index
        ) => {
            if (!assignment) {
                throw new Error(
                    `SEAT_ASSIGNMENT_INVALID:${index}`
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

            const ticketCategoryId =
                assignment.ticketCategoryId;

            if (!section) {
                throw new Error(
                    `SEAT_ASSIGNMENT_SECTION_INVALID:${index}`
                );
            }

            if (!row) {
                throw new Error(
                    `SEAT_ASSIGNMENT_ROW_INVALID:${index}`
                );
            }

            if (
                row === "A" ||
                row === "J"
            ) {
                throw new Error(
                    `SEAT_ASSIGNMENT_INVALID_ROW:${row}`
                );
            }

            if (
                !Number.isInteger(
                    number
                ) ||
                number < 1
            ) {
                throw new Error(
                    `SEAT_ASSIGNMENT_NUMBER_INVALID:${index}`
                );
            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    ticketCategoryId
                )
            ) {
                throw new Error(
                    `SEAT_ASSIGNMENT_CATEGORY_INVALID:${index}`
                );
            }

            return {
                section,
                row,
                number,
                ticketCategoryId:
                    new mongoose.Types.ObjectId(
                        ticketCategoryId
                    )
            };
        }
    );
};

const validateAssignments = ({
    event,
    layout,
    assignments
}) => {
    const seatMap =
        buildLayoutSeatMap(
            layout
        );

    const categoryIds =
        new Set(
            getEventCategories(
                event
            ).map(
                (category) =>
                    String(
                        category._id
                    )
            )
        );

    const assignmentKeys =
        new Set();

    for (
        const assignment of assignments
    ) {
        const key =
            `${assignment.section}:${assignment.row}:${assignment.number}`;

        if (
            assignmentKeys.has(key)
        ) {
            throw new Error(
                `SEAT_ASSIGNMENT_DUPLICATE:${key}`
            );
        }

        assignmentKeys.add(
            key
        );

        const layoutSeat =
            seatMap.get(key);

        if (
            !layoutSeat
        ) {
            throw new Error(
                `SEAT_NOT_FOUND_IN_LAYOUT:${key}`
            );
        }

        if (
            layoutSeat.isActive === false
        ) {
            throw new Error(
                `SEAT_INACTIVE_IN_LAYOUT:${key}`
            );
        }

        if (
            !categoryIds.has(
                String(
                    assignment.ticketCategoryId
                )
            )
        ) {
            throw new Error(
                `TICKET_CATEGORY_NOT_IN_EVENT:${assignment.ticketCategoryId}`
            );
        }
    }

    return {
        seatMap,
        assignmentKeys
    };
};

const validateCompleteAssignment = ({
    layout,
    assignmentKeys
}) => {
    const seatMap =
        buildLayoutSeatMap(
            layout
        );

    const activeSeats =
        [...seatMap.values()]
            .filter(
                (seat) =>
                    seat.isActive
            );

    if (
        assignmentKeys.size !==
        activeSeats.length
    ) {
        throw new Error(
            `SEAT_ASSIGNMENT_INCOMPLETE:expected=${activeSeats.length},actual=${assignmentKeys.size}`
        );
    }

    for (
        const seat of activeSeats
    ) {
        const key =
            `${seat.section}:${seat.row}:${seat.number}`;

        if (
            !assignmentKeys.has(key)
        ) {
            throw new Error(
                `SEAT_ASSIGNMENT_MISSING:${key}`
            );
        }
    }
};

export const getSeatConfigByEvent =
    async (
        eventId
    ) => {
        const event =
            await getEvent(
                eventId
            );

        const config =
            await EventSeatConfig.findOne(
                {
                    eventId:
                        event._id
                }
            );

        if (!config) {
            return null;
        }

        return config;
    };

export const createSeatConfig =
    async (
        eventId,
        assignments
    ) => {
        const event =
            await getEvent(
                eventId
            );

        const layout =
            await loadLayout(
                event
            );

        const normalizedAssignments =
            normalizeAssignments(
                assignments
            );

        const {
            assignmentKeys
        } = validateAssignments({
            event,
            layout,
            assignments:
                normalizedAssignments
        });

        validateCompleteAssignment({
            layout,
            assignmentKeys
        });

        const existing =
            await EventSeatConfig.findOne(
                {
                    eventId:
                        event._id
                }
            );

        if (existing) {
            throw new Error(
                "EVENT_SEAT_CONFIG_ALREADY_EXISTS"
            );
        }

        const config =
            await EventSeatConfig.create({
                eventId:
                    event._id,

                venueId:
                    event.venueId,

                venueLayoutId:
                    event.venueLayoutId,

                assignments:
                    normalizedAssignments,

                isActive:
                    true
            });

        return config;
    };

export const updateSeatConfig =
    async (
        eventId,
        assignments
    ) => {
        const event =
            await getEvent(
                eventId
            );

        const layout =
            await loadLayout(
                event
            );

        const normalizedAssignments =
            normalizeAssignments(
                assignments
            );

        const {
            assignmentKeys
        } = validateAssignments({
            event,
            layout,
            assignments:
                normalizedAssignments
        });

        validateCompleteAssignment({
            layout,
            assignmentKeys
        });

        const config =
            await EventSeatConfig.findOne(
                {
                    eventId:
                        event._id
                }
            );

        if (!config) {
            throw new Error(
                "EVENT_SEAT_CONFIG_NOT_FOUND"
            );
        }

        config.venueId =
            event.venueId;

        config.venueLayoutId =
            event.venueLayoutId;

        config.assignments =
            normalizedAssignments;

        config.isActive =
            true;

        await config.save();

        return config;
    };

export const upsertSeatConfig =
    async (
        eventId,
        assignments
    ) => {
        const existing =
            await EventSeatConfig.findOne(
                {
                    eventId:
                        ensureObjectId(
                            eventId,
                            "EVENT_ID"
                        )
                }
            );

        if (existing) {
            return updateSeatConfig(
                eventId,
                assignments
            );
        }

        return createSeatConfig(
            eventId,
            assignments
        );
    };

export const deleteSeatConfig =
    async (
        eventId
    ) => {
        const normalizedEventId =
            ensureObjectId(
                eventId,
                "EVENT_ID"
            );

        const result =
            await EventSeatConfig.deleteOne(
                {
                    eventId:
                        normalizedEventId
                }
            );

        if (
            result.deletedCount ===
            0
        ) {
            throw new Error(
                "EVENT_SEAT_CONFIG_NOT_FOUND"
            );
        }

        return {
            deleted: true
        };
    };

export const getSeatConfigSummary =
    async (
        eventId
    ) => {
        const event =
            await getEvent(
                eventId
            );

        const layout =
            await loadLayout(
                event
            );

        const config =
            await EventSeatConfig.findOne(
                {
                    eventId:
                        event._id
                }
            ).lean();

        const categoryMap =
            buildCategoryMap(
                event
            );

        const categorySummary =
            {};

        for (
            const [
                code,
                id
            ] of categoryMap
        ) {
            categorySummary[
                code
            ] = {
                ticketCategoryId:
                    id,

                count: 0
            };
        }

        if (config) {
            for (
                const assignment of
                    config.assignments
            ) {
                const category =
                    event.ticketCategories.find(
                        (
                            item
                        ) =>
                            String(
                                item._id
                            ) ===
                            String(
                                assignment.ticketCategoryId
                            )
                    );

                if (!category) {
                    continue;
                }

                const code =
                    normalizeCode(
                        category.code
                    );

                if (
                    !categorySummary[
                        code
                    ]
                ) {
                    categorySummary[
                        code
                    ] = {
                        ticketCategoryId:
                            category._id,

                        count: 0
                    };
                }

                categorySummary[
                    code
                ].count++;
            }
        }

        const activeSeatCount =
            layout.sections.reduce(
                (
                    total,
                    section
                ) =>
                    total +
                    section.rows.reduce(
                        (
                            rowTotal,
                            row
                        ) =>
                            rowTotal +
                            row.seats.filter(
                                (
                                    seat
                                ) =>
                                    seat.isActive !==
                                    false
                            ).length,
                        0
                    ),
                0
            );

        const assignedCount =
            config?.assignments
                ?.length || 0;

        return {
            eventId:
                event._id,

            venueId:
                event.venueId,

            venueLayoutId:
                event.venueLayoutId,

            layoutCapacity:
                layout.capacity,

            activeSeatCount,

            assignedCount,

            isComplete:
                assignedCount ===
                activeSeatCount,

            categories:
                categorySummary
        };
    };

/* ============================================================
   CLONE SEAT SETUP FROM ANOTHER EVENT
   ============================================================ */

/**
 * Clone seat assignment from source event -> target event,
 * remapping ticketCategoryId by category CODE.
 *
 * IMPORTANT:
 * - Does NOT copy Seat documents.
 * - Does NOT copy sold / held / holdToken / heldByUserId.
 * - Target seats are generated fresh from VenueLayout.
 * - Target ticket prices remain the prices configured on TARGET event.
 */
export const cloneSeatSetupFromEvent =
    async ({
        sourceEventId,
        targetEventId
    }) => {
        const sourceId =
            ensureObjectId(
                sourceEventId,
                "SOURCE_EVENT_ID"
            );

        const targetId =
            ensureObjectId(
                targetEventId,
                "TARGET_EVENT_ID"
            );

        if (
            String(sourceId) ===
            String(targetId)
        ) {
            throw new Error(
                "SEAT_SETUP_SOURCE_EQUALS_TARGET"
            );
        }

        const [
            sourceEvent,
            targetEvent
        ] = await Promise.all([
            Event.findById(sourceId),
            Event.findById(targetId)
        ]);

        if (!sourceEvent) {
            throw new Error(
                "SOURCE_EVENT_NOT_FOUND"
            );
        }

        if (!targetEvent) {
            throw new Error(
                "TARGET_EVENT_NOT_FOUND"
            );
        }

        if (
            !sourceEvent.venueId ||
            !sourceEvent.venueLayoutId
        ) {
            throw new Error(
                "SOURCE_EVENT_LAYOUT_REQUIRED"
            );
        }

        if (
            !targetEvent.venueId ||
            !targetEvent.venueLayoutId
        ) {
            throw new Error(
                "TARGET_EVENT_LAYOUT_REQUIRED"
            );
        }

        if (
            String(sourceEvent.venueId) !==
            String(targetEvent.venueId)
        ) {
            throw new Error(
                "SEAT_SETUP_VENUE_MISMATCH"
            );
        }

        if (
            String(sourceEvent.venueLayoutId) !==
            String(targetEvent.venueLayoutId)
        ) {
            throw new Error(
                "SEAT_SETUP_LAYOUT_MISMATCH"
            );
        }

        const existingSeatCount =
            await Seat.countDocuments({
                eventId:
                    targetEvent._id
            });

        if (
            existingSeatCount > 0
        ) {
            throw new Error(
                `TARGET_EVENT_ALREADY_HAS_SEATS:${existingSeatCount}`
            );
        }

        const sourceConfig =
            await EventSeatConfig.findOne({
                eventId:
                    sourceEvent._id,
                isActive:
                    true
            }).lean();

        if (!sourceConfig) {
            throw new Error(
                "SOURCE_EVENT_SEAT_CONFIG_NOT_FOUND"
            );
        }

        if (
            String(sourceConfig.venueId) !==
            String(sourceEvent.venueId) ||
            String(sourceConfig.venueLayoutId) !==
            String(sourceEvent.venueLayoutId)
        ) {
            throw new Error(
                "SOURCE_EVENT_SEAT_CONFIG_MISMATCH"
            );
        }

        const sourceCategories =
            getEventCategories(
                sourceEvent
            );

        const targetCategories =
            getEventCategories(
                targetEvent
            );

        const sourceCodeByCategoryId =
            new Map();

        for (
            const category of
                sourceCategories
        ) {
            const code =
                normalizeCode(
                    category.code
                );

            if (!code) {
                throw new Error(
                    "SOURCE_TICKET_CATEGORY_CODE_INVALID"
                );
            }

            sourceCodeByCategoryId.set(
                String(category._id),
                code
            );
        }

        const targetCategoryIdByCode =
            new Map();

        for (
            const category of
                targetCategories
        ) {
            const code =
                normalizeCode(
                    category.code
                );

            if (!code) {
                throw new Error(
                    "TARGET_TICKET_CATEGORY_CODE_INVALID"
                );
            }

            targetCategoryIdByCode.set(
                code,
                category._id
            );
        }

        /*
         * Source configs created before ticket-category ID preservation
         * may contain stale ticketCategoryId values. Resolve safely in
         * three levels:
         *
         * 1. EventSeatConfig category ID -> current source category code.
         * 2. Existing source Seat at the same section/row/number.
         * 3. FYCE geometry fallback:
         *      CENTER + B-G => VIP
         *      everything else => STANDARD
         *
         * Level 3 is only used when target event actually has both
         * VIP and STANDARD category codes.
         */
        const sourceSeats =
            await Seat.find({
                eventId:
                    sourceEvent._id
            })
                .select(
                    "section row number ticketCategoryId"
                )
                .lean();

        const sourceSeatByKey =
            new Map();

        for (
            const seat of
                sourceSeats
        ) {
            const key =
                `${normalizeSection(
                    seat.section
                )}:${normalizeRow(
                    seat.row
                )}:${Number(
                    seat.number
                )}`;

            sourceSeatByKey.set(
                key,
                seat
            );
        }

        const FYCE_VIP_ROWS =
            new Set([
                "B",
                "C",
                "D",
                "E",
                "F",
                "G"
            ]);

        const canUseFyceGeometryFallback =
            targetCategoryIdByCode.has(
                "VIP"
            ) &&
            targetCategoryIdByCode.has(
                "STANDARD"
            );

        const resolutionStats = {
            direct:
                0,
            sourceSeat:
                0,
            geometryFallback:
                0
        };

        const clonedAssignments =
            sourceConfig.assignments.map(
                (
                    assignment,
                    index
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

                    let sourceCategoryCode =
                        sourceCodeByCategoryId.get(
                            String(
                                assignment.ticketCategoryId
                            )
                        );

                    if (
                        sourceCategoryCode
                    ) {
                        resolutionStats.direct++;
                    }

                    if (
                        !sourceCategoryCode
                    ) {
                        const seatKey =
                            `${section}:${row}:${number}`;

                        const sourceSeat =
                            sourceSeatByKey.get(
                                seatKey
                            );

                        if (
                            sourceSeat
                        ) {
                            sourceCategoryCode =
                                sourceCodeByCategoryId.get(
                                    String(
                                        sourceSeat.ticketCategoryId
                                    )
                                );

                            if (
                                sourceCategoryCode
                            ) {
                                resolutionStats
                                    .sourceSeat++;
                            }
                        }
                    }

                    if (
                        !sourceCategoryCode &&
                        canUseFyceGeometryFallback
                    ) {
                        sourceCategoryCode =
                            section ===
                                "CENTER" &&
                            FYCE_VIP_ROWS.has(
                                row
                            )
                                ? "VIP"
                                : "STANDARD";

                        resolutionStats
                            .geometryFallback++;
                    }

                    if (
                        !sourceCategoryCode
                    ) {
                        throw new Error(
                            `SOURCE_ASSIGNMENT_CATEGORY_NOT_FOUND:${section}:${row}:${number}`
                        );
                    }

                    const targetCategoryId =
                        targetCategoryIdByCode.get(
                            sourceCategoryCode
                        );

                    if (
                        !targetCategoryId
                    ) {
                        throw new Error(
                            `TARGET_TICKET_CATEGORY_NOT_FOUND:${sourceCategoryCode}`
                        );
                    }

                    return {
                        section,
                        row,
                        number,
                        ticketCategoryId:
                            targetCategoryId
                    };
                }
            );

        /*
         * Validate cloned assignment against TARGET layout and
         * TARGET ticket-category IDs before mutating database.
         */
        const targetLayout =
            await loadLayout(
                targetEvent
            );

        const normalizedAssignments =
            normalizeAssignments(
                clonedAssignments
            );

        const {
            assignmentKeys
        } = validateAssignments({
            event:
                targetEvent,
            layout:
                targetLayout,
            assignments:
                normalizedAssignments
        });

        validateCompleteAssignment({
            layout:
                targetLayout,
            assignmentKeys
        });

        /*
         * If a config exists but no Seat exists yet, replacing the
         * config is safe. Once seats exist, this function refuses to
         * touch the target event.
         */
        const existingConfig =
            await EventSeatConfig.findOne({
                eventId:
                    targetEvent._id
            });

        const previousConfig =
            existingConfig
                ? existingConfig.toObject()
                : null;

        let targetConfig =
            existingConfig;

        try {
            if (targetConfig) {
                targetConfig.venueId =
                    targetEvent.venueId;

                targetConfig.venueLayoutId =
                    targetEvent.venueLayoutId;

                targetConfig.assignments =
                    normalizedAssignments;

                targetConfig.isActive =
                    true;

                await targetConfig.save();
            } else {
                targetConfig =
                    await EventSeatConfig.create({
                        eventId:
                            targetEvent._id,

                        venueId:
                            targetEvent.venueId,

                        venueLayoutId:
                            targetEvent.venueLayoutId,

                        assignments:
                            normalizedAssignments,

                        isActive:
                            true
                    });
            }

            const seatGeneration =
                await generateSeatsForEvent(
                    targetEvent._id
                );

            return {
                sourceEventId:
                    sourceEvent._id,

                targetEventId:
                    targetEvent._id,

                venueId:
                    targetEvent.venueId,

                venueLayoutId:
                    targetEvent.venueLayoutId,

                eventSeatConfigId:
                    targetConfig._id,

                assignmentCount:
                    normalizedAssignments.length,

                categoryResolution:
                    resolutionStats,

                seatGeneration
            };
        } catch (error) {
            /*
             * Target had zero seats before this operation, therefore
             * any target seats that exist after a failed generation
             * belong to this operation and can be safely removed.
             */
            await Seat.deleteMany({
                eventId:
                    targetEvent._id
            });

            if (previousConfig) {
                await EventSeatConfig.replaceOne(
                    {
                        _id:
                            previousConfig._id
                    },
                    previousConfig
                );
            } else {
                await EventSeatConfig.deleteOne({
                    eventId:
                        targetEvent._id
                });
            }

            throw error;
        }
    };

