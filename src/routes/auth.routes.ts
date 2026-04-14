import type { FastifyPluginAsync } from "fastify";
import { login, me, refresh, register, sendOtp, verifyAuthOtp } from "../controllers/auth.controller";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", { config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } }, register);
  app.post("/login", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, login);
  app.post("/otp/send", sendOtp);
  app.post("/otp/verify", verifyAuthOtp);
  app.post("/refresh", refresh);
  app.get("/me", { preHandler: app.authenticate }, me);
};
