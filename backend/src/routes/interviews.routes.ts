import type { FastifyPluginAsync } from "fastify";
import {
  createInterviewHandler,
  deleteInterviewHandler,
  getInterviewHandler,
  listInterviewsHandler,
  updateInterviewHandler,
} from "../controllers/interview.controller";
import { requireRole } from "../utils/rbac";

export const interviewsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  // viewer+
  app.get("/",    listInterviewsHandler);
  app.get("/:id", getInterviewHandler);

  // recruiter+
  app.post("/",    { preHandler: [requireRole("recruiter")] }, createInterviewHandler);
  app.patch("/:id", { preHandler: [requireRole("recruiter")] }, updateInterviewHandler);
  app.delete("/:id", { preHandler: [requireRole("recruiter")] }, deleteInterviewHandler);
};
