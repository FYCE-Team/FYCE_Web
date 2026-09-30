import "dotenv/config";

import app from "./app.js";
import { startTicketEmailWorker } from "./services/ticketEmail.service.js";
import { startPaymentSyncWorker } from "./services/paymentSync.service.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();

        startTicketEmailWorker();
        startPaymentSyncWorker();
        app.listen(PORT, () => {
            console.log(
                `Server running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "Server startup failed:",
            error.message
        );

        process.exit(1);
    }
};

startServer();
