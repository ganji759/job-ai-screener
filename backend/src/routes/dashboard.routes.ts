import type { FastifyPluginAsync } from "fastify";
import { candidateFeedback, dashboardAnalytics } from "../controllers/dashboard.controller";
import { requireRole } from "../utils/rbac";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  // viewer+
  app.get("/dashboard/analytics", dashboardAnalytics);

  // recruiter+
  app.post("/candidates/:id/feedback", { preHandler: [requireRole("recruiter")] }, candidateFeedback);
};
