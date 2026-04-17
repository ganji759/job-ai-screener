"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRateLimit = void 0;
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const redis_1 = require("../config/redis");
const registerRateLimit = async (app) => {
    await app.register(rate_limit_1.default, {
        global: false,
        max: 100,
        timeWindow: "1 minute",
        redis: redis_1.redisClient,
    });
};
exports.registerRateLimit = registerRateLimit;
