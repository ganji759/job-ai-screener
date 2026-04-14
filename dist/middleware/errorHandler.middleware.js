"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerErrorHandler = void 0;
const zod_1 = require("zod");
const jsonwebtoken_1 = require("jsonwebtoken");
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
        const mongoError = error;
        if (mongoError.code === 11000) {
            reply.code(409).send({ error: "Conflict - duplicate data" });
            return;
        }
        reply.code(500).send({ error: "Internal server error", requestId: request.id });
    });
};
exports.registerErrorHandler = registerErrorHandler;
