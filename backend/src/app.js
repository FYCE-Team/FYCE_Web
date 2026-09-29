import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import eventRoutes from "./routes/event.routes.js";
import heroRoutes from "./routes/hero.routes.js";
import aboutRoutes from "./routes/about.routes.js";
import galleryRoutes from "./routes/gallery.routes.js";
import homepageRoutes from "./routes/homepage.routes.js";
import videoRoutes from "./routes/video.routes.js";
import imageRoutes from "./routes/image.routes.js";
import seatRoutes from "./routes/seat.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsPath = path.resolve(
    __dirname,
    "../uploads"
);

const app = express();

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin"
        },
        crossOriginOpenerPolicy: {
            policy: "same-origin-allow-popups"
        }
    })
);

app.use(
    cors({
        origin(origin, callback) {
            const allowed = new Set([process.env.CLIENT_URL, ...(process.env.CLIENT_URLS || "").split(",")].map(value => value?.trim()).filter(Boolean));
            if (process.env.NODE_ENV === "development") {
                allowed.add("http://localhost:5173");
                allowed.add("http://127.0.0.1:5173");
            }
            callback(null, !origin || allowed.has(origin));
        },
        credentials: true
    })
);

app.use(
    express.json({
        limit: "2mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "2mb"
    })
);

app.use(
    cookieParser()
);

app.get(
    "/api/health",
    (req, res) => {
        res.json({
            success: true,
            message: "API is running"
        });
    }
);

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/events",
    eventRoutes
);

app.use(
    "/api",
    seatRoutes
);

app.use(
    "/api/bookings",
    bookingRoutes
);

app.use(
    "/api/payments",
    paymentRoutes
);

app.use(
    "/api/tickets",
    ticketRoutes
);

app.use(
    "/api/videos",
    videoRoutes
);
app.use(
    "/api/images",
    imageRoutes
);
app.use(
    "/uploads",
    express.static(uploadsPath)
);

app.use(
    "/api/hero",
    heroRoutes
);

app.use(
    "/api/about",
    aboutRoutes
);

app.use(
    "/api/gallery",
    galleryRoutes
);

app.use(
    "/api/homepage",
    homepageRoutes
);

app.use("/api/admin", adminRoutes);

app.use(errorHandler);

export default app;