import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const parseBooleanEnv = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  /**
   * Comma-separated resolvers for Node’s DNS (helps `mongodb+srv` when `querySrv ETIMEOUT` — ISP/router DNS often blocks or stalls SRV).
   * Example: `1.1.1.1,8.8.8.8`
   */
  MONGODB_DNS_SERVERS: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("24h"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  /** Google Generative AI REST path segment (`v1` recommended for current models). SDK default is `v1beta`. */
  GEMINI_API_VERSION: z.string().default("v1"),
  /** Default per-request timeout for Gemini (extract, CSV/PDF scoring, pool insights). */
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  /** Umurava platform: candidates per Gemini call (fewer calls = faster wall time; larger = bigger prompts). */
  GEMINI_PLATFORM_BATCH_SIZE: z.coerce.number().int().min(1).max(40).default(10),
  /** Umurava platform: per-batch HTTP timeout (keep total batches × timeout under GEMINI_PLATFORM_WALL_MS). */
  GEMINI_PLATFORM_TIMEOUT_MS: z.coerce.number().int().positive().default(26_000),
  /** Umurava platform: retries per batch (use 1 for strict low latency). */
  GEMINI_PLATFORM_RETRIES: z.coerce.number().int().min(1).max(5).default(1),
  /** Hard stop for the platform scoring loop (ms) — aims for &lt;60s before pool insights. */
  GEMINI_PLATFORM_WALL_MS: z.coerce.number().int().positive().default(58_000),
  /** Pool insights call after platform scoring (shorter helps full request finish sooner). */
  GEMINI_INSIGHTS_TIMEOUT_MS: z.coerce.number().int().positive().default(14_000),
  GEMINI_INSIGHTS_RETRIES: z.coerce.number().int().min(1).max(5).default(1),
  /**
   * Optional: base URL of the Python AI service (apps/ai). When set, Node forwards all
   * Gemini calls to `${AI_SERVICE_URL}/ai/generate`. When empty, Node uses the in-process
   * @google/generative-ai SDK. Recommended value for local dev: http://localhost:8000
   */
  AI_SERVICE_URL: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  /** Safety margin added to the Python HTTP request on top of the Gemini timeout. */
  AI_SERVICE_TIMEOUT_BUFFER_MS: z.coerce.number().int().positive().default(5_000),
  REDIS_ENABLED: z.preprocess(parseBooleanEnv, z.boolean()).default(false),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  /** Optional extra allowed origins (comma-separated). Use this to whitelist Vercel preview URLs or additional domains without code changes. */
  CORS_ORIGINS: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM: z.string().min(1).default("onboarding@resend.dev"),
  OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
  /** Google OAuth 2.0 — all three must be set to enable Google Calendar integration. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Full backend callback URL, e.g. http://localhost:3001/auth/google/callback */
  GOOGLE_REDIRECT_URI: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  /**
   * AES-256 key as 64 hex chars. Generate with:
   *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   * Required when GOOGLE_CLIENT_ID is set.
   */
  ENCRYPTION_KEY: z.string().length(64).optional(),
  /**
   * Separate OAuth client (Desktop type) used for the founder's Gmail send flow.
   * Falls back to GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET if unset, but the recommended setup is a
   * dedicated Desktop OAuth client (Web-type clients reject the localhost loopback redirect on newer projects).
   */
  GMAIL_CLIENT_ID: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  GMAIL_CLIENT_SECRET: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  /** Long-lived refresh token for the founder's Gmail account (scope: gmail.send). Obtain with `npm run gmail-token`. */
  FOUNDER_GMAIL_REFRESH_TOKEN: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  /** From: address used when sending lead-capture notifications. Must match the Gmail account whose refresh token is set above. */
  FOUNDER_NOTIFY_FROM: z.string().email().default("pacymugisho@gmail.com"),
  /** To: address that receives lead-capture notifications. */
  FOUNDER_NOTIFY_TO: z.string().email().default("pacymugisho@gmail.com"),
  /** Redirect URI used ONLY by the one-time `gmail-token` script. Must be added as an Authorized Redirect URI in Google Cloud Console. */
  GMAIL_OAUTH_REDIRECT_URI: z.string().url().default("http://localhost:53682/oauth2callback"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

export const env = parsedEnv.data;
export type Env = typeof env;
