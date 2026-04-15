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
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("24h"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-1.5-pro"),
  REDIS_ENABLED: z.preprocess(parseBooleanEnv, z.boolean()).default(false),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess(parseBooleanEnv, z.boolean()).default(false),
  SMTP_TLS_REJECT_UNAUTHORIZED: z.preprocess(parseBooleanEnv, z.boolean()).default(true),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(8),
  SMTP_FROM: z.string().email().default("no-reply@umurava.ai"),
  OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
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
