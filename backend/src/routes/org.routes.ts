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
import { requireRole } from "../utils/rbac";

export const orgRoutes = async (app: FastifyInstance): Promise<void> => {
  // public — invitee has no token yet
  app.post("/accept-invite", acceptInvite);

  // viewer+
  app.get("/",        { preHandler: [app.authenticate] }, getOrg);
  app.get("/members", { preHandler: [app.authenticate] }, listMembers);

  // admin+
  app.put("/",                      { preHandler: [app.authenticate, requireRole("admin")] }, updateOrg);
  app.post("/invite",               { preHandler: [app.authenticate, requireRole("admin")] }, inviteMember);
  app.patch("/members/:memberId",   { preHandler: [app.authenticate, requireRole("admin")] }, updateMember);
  app.delete("/members/:memberId",  { preHandler: [app.authenticate, requireRole("admin")] }, removeMember);
};
