import type { FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import { redisClient } from "../config/redis";

export const registerRateLimit = async (app: FastifyInstance): Promise<void> => {
  await app.register(fastifyRateLimit, {
    global: false,
    max: 100,
    timeWindow: "1 minute",
    redis: redisClient,
  });
};
