import type { FastifyPluginAsync } from "fastify";
import { ingestApplicantsForJob, listApplicantsForJob, uploadApplicantsForJob } from "../controllers/applicants.controller";
import { benchmarkJob, createJob, deleteJob, getJob, jobStats, listJobs, updateJob } from "../controllers/jobs.controller";
import { runScreeningForJob } from "../controllers/screening.controller";

export const jobsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.get("/", listJobs);
  app.post("/", createJob);

  /** Nested routes expected by the Next.js frontend (`/api/v1/jobs/:jobId/…`). Register before `/:id` catch-alls. */
  app.get("/:jobId/applicants", listApplicantsForJob);
  app.post("/:jobId/applicants", ingestApplicantsForJob);
  app.post("/:jobId/applicants/upload", { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, uploadApplicantsForJob);
  app.post("/:jobId/screenings", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, runScreeningForJob);

  app.get("/:id/stats", jobStats);
  app.get("/:id/benchmark", benchmarkJob);
  app.get("/:id", getJob);
  app.put("/:id", updateJob);
  app.delete("/:id", deleteJob);
};
