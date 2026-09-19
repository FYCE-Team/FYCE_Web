import fs from "fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

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

console.log(
    "DEBUG process.cwd():",
    process.cwd()
);

console.log(
    "DEBUG __dirname:",
    __dirname
);

console.log(
    "DEBUG uploadsPath:",
    uploadsPath
);

console.log(
    "DEBUG uploads exists:",
    fs.existsSync(uploadsPath)
);

console.log(
    "DEBUG videos exists:",
    fs.existsSync(
        path.join(
            uploadsPath,
            "videos"
        )
    )
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
        origin: process.env.CLIENT_URL,
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

app.use(errorHandler);

export default app;