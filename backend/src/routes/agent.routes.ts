import type { FastifyPluginAsync } from "fastify";
import { agentChatHandler } from "../controllers/agent.controller";

export const agentRoutes: FastifyPluginAsync = async (app) => {
  app.post("/chat", { preHandler: [app.authenticate] }, agentChatHandler);
};
