import { buildApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { connectRedis, disconnectRedis } from "./config/redis";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const connectWithRetry = async (maxAttempts = 10, baseDelayMs = 3_000): Promise<void> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await connectDatabase();
      return;
    } catch (err) {
      const delayMs = Math.min(baseDelayMs * attempt, 30_000);
      if (attempt === maxAttempts) {
        logger.fatal({ err }, `MongoDB unreachable after ${maxAttempts} attempts — giving up`);
        throw err;
      }
      logger.warn({ err, attempt, maxAttempts, delayMs }, "MongoDB connect failed, retrying…");
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const start = async (): Promise<void> => {
  await connectWithRetry();
  if (env.REDIS_ENABLED) {
    await connectRedis();
    await import("./workers/screening.worker");
  }
  const app = await buildApp();

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info({ port: env.PORT, env: env.NODE_ENV }, "Umurava AI HR backend started");

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "Shutting down gracefully");
    await app.close();
    await disconnectDatabase();
    if (env.REDIS_ENABLED) {
      await disconnectRedis();
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.on("SIGINT", () => { void shutdown("SIGINT"); });
};

void start();
