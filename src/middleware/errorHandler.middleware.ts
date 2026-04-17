import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { JsonWebTokenError } from "jsonwebtoken";

export const registerErrorHandler = (fastify: FastifyInstance): void => {
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.error({ route: request.url, method: request.method, userId: request.user?.userId, errorCode: error.code, message: error.message, stack: error.stack }, "Unhandled error");

    if (error instanceof ZodError) {
      reply.code(400).send({ error: "Validation failed", details: error.issues });
      return;
    }
    if (error instanceof JsonWebTokenError) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    const mongoError = error as unknown as Error & { code?: number };
    if (mongoError.code === 11000) {
      reply.code(409).send({ error: "Conflict - duplicate data" });
      return;
    }
    reply.code(500).send({ error: "Internal server error", requestId: request.id });
  });
};
