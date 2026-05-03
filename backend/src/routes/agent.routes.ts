import type { FastifyPluginAsync } from "fastify";
import { agentChatHandler, extractTextHandler } from "../controllers/agent.controller";

export const agentRoutes: FastifyPluginAsync = async (app) => {
  app.post("/chat", { preHandler: [app.authenticate] }, agentChatHandler);
  app.post("/extract-text", { preHandler: [app.authenticate] }, extractTextHandler);
};
