"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const authenticate = async (request, reply) => {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            reply.code(401).send({ error: "Missing bearer token" });
            return;
        }
        const token = authHeader.slice(7);
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        request.user = decoded;
    }
    catch (_error) {
        reply.code(403).send({ error: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
