import type { FastifyPluginAsync } from "fastify";
import { createLead } from "../controllers/leads.controller";

export const leadsRoutes: FastifyPluginAsync = async (app) => {
  // Public endpoint — landing-page lead capture. Rate-limited to deter spam.
  app.post(
    "/",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    createLead,
  );
};
