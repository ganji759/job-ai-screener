"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerErrorHandler = void 0;
const zod_1 = require("zod");
const jsonwebtoken_1 = require("jsonwebtoken");
/** @fastify/multipart — avoid generic 500 for bad uploads */
const MULTIPART_CLIENT_CODES = new Set([
    "FST_INVALID_MULTIPART_CONTENT_TYPE",
    "FST_INVALID_JSON_FIELD_ERROR",
    "FST_PROTO_VIOLATION",
]);
const MULTIPART_LIMIT_CODES = new Set(["FST_REQ_FILE_TOO_LARGE", "FST_PARTS_LIMIT", "FST_FILES_LIMIT", "FST_FIELDS_LIMIT"]);
const registerErrorHandler = (fastify) => {
    fastify.setErrorHandler((error, request, reply) => {
        fastify.log.error({ route: request.url, method: request.method, userId: request.user?.userId, errorCode: error.code, message: error.message, stack: error.stack }, "Unhandled error");
        if (error instanceof zod_1.ZodError) {
            reply.code(400).send({ error: "Validation failed", details: error.issues });
            return;
        }
        if (error instanceof jsonwebtoken_1.JsonWebTokenError) {
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
        const mongoError = error;
        if (mongoError.code === 11000) {
            reply.code(409).send({ error: "Conflict - duplicate data" });
            return;
        }
        reply.code(500).send({ error: "Internal server error", requestId: request.id });
    });
};
exports.registerErrorHandler = registerErrorHandler;
