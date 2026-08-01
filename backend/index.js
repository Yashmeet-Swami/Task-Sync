import env from "./libs/env.js"
import mongoose from "mongoose"

import app from "./app.js"
import { ensureBucketExists } from "./libs/storage.js";
import logger from "./libs/logger.js";

//db connection
mongoose.connect(env.MONGODB_URI).then(()=>
    logger.info("DB connected successfully"))
.catch((err)=> logger.error({ err }, "Failed to connect to DB"));

ensureBucketExists().catch((err) => logger.error({ err }, "Failed to initialize storage bucket"));

const PORT = env.PORT

const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
})

const gracefulShutdown = (signal) => {
    logger.info(`${signal} received: closing server gracefully`);
    server.close(async () => {
        try {
            await mongoose.connection.close();
            logger.info("HTTP server and DB connection closed");
            process.exit(0);
        } catch (error) {
            logger.error({ err: error }, "Error during shutdown");
            process.exit(1);
        }
    });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
