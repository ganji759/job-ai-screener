import type { FastifyPluginAsync } from "fastify";
import { login, me, refresh, register, resetPassword, sendOtp, verifyAuthOtp } from "../controllers/auth.controller";
import {
  googleCallback,
  googleCalendarDisconnect,
  googleCalendarStatus,
  googleGetAuthUrl,
} from "../controllers/googleOAuth.controller";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", { config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } }, register);
  app.post("/login", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, login);
  app.post("/otp/send", sendOtp);
  app.post("/otp/verify", verifyAuthOtp);
  app.post("/password-reset", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, resetPassword);
  app.post("/refresh", refresh);
  app.get("/me", { preHandler: app.authenticate }, me);

  // Google Calendar OAuth
  app.get("/google/url",        { preHandler: app.authenticate }, googleGetAuthUrl);
  app.get("/google/callback",   googleCallback);   // no auth — identity comes from state=JWT
  app.get("/google/status",     { preHandler: app.authenticate }, googleCalendarStatus);
  app.delete("/google/disconnect", { preHandler: app.authenticate }, googleCalendarDisconnect);
};
