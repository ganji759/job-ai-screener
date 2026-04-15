"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const env_1 = require("./config/env");
const start = async () => {
    await (0, database_1.connectDatabase)();
    if (env_1.env.REDIS_ENABLED) {
        await (0, redis_1.connectRedis)();
        await Promise.resolve().then(() => __importStar(require("./workers/screening.worker")));
    }
    const app = await (0, app_1.buildApp)();
    await app.listen({ port: env_1.env.PORT, host: "0.0.0.0" });
    app.log.info({ port: env_1.env.PORT, env: env_1.env.NODE_ENV }, "Umurava AI HR backend started");
    const shutdown = async (signal) => {
        app.log.info({ signal }, "Shutting down gracefully");
        await app.close();
        await (0, database_1.disconnectDatabase)();
        if (env_1.env.REDIS_ENABLED) {
            await (0, redis_1.disconnectRedis)();
        }
        process.exit(0);
    };
    process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
    process.on("SIGINT", () => { void shutdown("SIGINT"); });
};
void start();
