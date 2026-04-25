/**
 * Smoke test: make sure the running Node backend routes a Gemini call through
 * the Python AI service at AI_SERVICE_URL. Run with:
 *
 *   cd backend
 *   npx tsx scripts/test-ai-proxy.ts
 */
import "dotenv/config";
import { z } from "zod";
import { callGeminiWithRetry } from "../src/services/gemini.service";
import { env } from "../src/config/env";

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`AI_SERVICE_URL = ${env.AI_SERVICE_URL ?? "(unset, using in-process SDK)"}`);

  const Schema = z.object({ ok: z.boolean(), echo: z.string() });
  const data = await callGeminiWithRetry(
    'Reply with ONLY this exact JSON, no markdown: {"ok": true, "echo": "proxy works"}',
    Schema,
    1,
    { timeoutMs: 20_000 },
  );

  // eslint-disable-next-line no-console
  console.log("Response:", data);
  // eslint-disable-next-line no-console
  console.log(data.ok ? "PASS ✓" : "FAIL ✗");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("FAIL:", err);
  process.exit(1);
});
