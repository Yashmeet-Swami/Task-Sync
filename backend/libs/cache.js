import redisConnection from "./redis.js";
import { cacheHits, cacheMisses } from "./metrics.js";
import logger from "./logger.js";

// Redis is configured with maxRetriesPerRequest: null (required for BullMQ elsewhere),
// which means a command issued while disconnected queues forever rather than rejecting.
// A cache outage should never be able to hang or fail a request that doesn't actually
// need the cache to succeed - race every call against a short timeout and fail open.
const withTimeout = (promise, ms = 500) => {
  promise.catch(() => {}); // avoid an unhandled rejection if this loses the race
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Redis operation timed out")), ms)),
  ]);
};

export const getOrSetCache = async (key, ttlSeconds, fetchFn) => {
  try {
    const cached = await withTimeout(redisConnection.get(key));
    if (cached) {
      cacheHits.inc();
      return JSON.parse(cached);
    }
    cacheMisses.inc();
  } catch (error) {
    logger.warn({ err: error, key }, "Cache read failed, bypassing cache");
  }

  const fresh = await fetchFn();

  withTimeout(redisConnection.set(key, JSON.stringify(fresh), "EX", ttlSeconds)).catch((error) => {
    logger.warn({ err: error, key }, "Cache write failed");
  });

  return fresh;
};

export const deleteCache = async (key) => {
  try {
    await withTimeout(redisConnection.del(key));
  } catch (error) {
    logger.warn({ err: error, key }, "Cache invalidation failed");
  }
};

export const workspaceStatsCacheKey = (workspaceId) => `workspace-stats:${workspaceId}`;
