import type { FastifyPluginAsync } from "fastify";
import { candidateFeedback, dashboardAnalytics } from "../controllers/dashboard.controller";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.get("/dashboard/analytics", dashboardAnalytics);
  app.post("/candidates/:id/feedback", candidateFeedback);
};
