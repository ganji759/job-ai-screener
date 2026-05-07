import type { FastifyInstance } from "fastify";
import {
  getOrg,
  updateOrg,
  inviteMember,
  acceptInvite,
  listMembers,
  updateMember,
  removeMember,
} from "../controllers/org.controller";

export const orgRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/",              { preHandler: [app.authenticate] }, getOrg);
  app.put("/",              { preHandler: [app.authenticate] }, updateOrg);
  app.get("/members",       { preHandler: [app.authenticate] }, listMembers);
  app.post("/invite",       { preHandler: [app.authenticate] }, inviteMember);
  app.post("/accept-invite", acceptInvite); // public — no token yet
  app.patch("/members/:memberId", { preHandler: [app.authenticate] }, updateMember);
  app.delete("/members/:memberId", { preHandler: [app.authenticate] }, removeMember);
};
