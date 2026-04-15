"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
let reconnectTimeout = null;
const scheduleReconnect = () => {
    if (reconnectTimeout) {
        return;
    }
    reconnectTimeout = setTimeout(async () => {
        reconnectTimeout = null;
        if (mongoose_1.default.connection.readyState === 0) {
            try {
                await (0, exports.connectDatabase)();
            }
            catch (error) {
                logger_1.logger.error({ err: error }, "MongoDB reconnect attempt failed");
                scheduleReconnect();
            }
        }
    }, 3_000);
};
mongoose_1.default.connection.on("connected", () => {
    logger_1.logger.info("MongoDB connected");
});
mongoose_1.default.connection.on("disconnected", () => {
    logger_1.logger.warn("MongoDB disconnected");
    scheduleReconnect();
});
mongoose_1.default.connection.on("error", (error) => {
    logger_1.logger.error({ err: error }, "MongoDB connection error");
});
const connectDatabase = async () => {
    try {
        if (mongoose_1.default.connection.readyState === 1) {
            return;
        }
        await mongoose_1.default.connect(env_1.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10_000,
            retryWrites: true,
        });
        logger_1.logger.info("MongoDB connection established");
    }
    catch (error) {
        logger_1.logger.fatal({ err: error }, "Failed to connect to MongoDB");
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        await mongoose_1.default.disconnect();
        logger_1.logger.info("MongoDB disconnected gracefully");
    }
    catch (error) {
        logger_1.logger.error({ err: error }, "Error while disconnecting MongoDB");
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
