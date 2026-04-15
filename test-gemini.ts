import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Error: GEMINI_API_KEY not set. Copy .env.example to .env and add your API key.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const flashModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run() {
  try {
    console.log("Testing Gemini API connection...");
    const result = await flashModel.generateContent("Say 'OK' if you can hear me.");
    const text = result.response.text();
    console.log("Gemini response:", text);
    console.log("Success! Gemini API is working.");
  } catch (error) {
    console.error("Gemini API error:", error instanceof Error ? error.message : error);
    console.error("Check that your GEMINI_API_KEY is valid and not expired.");
    process.exit(1);
  }
}

run().catch(console.error);