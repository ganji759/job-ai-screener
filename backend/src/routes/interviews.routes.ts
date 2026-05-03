import type { FastifyPluginAsync } from "fastify";
import {
  createInterviewHandler,
  deleteInterviewHandler,
  getInterviewHandler,
  listInterviewsHandler,
  updateInterviewHandler,
} from "../controllers/interview.controller";

export const interviewsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.get("/", listInterviewsHandler);
  app.post("/", createInterviewHandler);
  app.get("/:id", getInterviewHandler);
  app.patch("/:id", updateInterviewHandler);
  app.delete("/:id", deleteInterviewHandler);
};
