import type { FastifyPluginAsync } from "fastify";
import {
  candidateAiChat,
  poolAdvisoryChat,
  compareCandidates,
  deleteScreening,
  exportScreening,
  exportScreeningExplanations,
  getAcceptedCandidates,
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
import { listInterviewsHandler } from "../controllers/interview.controller";
import { requireRole } from "../utils/rbac";

export const screeningsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  // viewer+
  app.get("/", listScreenings);
  app.get("/job/:jobId", screeningHistoryByJob);
  app.get("/:id/explanations", screeningExplanations);
  app.get("/:id/explanations/export", exportScreeningExplanations);
  app.get("/:id/results", getScreeningResults);
  app.get("/:id/status", screeningStatus);
  app.get("/:id/accepted", getAcceptedCandidates);
  app.get("/:id/interviews", listInterviewsHandler);
  app.get("/:id", getScreening);

  // recruiter+
  app.post("/run",         { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 5,  timeWindow: "1 hour"   } } }, runScreening);
  app.post("/run-for-job", { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 10, timeWindow: "1 hour"   } } }, runScreeningForJobAllSources);
  app.post("/platform",    { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 10, timeWindow: "1 hour"   } } }, syncPlatformScreening);
  app.post("/external",    { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 10, timeWindow: "1 hour"   } } }, syncExternalScreening);
  app.put("/:id/recruiter-decisions",      { preHandler: [requireRole("recruiter")] }, saveRecruiterDecisions);
  app.post("/:id/send-acceptance-emails",  { preHandler: [requireRole("recruiter")] }, sendAcceptanceEmails);
  app.post("/:id/export",                  { preHandler: [requireRole("recruiter")] }, exportScreening);
  app.delete("/:id",                       { preHandler: [requireRole("recruiter")] }, deleteScreening);
  app.post("/:id/compare",                 { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, compareCandidates);
  app.post("/:id/ai-chat",                 { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, candidateAiChat);
  app.post("/:id/advisory-chat",           { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, poolAdvisoryChat);
};
