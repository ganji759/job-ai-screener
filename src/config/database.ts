import dns from "node:dns";

import mongoose from "mongoose";

import { env } from "./env";
import { logger } from "../utils/logger";

// Set alternative DNS resolvers at module load time so SRV lookups use them
// from the very first connection attempt (helps `querySrv ETIMEOUT` on networks
// where the default resolver blocks or stalls MongoDB Atlas SRV records).
{
  const dnsServers = env.MONGODB_DNS_SERVERS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (dnsServers?.length) {
    dns.setServers(dnsServers);
    logger.info({ servers: dnsServers }, "DNS resolvers overridden for MongoDB SRV");
  }
}

/**
 * Atlas URIs sometimes include `&?appName=Cluster0`. That parses as the key `?appName`, which
 * the driver rejects ("option ?appname is not supported"). `appName` in the URI is optional.
 */
const sanitizeMongoUri = (uri: string): string => {
  const q = uri.indexOf("?");
  if (q === -1) return uri;
  const base = uri.slice(0, q);
  let qs = uri.slice(q + 1);
  qs = qs.replace(/&\?/g, "&").replace(/^\?+/, "");
  const params = new URLSearchParams(qs);
  for (const key of [...params.keys()]) {
    const lower = key.toLowerCase();
    if (lower === "appname" || key.startsWith("?")) {
      params.delete(key);
    }
  }
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
};

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

    await mongoose.connect(sanitizeMongoUri(env.MONGODB_URI), {
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
