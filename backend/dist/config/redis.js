"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisDel = exports.redisSet = exports.redisGet = exports.disconnectRedis = exports.connectRedis = exports.redisClient = exports.isRedisEnabled = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
exports.isRedisEnabled = env_1.env.REDIS_ENABLED;
exports.redisClient = exports.isRedisEnabled
    ? new ioredis_1.default(env_1.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
        retryStrategy: () => null,
    })
    : null;
if (exports.redisClient) {
    exports.redisClient.on("connect", () => {
        logger_1.logger.info("Redis connected");
    });
    exports.redisClient.on("ready", () => {
        logger_1.logger.info("Redis ready");
    });
    exports.redisClient.on("error", (error) => {
        logger_1.logger.error({ err: error }, "Redis connection error");
    });
    exports.redisClient.on("close", () => {
        logger_1.logger.warn("Redis connection closed");
    });
}
const connectRedis = async () => {
    if (!exports.redisClient) {
        logger_1.logger.info("Redis is disabled by REDIS_ENABLED=false");
        return;
    }
    try {
        if (exports.redisClient.status === "ready" || exports.redisClient.status === "connecting") {
            return;
        }
        await exports.redisClient.connect();
        logger_1.logger.info("Redis connection established");
    }
    catch (error) {
        logger_1.logger.error({ err: error }, "Failed to connect Redis");
        logger_1.logger.warn("Continuing startup without Redis. Queue/cache features may be degraded.");
    }
};
exports.connectRedis = connectRedis;
const disconnectRedis = async () => {
    if (!exports.redisClient) {
        return;
    }
    try {
        if (exports.redisClient.status === "end" || exports.redisClient.status === "wait") {
            return;
        }
        await exports.redisClient.quit();
        logger_1.logger.info("Redis disconnected gracefully");
    }
    catch (error) {
        logger_1.logger.error({ err: error }, "Error while disconnecting Redis");
    }
};
exports.disconnectRedis = disconnectRedis;
const redisGet = async (key) => {
    if (!exports.redisClient)
        return null;
    try {
        return await exports.redisClient.get(key);
    }
    catch {
        return null;
    }
};
exports.redisGet = redisGet;
const redisSet = async (key, value, ttlSeconds) => {
    if (!exports.redisClient)
        return;
    try {
        if (ttlSeconds) {
            await exports.redisClient.set(key, value, "EX", ttlSeconds);
            return;
        }
        await exports.redisClient.set(key, value);
    }
    catch {
        // no-op in degraded mode
    }
};
exports.redisSet = redisSet;
const redisDel = async (key) => {
    if (!exports.redisClient)
        return;
    try {
        await exports.redisClient.del(key);
    }
    catch {
        // no-op in degraded mode
    }
};
exports.redisDel = redisDel;
