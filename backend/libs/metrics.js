import client from "prom-client";
import { emailQueue } from "../queues/email-queue.js";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const cacheHits = new client.Counter({
  name: "cache_hits_total",
  help: "Number of Redis cache hits",
  registers: [register],
});

export const cacheMisses = new client.Counter({
  name: "cache_misses_total",
  help: "Number of Redis cache misses",
  registers: [register],
});

new client.Gauge({
  name: "email_queue_waiting_jobs",
  help: "Number of jobs waiting in the email queue",
  registers: [register],
  async collect() {
    const count = await emailQueue.getWaitingCount();
    this.set(count);
  },
});

// Keeps Prometheus label cardinality bounded: uses the matched route *pattern*
// (e.g. "/api-v1/tasks/:taskId") rather than the resolved path with real IDs.
export const metricsMiddleware = (req, res, next) => {
  const stopTimer = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : "unmatched";
    stopTimer({ method: req.method, route, status_code: res.statusCode });
  });

  next();
};
