import mongoose from "mongoose";

import { env } from "./env";
import { logger } from "../utils/logger";

let reconnectTimeout: NodeJS.Timeout | null = null;

const scheduleReconnect = (): void => {
  if (reconnectTimeout) {
    return;
  }

  reconnectTimeout = setTimeout(async () => {
    reconnectTimeout = null;

    if (mongoose.connection.readyState === 0) {
      try {
        await connectDatabase();
      } catch (error) {
        logger.error({ err: error }, "MongoDB reconnect attempt failed");
        scheduleReconnect();
      }
    }
  }, 3_000);
};

mongoose.connection.on("connected", () => {
  logger.info("MongoDB connected");
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
  scheduleReconnect();
});

mongoose.connection.on("error", (error) => {
  logger.error({ err: error }, "MongoDB connection error");
});

export const connectDatabase = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      retryWrites: true,
    });
    logger.info("MongoDB connection established");
  } catch (error) {
    logger.fatal({ err: error }, "Failed to connect to MongoDB");
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    await mongoose.disconnect();
    logger.info("MongoDB disconnected gracefully");
  } catch (error) {
    logger.error({ err: error }, "Error while disconnecting MongoDB");
    throw error;
  }
};
