import { buildApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { connectRedis, disconnectRedis } from "./config/redis";
import { env } from "./config/env";

const start = async (): Promise<void> => {
  await connectDatabase();
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
