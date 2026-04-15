import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is not set. Please check your .env file.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 1.5 Flash - optimized for speed and cost efficiency
export const flashModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json", // force JSON mode
    temperature: 0.1,                     // low temp for consistent scoring
    maxOutputTokens: 8192,                // increased for larger candidate batches
  },
});

// Alternative model for complex evaluations requiring deeper reasoning
export const proModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.2,                     // higher temperature for more nuanced reasoning
    maxOutputTokens: 8192,
  },
});

// A simple helper to wait between retries
export const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function callWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (error.status === 503 && retries > 0) {
      await wait(2000); // Wait 2 seconds
      return callWithRetry(fn, retries - 1);
    }
    throw error;
  }
}