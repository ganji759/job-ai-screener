import type { FastifyPluginAsync } from "fastify";
import { bulkDeleteApplicants, deleteApplicant, enhanceApplicant, externalIngestApplicants, ingestApplicants, listApplicants, uploadApplicants } from "../controllers/applicants.controller";

export const applicantsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.post("/ingest", ingestApplicants);
  app.post("/external-ingest", externalIngestApplicants);
  app.post("/upload", { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, uploadApplicants);
  app.get("/", listApplicants);
  app.delete("/:id", deleteApplicant);
  app.post("/bulk-delete", bulkDeleteApplicants);
  app.post("/:id/enhance", enhanceApplicant);
};
