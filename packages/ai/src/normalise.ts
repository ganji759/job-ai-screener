import { flashModel, callWithRetry } from "./client";
import { buildNormalisePrompt } from "./prompts/normalise.prompt";
import { ParsedProfileSchema, ParsedProfile } from "./schemas";

export async function geminiNormalise(rawText: string): Promise<ParsedProfile> {
  // Gemini 2.0 Flash supports up to 1M tokens - can handle full resume text
  const prompt = buildNormalisePrompt(rawText.slice(0, 50000));
  const result = await callWithRetry(() => flashModel.generateContent(prompt));
  const raw = result.response.text();
  return ParsedProfileSchema.parse(JSON.parse(raw));
}