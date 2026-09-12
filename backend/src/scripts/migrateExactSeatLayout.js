import "dotenv/config";
import mongoose from "mongoose";
import Venue from "../models/Venue.js";
import VenueLayout from "../models/VenueLayout.js";
import Event from "../models/Event.js";
import Seat from "../models/Seat.js";
import {
    FYCE_CANVAS,
    FYCE_LAYOUT_NAME,
    FYCE_SECTIONS,
    FYCE_VENUE_NAME,
    validateFyceBlueprint
} from "../utils/seatLayoutBlueprint.js";

const MONGO_URI = process.env.MONGO_URI;
const APPLY =
    String(process.env.APPLY || "")
        .trim()
        .toLowerCase() === "true";

if (!MONGO_URI) {
    throw new Error(
        "MONGO_URI is not configured"
    );
}

const normalizeSection = (value) =>
    String(value || "")
        .trim()
        .toUpperCase();

const normalizeRow = (value) =>
    String(value || "")
        .trim()
        .toUpperCase();

const clone = (value) =>
    JSON.parse(JSON.stringify(value));

const keyOf = ({
    section,
    row,
    number
}) =>
    `${normalizeSection(section)}:${normalizeRow(row)}:${Number(number)}`;

const flattenLayout = (layout) =>
    layout.sections.flatMap((section) =>
        section.rows.flatMap((row) =>
            row.seats.map((seat) => ({
                section:
                    normalizeSection(
                        section.code
                    ),
                row:
                    normalizeRow(row.row),
                number:
                    Number(seat.number),
                position: seat.position,
                width: seat.width,
                height: seat.height,
                rotation: seat.rotation
            }))
        )
    );

const main = async () => {
    await mongoose.connect(MONGO_URI);

    const blueprintSeats =
        validateFyceBlueprint();

    const blueprintMap = new Map(
        blueprintSeats.map((seat) => [
            keyOf(seat),
            seat
        ])
    );

    const venue = await Venue.findOne({
        name: FYCE_VENUE_NAME
    });

    if (!venue) {
        throw new Error(
            `VENUE_NOT_FOUND:${FYCE_VENUE_NAME}`
        );
    }

    const layout =
        await VenueLayout.findOne({
            venueId: venue._id,
            name: FYCE_LAYOUT_NAME
        });

    if (!layout) {
        throw new Error(
            `VENUE_LAYOUT_NOT_FOUND:${FYCE_LAYOUT_NAME}`
        );
    }

    const currentLayoutSeats =
        flattenLayout(layout);

    if (
        currentLayoutSeats.length !==
        274
    ) {
        throw new Error(
            `CURRENT_LAYOUT_COUNT_INVALID:expected=274 actual=${currentLayoutSeats.length}`
        );
    }

    for (
        const seat of
        currentLayoutSeats
    ) {
        const key = keyOf(seat);

        if (!blueprintMap.has(key)) {
            throw new Error(
                `CURRENT_LAYOUT_SEAT_NOT_IN_BLUEPRINT:${key}`
            );
        }
    }

    const events = await Event.find({
        venueLayoutId: layout._id
    })
        .select("_id title")
        .lean();

    const eventIds = events.map(
        (event) => event._id
    );

    const existingSeats =
        eventIds.length === 0
            ? []
            : await Seat.find({
                  eventId: {
                      $in: eventIds
                  }
              })
                  .select(
                      "_id eventId section row number status"
                  )
                  .lean();

    for (const seat of existingSeats) {
        const key = keyOf({
            section: seat.section,
            row: seat.row,
            number: seat.number
        });

        if (!blueprintMap.has(key)) {
            throw new Error(
                `GENERATED_SEAT_NOT_IN_BLUEPRINT:${seat._id}:${key}`
            );
        }
    }

    console.log("");
    console.log(
        "FYCE exact-layout migration"
    );
    console.log(
        `Mode: ${APPLY ? "APPLY" : "DRY RUN"}`
    );
    console.log(
        `Layout seats: ${currentLayoutSeats.length}`
    );
    console.log(
        `Events using layout: ${events.length}`
    );
    console.log(
        `Generated Seat documents found: ${existingSeats.length}`
    );

    if (!APPLY) {
        console.log("");
        console.log(
            "No database changes were made."
        );
        console.log(
            "Run again with APPLY=true to update only geometry."
        );

        await mongoose.disconnect();
        return;
    }

    /*
     * Update VenueLayout in place.
     * Section/row/number remain identical, so EventSeatConfig remains valid.
     */
    layout.canvas = {
        width: FYCE_CANVAS.width,
        height: FYCE_CANVAS.height
    };
    layout.sections =
        clone(FYCE_SECTIONS);
    layout.capacity = 274;

    await layout.save();

    /*
     * Update Seat documents IN PLACE.
     *
     * IMPORTANT:
     * These fields are NOT changed:
     * - _id
     * - eventId
     * - ticketCategoryId
     * - section / row / number / label
     * - status
     * - holdToken / holdExpiresAt
     *
     * So sold/held seats keep their identity and booking state.
     */
    let matchedCount = 0;
    let modifiedCount = 0;

    if (eventIds.length > 0) {
        const operations =
            blueprintSeats.map(
                (blueprintSeat) => ({
                    updateMany: {
                        filter: {
                            eventId: {
                                $in: eventIds
                            },
                            section:
                                blueprintSeat.section.toLowerCase(),
                            row:
                                blueprintSeat.row,
                            number:
                                blueprintSeat.number
                        },
                        update: {
                            $set: {
                                position: {
                                    x:
                                        blueprintSeat
                                            .position
                                            .x,
                                    y:
                                        blueprintSeat
                                            .position
                                            .y
                                },
                                width:
                                    blueprintSeat.width,
                                height:
                                    blueprintSeat.height,
                                rotation:
                                    blueprintSeat.rotation
                            }
                        }
                    }
                })
            );

        const result =
            await Seat.bulkWrite(
                operations,
                {
                    ordered: false
                }
            );

        matchedCount =
            result.matchedCount || 0;
        modifiedCount =
            result.modifiedCount || 0;
    }

    console.log("");
    console.log(
        "Migration completed."
    );
    console.log(
        `VenueLayout canvas: ${FYCE_CANVAS.width}x${FYCE_CANVAS.height}`
    );
    console.log(
        `Seat documents matched: ${matchedCount}`
    );
    console.log(
        `Seat documents modified: ${modifiedCount}`
    );
    console.log(
        "Booking/category/status data was preserved."
    );

    await mongoose.disconnect();
};

main().catch(async (error) => {
    console.error(
        "Exact-layout migration failed:"
    );
    console.error(error);

    try {
        await mongoose.disconnect();
    } catch {}

    process.exit(1);
});
