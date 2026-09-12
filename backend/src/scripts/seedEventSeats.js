import "dotenv/config";
import mongoose from "mongoose";

import { generateSeatsForEvent } from "../utils/seat.generator.js";

const MONGO_URI = process.env.MONGO_URI;
const EVENT_ID = process.env.EVENT_ID;

if (!MONGO_URI) {
    throw new Error(
        "MONGO_URI is not configured"
    );
}

if (!EVENT_ID) {
    throw new Error(
        "EVENT_ID is required. Example: EVENT_ID=<event_id> node src/scripts/seedEventSeats.js"
    );
}

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

    console.log(
        `Generating seats for Event: ${EVENT_ID}`
    );

    const result =
        await generateSeatsForEvent(
            EVENT_ID
        );

    console.log("");
    console.log(
        "Seat generation completed."
    );

    console.log(
        `Event ID: ${result.eventId}`
    );

    console.log(
        `Venue ID: ${result.venueId}`
    );

    console.log(
        `VenueLayout ID: ${result.venueLayoutId}`
    );

    console.log(
        `EventSeatConfig ID: ${result.eventSeatConfigId}`
    );

    console.log(
        `Total seats: ${result.count}`
    );

    console.log(
        "Section breakdown:"
    );

    console.log(
        result.breakdown
    );

    console.log(
        "Category breakdown:"
    );

    console.log(
        result.categoryBreakdown
    );

    await mongoose.disconnect();
};

seed().catch(
    async (error) => {
        console.error(
            "Seat generation failed:"
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