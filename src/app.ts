import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { authenticate } from "./middleware/auth.middleware";
import { registerErrorHandler } from "./middleware/errorHandler.middleware";
import { registerRateLimit } from "./middleware/rateLimit.middleware";
import { applicantsRoutes } from "./routes/applicants.routes";
import { authRoutes } from "./routes/auth.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";
import { jobsRoutes } from "./routes/jobs.routes";
import { notificationsRoutes } from "./routes/notifications.routes";
import { screeningsRoutes } from "./routes/screenings.routes";
import { registerConnection } from "./services/realtime.service";

/** Browsers send different Origin values (localhost vs 127.0.0.1). Mismatch breaks credentialed PUT/POST after preflight. */
const corsAllowedOrigins = (): string | string[] => {
  const primary = env.FRONTEND_URL.replace(/\/+$/, "");
  if (env.NODE_ENV !== "development") return primary;
  return [...new Set([primary, "http://localhost:3000", "http://127.0.0.1:3000"])];
};

export const buildApp = async () => {
  const app = Fastify({ logger: true });
  await app.register(cors, {
    origin: corsAllowedOrigins(),
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  });
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  await app.register(multipart, { limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 } });
  await app.register(websocket);
  await registerRateLimit(app);

  app.decorate("authenticate", authenticate);

  app.get("/health", async () => ({ status: "ok", version: "1.1.0", uptime: process.uptime(), db: "connected" }));

  app.get("/ws/notifications", { websocket: true }, (connection, req) => {
    const token = String((req.query as Record<string, string> | undefined)?.token ?? "");
    if (!token) return void connection.socket.close();
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      registerConnection(decoded.userId, connection);
      connection.socket.send(JSON.stringify({ event: "connected", ok: true }));
    } catch {
      connection.socket.close();
    }
  });

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(jobsRoutes, { prefix: "/api/v1/jobs" });
  await app.register(applicantsRoutes, { prefix: "/api/v1/applicants" });
  await app.register(screeningsRoutes, { prefix: "/api/v1/screenings" });
  await app.register(notificationsRoutes, { prefix: "/api/v1/notifications" });
  await app.register(dashboardRoutes, { prefix: "/api/v1" });

  registerErrorHandler(app);
  return app;
};
