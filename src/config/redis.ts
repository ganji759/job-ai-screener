import Redis from "ioredis";

import { env } from "./env";
import { logger } from "../utils/logger";

export const isRedisEnabled = env.REDIS_ENABLED;
export const redisClient = isRedisEnabled
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: () => null,
    })
  : null;

if (redisClient) {
  redisClient.on("connect", () => {
    logger.info("Redis connected");
  });

  redisClient.on("ready", () => {
    logger.info("Redis ready");
  });

  redisClient.on("error", (error) => {
    logger.error({ err: error }, "Redis connection error");
  });

  redisClient.on("close", () => {
    logger.warn("Redis connection closed");
  });
}

export const connectRedis = async (): Promise<void> => {
  if (!redisClient) {
    logger.info("Redis is disabled by REDIS_ENABLED=false");
    return;
  }
  try {
    if (redisClient.status === "ready" || redisClient.status === "connecting") {
      return;
    }
    await redisClient.connect();
    logger.info("Redis connection established");
  } catch (error) {
    logger.error({ err: error }, "Failed to connect Redis");
    logger.warn("Continuing startup without Redis. Queue/cache features may be degraded.");
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (!redisClient) {
    return;
  }
  try {
    if (redisClient.status === "end" || redisClient.status === "wait") {
      return;
    }
    await redisClient.quit();
    logger.info("Redis disconnected gracefully");
  } catch (error) {
    logger.error({ err: error }, "Error while disconnecting Redis");
  }
};

export const redisGet = async (key: string): Promise<string | null> => {
  if (!redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
};

export const redisSet = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
  if (!redisClient) return;
  try {
    if (ttlSeconds) {
      await redisClient.set(key, value, "EX", ttlSeconds);
      return;
    }
    await redisClient.set(key, value);
  } catch {
    // no-op in degraded mode
  }
};

export const redisDel = async (key: string): Promise<void> => {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch {
    // no-op in degraded mode
  }
};
