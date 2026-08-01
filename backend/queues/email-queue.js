import { Queue } from "bullmq";
import redisConnection from "../libs/redis.js";

export const emailQueue = new Queue("email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const queueEmail = (to, subject, html) =>
  emailQueue.add("send-email", { to, subject, html });
