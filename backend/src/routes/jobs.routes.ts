import type { FastifyPluginAsync } from "fastify";
import { ingestApplicantsForJob, listApplicantsForJob, uploadApplicantsForJob } from "../controllers/applicants.controller";
import { benchmarkJob, createJob, deleteJob, getJob, jobStats, listJobs, updateJob } from "../controllers/jobs.controller";
import { runScreeningForJob } from "../controllers/screening.controller";
import { requireRole } from "../utils/rbac";

export const jobsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  // viewer+
  app.get("/", listJobs);
  app.get("/:jobId/applicants", listApplicantsForJob);
  app.get("/:id/stats", jobStats);
  app.get("/:id/benchmark", benchmarkJob);
  app.get("/:id", getJob);

  // recruiter+
  app.post("/",           { preHandler: [requireRole("recruiter")] }, createJob);
  app.put("/:id",         { preHandler: [requireRole("recruiter")] }, updateJob);
  app.delete("/:id",      { preHandler: [requireRole("recruiter")] }, deleteJob);
  app.post("/:jobId/applicants",        { preHandler: [requireRole("recruiter")] }, ingestApplicantsForJob);
  app.post("/:jobId/applicants/upload", { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, uploadApplicantsForJob);
  app.post("/:jobId/screenings",        { preHandler: [requireRole("recruiter")], config: { rateLimit: { max: 5,  timeWindow: "1 hour" } } }, runScreeningForJob);
};
