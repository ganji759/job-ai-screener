import type { FastifyPluginAsync } from "fastify";
import {
  candidateAiChat,
  poolAdvisoryChat,
  compareCandidates,
  deleteScreening,
  exportScreening,
  exportScreeningExplanations,
  getScreening,
  getScreeningResults,
  listScreenings,
  saveRecruiterDecisions,
  sendAcceptanceEmails,
  runScreening,
  runScreeningForJobAllSources,
  screeningExplanations,
  screeningHistoryByJob,
  screeningStatus,
  syncExternalScreening,
  syncPlatformScreening,
} from "../controllers/screening.controller";

export const screeningsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.get("/", listScreenings);
  app.post("/run", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, runScreening);
  app.post("/run-for-job", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, runScreeningForJobAllSources);
  app.post("/platform", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, syncPlatformScreening);
  app.post("/external", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, syncExternalScreening);
  app.get("/job/:jobId", screeningHistoryByJob);
  app.get("/:id/explanations", screeningExplanations);
  app.get("/:id/explanations/export", exportScreeningExplanations);
  app.get("/:id/results", getScreeningResults);
  app.get("/:id/status", screeningStatus);
  app.put("/:id/recruiter-decisions", saveRecruiterDecisions);
  app.post("/:id/send-acceptance-emails", sendAcceptanceEmails);
  app.get("/:id", getScreening);
  app.post("/:id/export", exportScreening);
  app.delete("/:id", deleteScreening);
  app.post("/:id/compare", compareCandidates);
  app.post("/:id/ai-chat", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, candidateAiChat);
  app.post("/:id/advisory-chat", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, poolAdvisoryChat);
};
