import "../libs/env.js";
import { Worker } from "bullmq";
import redisConnection from "../libs/redis.js";
import { sendEmail } from "../libs/send-email.js";
import logger from "../libs/logger.js";

const worker = new Worker(
  "email",
  async (job) => {
    const { to, subject, html } = job.data;
    const sent = await sendEmail(to, subject, html);

    if (!sent) {
      throw new Error(`Failed to send email to ${to}`);
    }
  },
  { connection: redisConnection, concurrency: 5 }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, to: job.data.to }, "[email-worker] job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, err: error }, "[email-worker] job failed");
});

logger.info("[email-worker] listening for email jobs");

const shutdown = async (signal) => {
  logger.info(`[email-worker] ${signal} received, closing`);
  await worker.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
