import type { FastifyPluginAsync } from "fastify";
import {
  bulkDeleteApplicants,
  deleteApplicant,
  enhanceApplicant,
  externalIngestApplicants,
  ingestApplicants,
  listApplicants,
  screenExternalApplicants,
  screenPlatformApplicants,
  uploadApplicants,
} from "../controllers/applicants.controller";
import { requireRole } from "../utils/rbac";

export const applicantsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  // viewer+
  app.get("/", listApplicants);

  // recruiter+
  app.post("/screen/platform",  { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, screenPlatformApplicants);
  app.post("/screen/external",  { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, screenExternalApplicants);
  app.post("/ingest",           { preHandler: [requireRole("recruiter")] }, ingestApplicants);
  app.post("/external-ingest",  { preHandler: [requireRole("recruiter")] }, externalIngestApplicants);
  app.post("/upload",           { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, uploadApplicants);
  app.delete("/:id",            { preHandler: [requireRole("recruiter")] }, deleteApplicant);
  app.post("/bulk-delete",      { preHandler: [requireRole("recruiter")] }, bulkDeleteApplicants);
  app.post("/:id/enhance",      { preHandler: [requireRole("recruiter")] }, enhanceApplicant);
};
