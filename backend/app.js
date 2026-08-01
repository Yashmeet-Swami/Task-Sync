import env from "./libs/env.js"

import cors from "cors"
import express from "express"
import mongoose from "mongoose"
import pinoHttp from "pino-http"
import cookieParser from "cookie-parser";

import routes from "./routes/index.js"
import errorMiddleware from "./middleware/error-middleware.js";
import logger from "./libs/logger.js";
import { register, metricsMiddleware } from "./libs/metrics.js";

const app = express();

const allowedOrigins = [
    env.FRONTEND_URL,
    "http://localhost:5173",
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST","DELETE","PUT"],
    allowedHeaders:['Content-Type',"Authorization"],
    credentials: true,
    })
);

app.use(pinoHttp({ logger }));
app.use(metricsMiddleware);
app.use(express.json());
app.use(cookieParser());

app.get("/", async (req, res) => {
    res.status(200).json({
        message: "Welcome to TaskSync API",
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/ready", (req, res) => {
    const isDbReady = mongoose.connection.readyState === 1;
    res.status(isDbReady ? 200 : 503).json({
        status: isDbReady ? "ready" : "not_ready",
        db: mongoose.STATES[mongoose.connection.readyState],
    });
});

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

//http:localhost:500/api-v1/
app.use("/api-v1",routes);

app.use(errorMiddleware);

//not found middleware
app.use((req, res) => {
    res.status(404).json({
        message: "Not found"
    })
});

export default app;
