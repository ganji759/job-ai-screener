import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { JsonWebTokenError } from "jsonwebtoken";

/** @fastify/multipart — avoid generic 500 for bad uploads */
const MULTIPART_CLIENT_CODES = new Set([
  "FST_INVALID_MULTIPART_CONTENT_TYPE",
  "FST_INVALID_JSON_FIELD_ERROR",
  "FST_PROTO_VIOLATION",
]);
const MULTIPART_LIMIT_CODES = new Set(["FST_REQ_FILE_TOO_LARGE", "FST_PARTS_LIMIT", "FST_FILES_LIMIT", "FST_FIELDS_LIMIT"]);

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
    const code = typeof error.code === "string" ? error.code : "";
    if (MULTIPART_CLIENT_CODES.has(code)) {
      reply.code(400).send({ error: error.message });
      return;
    }
    if (MULTIPART_LIMIT_CODES.has(code)) {
      reply.code(413).send({ error: error.message });
      return;
    }
    if (code === "FST_FILE_BUFFER_NOT_FOUND" || code === "FST_NO_FORM_DATA") {
      reply.code(400).send({ error: error.message });
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
