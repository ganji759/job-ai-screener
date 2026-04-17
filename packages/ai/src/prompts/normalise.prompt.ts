export function buildNormalisePrompt(rawText: string): string {
  return `Extract structured data from this resume text.
Return ONLY JSON, no markdown. Infer missing fields — never leave them null.

Resume:
${rawText}

Required output:
{
  "name": <string>,
  "skills": [<array of technical and soft skills>],
  "experience_years": <total years as integer>,
  "education": <highest degree + institution as one string>,
  "summary": <2-sentence professional summary, max 150 words>
}`;
}