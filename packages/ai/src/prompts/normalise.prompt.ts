export function buildNormalisePrompt(rawText: string): string {
  return `Extract structured talent profile data from this resume text.
Return ONLY JSON, no markdown, no explanation. Infer missing fields — never leave required fields null.
Use "Unknown" for strings you cannot determine; use 0 for unknown numeric years; use "Present" for ongoing roles.

Resume:
${rawText}

Required output schema (follow exactly):
{
  "firstName": <string>,
  "lastName": <string>,
  "email": <string — infer a placeholder like firstname.lastname@unknown.com if not found>,
  "headline": <string — short professional title, e.g. "Senior Backend Engineer – Node.js & AI">,
  "bio": <string | null — 2-3 sentence professional summary>,
  "location": <string — City, Country>,
  "skills": [
    {
      "name": <string>,
      "level": <"Beginner" | "Intermediate" | "Advanced" | "Expert">,
      "yearsOfExperience": <integer ≥ 0>
    }
  ],
  "languages": [
    {
      "name": <string>,
      "proficiency": <"Basic" | "Conversational" | "Fluent" | "Native">
    }
  ],
  "experience": [
    {
      "company": <string>,
      "role": <string>,
      "startDate": <"YYYY-MM">,
      "endDate": <"YYYY-MM" | "Present">,
      "description": <string — key responsibilities and achievements>,
      "technologies": [<string>],
      "isCurrent": <boolean>
    }
  ],
  "education": [
    {
      "institution": <string>,
      "degree": <string — e.g. "Bachelor's", "Master's", "PhD">,
      "fieldOfStudy": <string>,
      "startYear": <integer>,
      "endYear": <integer>
    }
  ],
  "certifications": [
    {
      "name": <string>,
      "issuer": <string>,
      "issueDate": <"YYYY-MM">
    }
  ],
  "projects": [
    {
      "name": <string>,
      "description": <string>,
      "technologies": [<string>],
      "role": <string>,
      "link": <string | null>,
      "startDate": <"YYYY-MM">,
      "endDate": <"YYYY-MM">
    }
  ],
  "availability": {
    "status": <"Available" | "Open to Opportunities" | "Not Available">,
    "type": <"Full-time" | "Part-time" | "Contract">,
    "startDate": <"YYYY-MM-DD" | null>
  },
  "socialLinks": {
    "linkedin": <string | null>,
    "github": <string | null>,
    "portfolio": <string | null>
  }
}`;
}
