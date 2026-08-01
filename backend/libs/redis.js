import Redis from "ioredis";
import env from "./env.js";
import logger from "./logger.js";

// maxRetriesPerRequest must be null for BullMQ's blocking connections.
const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (error) => {
  logger.error({ err: error }, "Redis connection error");
});

export default redisConnection;
