import "dotenv/config";
import mongoose from "mongoose";
import Venue from "../models/Venue.js";
import VenueLayout from "../models/VenueLayout.js";
import {
    FYCE_CANVAS,
    FYCE_LAYOUT_NAME,
    FYCE_SECTIONS,
    FYCE_VENUE_NAME,
    validateFyceBlueprint
} from "../utils/seatLayoutBlueprint.js";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
}

const VENUE_ADDRESS = "Đà Nẵng";
const VENUE_DESCRIPTION =
    "Sơ đồ khán phòng hiện tại của Fantasy Youth Chamber Ensemble.";

const clone = (value) =>
    JSON.parse(JSON.stringify(value));

const seed = async () => {
    await mongoose.connect(MONGO_URI);

    const blueprintSeats =
        validateFyceBlueprint();

    console.log("Connected to MongoDB");
    console.log(
        `Database name: ${mongoose.connection.name}`
    );

    let venue = await Venue.findOne({
        name: FYCE_VENUE_NAME
    });

    if (!venue) {
        venue = await Venue.create({
            name: FYCE_VENUE_NAME,
            address: VENUE_ADDRESS,
            description: VENUE_DESCRIPTION,
            capacity: 274,
            isActive: true
        });

        console.log(
            `Created Venue: ${venue._id}`
        );
    } else {
        venue.address = VENUE_ADDRESS;
        venue.description =
            VENUE_DESCRIPTION;
        venue.capacity = 274;
        venue.isActive = true;

        await venue.save();

        console.log(
            `Using existing Venue: ${venue._id}`
        );
    }

    let layout =
        await VenueLayout.findOne({
            venueId: venue._id,
            name: FYCE_LAYOUT_NAME
        });

    const layoutPayload = {
        venueId: venue._id,
        name: FYCE_LAYOUT_NAME,
        description:
            "Layout 274 ghế khớp với sơ đồ gốc FYCE, không có hàng A/J.",
        canvas: {
            width: FYCE_CANVAS.width,
            height: FYCE_CANVAS.height
        },
        sections: clone(FYCE_SECTIONS),
        capacity: 274,
        isDefault: true,
        isActive: true
    };

    if (!layout) {
        layout =
            await VenueLayout.create(
                layoutPayload
            );

        console.log(
            `Created VenueLayout: ${layout._id}`
        );
    } else {
        layout.description =
            layoutPayload.description;
        layout.canvas =
            layoutPayload.canvas;
        layout.sections =
            layoutPayload.sections;
        layout.capacity = 274;
        layout.isDefault = true;
        layout.isActive = true;

        await layout.save();

        console.log(
            `Updated existing VenueLayout: ${layout._id}`
        );
    }

    await VenueLayout.updateMany(
        {
            venueId: venue._id,
            _id: {
                $ne: layout._id
            }
        },
        {
            $set: {
                isDefault: false
            }
        }
    );

    console.log("");
    console.log("Venue seed completed.");
    console.log(
        `Venue ID: ${venue._id}`
    );
    console.log(
        `Layout ID: ${layout._id}`
    );
    console.log(
        `Canvas: ${FYCE_CANVAS.width}x${FYCE_CANVAS.height}`
    );
    console.log(
        `Seats: ${blueprintSeats.length}`
    );

    await mongoose.disconnect();
};

seed().catch(async (error) => {
    console.error(
        "Seed VenueLayout failed:"
    );
    console.error(error);

    try {
        await mongoose.disconnect();
    } catch {}

    process.exit(1);
});
