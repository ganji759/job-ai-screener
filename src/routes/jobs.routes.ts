import type { FastifyPluginAsync } from "fastify";
import { benchmarkJob, createJob, deleteJob, getJob, jobStats, listJobs, updateJob } from "../controllers/jobs.controller";

export const jobsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.get("/", listJobs);
  app.post("/", createJob);
  app.get("/:id", getJob);
  app.put("/:id", updateJob);
  app.delete("/:id", deleteJob);
  app.get("/:id/stats", jobStats);
  app.get("/:id/benchmark", benchmarkJob);
};
