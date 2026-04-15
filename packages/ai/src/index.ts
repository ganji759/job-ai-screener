// @umurava/ai — Gemini AI screening orchestration

export { flashModel, proModel } from "./client";
export { buildScreeningPrompt } from "./prompts/screen.prompt";
export { buildNormalisePrompt } from "./prompts/normalise.prompt";
export { geminiNormalise } from "./normalise";
export { mergeAndRank } from "./merger";
export { runScreening } from "./screening";

// Types
export type {
  CandidateEval,
  BatchEvalOutput,
  ParsedProfile,
} from "./schemas";

export type { ScreeningResultDoc } from "./screening";