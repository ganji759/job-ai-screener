import type { FastifyPluginAsync } from "fastify";
import { compareCandidates, deleteScreening, exportScreening, exportScreeningExplanations, getScreening, runScreening, screeningExplanations, screeningHistoryByJob, screeningStatus } from "../controllers/screening.controller";

export const screeningsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.post("/run", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, runScreening);
  app.get("/:id", getScreening);
  app.get("/:id/explanations", screeningExplanations);
  app.get("/:id/explanations/export", exportScreeningExplanations);
  app.get("/:id/status", screeningStatus);
  app.get("/job/:jobId", screeningHistoryByJob);
  app.post("/:id/export", exportScreening);
  app.delete("/:id", deleteScreening);
  app.post("/:id/compare", compareCandidates);
};
