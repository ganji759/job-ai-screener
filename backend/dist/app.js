"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = void 0;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./config/env");
const auth_middleware_1 = require("./middleware/auth.middleware");
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const applicants_routes_1 = require("./routes/applicants.routes");
const auth_routes_1 = require("./routes/auth.routes");
const dashboard_routes_1 = require("./routes/dashboard.routes");
const jobs_routes_1 = require("./routes/jobs.routes");
const notifications_routes_1 = require("./routes/notifications.routes");
const screenings_routes_1 = require("./routes/screenings.routes");
const realtime_service_1 = require("./services/realtime.service");
const buildApp = async () => {
    const app = (0, fastify_1.default)({ logger: true });
    await app.register(cors_1.default, { origin: env_1.env.FRONTEND_URL, credentials: true });
    await app.register(helmet_1.default);
    await app.register(multipart_1.default, { limits: { fileSize: env_1.env.MAX_FILE_SIZE_MB * 1024 * 1024 } });
    await app.register(websocket_1.default);
    await (0, rateLimit_middleware_1.registerRateLimit)(app);
    app.decorate("authenticate", auth_middleware_1.authenticate);
    app.get("/health", async () => ({ status: "ok", version: "1.1.0", uptime: process.uptime(), db: "connected" }));
    app.get("/ws/notifications", { websocket: true }, (connection, req) => {
        const token = String(req.query?.token ?? "");
        if (!token)
            return void connection.socket.close();
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
            (0, realtime_service_1.registerConnection)(decoded.userId, connection);
            connection.socket.send(JSON.stringify({ event: "connected", ok: true }));
        }
        catch {
            connection.socket.close();
        }
    });
    await app.register(auth_routes_1.authRoutes, { prefix: "/api/v1/auth" });
    await app.register(jobs_routes_1.jobsRoutes, { prefix: "/api/v1/jobs" });
    await app.register(applicants_routes_1.applicantsRoutes, { prefix: "/api/v1/applicants" });
    await app.register(screenings_routes_1.screeningsRoutes, { prefix: "/api/v1/screenings" });
    await app.register(notifications_routes_1.notificationsRoutes, { prefix: "/api/v1/notifications" });
    await app.register(dashboard_routes_1.dashboardRoutes, { prefix: "/api/v1" });
    (0, errorHandler_middleware_1.registerErrorHandler)(app);
    return app;
};
exports.buildApp = buildApp;
