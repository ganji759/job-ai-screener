import type { FastifyReply, FastifyRequest } from "fastify";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload & { userId: string; email: string; role: string; orgId: string; orgRole: string };
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      reply.code(401).send({ error: "Missing bearer token" });
      return;
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload & {
      userId: string; email: string; role: string; orgId: string; orgRole: string;
    };
    request.user = decoded;
  } catch (_error) {
    return void reply.code(403).send({ error: "Invalid or expired token" });
  }
};
