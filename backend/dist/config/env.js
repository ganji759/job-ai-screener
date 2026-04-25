"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const parseBooleanEnv = (value) => {
    if (typeof value === "boolean")
        return value;
    if (typeof value !== "string")
        return false;
    return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
};
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(3001),
    MONGODB_URI: zod_1.z.string().min(1, "MONGODB_URI is required"),
    JWT_SECRET: zod_1.z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: zod_1.z.string().default("24h"),
    GEMINI_API_KEY: zod_1.z.string().min(1, "GEMINI_API_KEY is required"),
    GEMINI_MODEL: zod_1.z.string().default("gemini-2.5-flash"),
    /** Google Generative AI REST path segment (`v1` recommended for current models). SDK default is `v1beta`. */
    GEMINI_API_VERSION: zod_1.z.string().default("v1"),
    /** Default per-request timeout for Gemini (extract, CSV/PDF scoring, pool insights). */
    GEMINI_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(30_000),
    /** Umurava platform: candidates per Gemini call (fewer calls = faster wall time; larger = bigger prompts). */
    GEMINI_PLATFORM_BATCH_SIZE: zod_1.z.coerce.number().int().min(1).max(40).default(10),
    /** Umurava platform: per-batch HTTP timeout (keep total batches × timeout under GEMINI_PLATFORM_WALL_MS). */
    GEMINI_PLATFORM_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(26_000),
    /** Umurava platform: retries per batch (use 1 for strict low latency). */
    GEMINI_PLATFORM_RETRIES: zod_1.z.coerce.number().int().min(1).max(5).default(1),
    /** Hard stop for the platform scoring loop (ms) — aims for &lt;60s before pool insights. */
    GEMINI_PLATFORM_WALL_MS: zod_1.z.coerce.number().int().positive().default(58_000),
    /** Pool insights call after platform scoring (shorter helps full request finish sooner). */
    GEMINI_INSIGHTS_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(14_000),
    GEMINI_INSIGHTS_RETRIES: zod_1.z.coerce.number().int().min(1).max(5).default(1),
    REDIS_ENABLED: zod_1.z.preprocess(parseBooleanEnv, zod_1.z.boolean()).default(false),
    REDIS_URL: zod_1.z.string().url().default("redis://localhost:6379"),
    MAX_FILE_SIZE_MB: zod_1.z.coerce.number().positive().default(10),
    FRONTEND_URL: zod_1.z.string().url("FRONTEND_URL must be a valid URL"),
    SMTP_HOST: zod_1.z.string().default("smtp.gmail.com"),
    SMTP_PORT: zod_1.z.coerce.number().int().positive().default(587),
    SMTP_SECURE: zod_1.z.preprocess(parseBooleanEnv, zod_1.z.boolean()).default(false),
    SMTP_TLS_REJECT_UNAUTHORIZED: zod_1.z.preprocess(parseBooleanEnv, zod_1.z.boolean()).default(true),
    SMTP_USER: zod_1.z.string().email(),
    SMTP_PASS: zod_1.z.string().min(8),
    SMTP_FROM: zod_1.z.string().email().default("no-reply@umurava.ai"),
    OTP_EXPIRES_MINUTES: zod_1.z.coerce.number().int().positive().default(10),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    const formattedErrors = parsedEnv.error.issues
        .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
        .join("\n");
    throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}
exports.env = parsedEnv.data;
