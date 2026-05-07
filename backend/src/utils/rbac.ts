import type { FastifyReply, FastifyRequest } from "fastify";

export type OrgRole = "owner" | "admin" | "recruiter" | "viewer";

const ROLE_RANK: Record<OrgRole, number> = {
  owner:     4,
  admin:     3,
  recruiter: 2,
  viewer:    1,
};

/**
 * Returns true if the user's orgRole meets minRole, otherwise sends 403 and returns false.
 * Usage: if (!assertRole(request, reply, "recruiter")) return;
 */
export const assertRole = (
  request: FastifyRequest,
  reply: FastifyReply,
  minRole: OrgRole,
): boolean => {
  const role = (request.user?.orgRole ?? "") as OrgRole;
  if ((ROLE_RANK[role] ?? 0) < ROLE_RANK[minRole]) {
    void reply.code(403).send({ error: "Insufficient permissions" });
    return false;
  }
  return true;
};

/**
 * Fastify preHandler factory for route-level RBAC.
 * Example: { preHandler: [app.authenticate, requireRole("recruiter")] }
 */
export const requireRole =
  (minRole: OrgRole) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    assertRole(request, reply, minRole);
  };
