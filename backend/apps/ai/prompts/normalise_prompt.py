def build_normalise_prompt(raw_text: str) -> str:
    return f"""You are a resume parser. Extract structured talent profile data from the resume text below.

CRITICAL RULES:
1. Output ONLY raw JSON. No markdown fences, no commentary, no preamble.
2. Extract EVERY work entry you can see in the Work Experience / Employment / Professional Experience section into `experience[]`. Never return an empty array if the resume shows any role - even internships, freelance, research assistantships or volunteer roles count.
3. Extract EVERY degree, diploma or academic program you can see into `education[]`. Never return an empty array if the resume shows a university, school, or training program.
4. For `skills[]`, produce a flat list of INDIVIDUAL canonical technology / tool names:
   - Drop section headers like "Languages:", "AI/ ML:", "Frameworks:", "Cloud & DevOps:", "Databases:", "Tools:".
   - Split comma-, semicolon- and slash-separated lists into separate entries (e.g. "Python, JavaScript, Go" -> three skills).
   - Strip surrounding parentheses and trailing punctuation. Keep compound names that belong together (e.g. "Next.js", "Node.js", "scikit-learn", "C++", "Physics-Informed ML").
   - Deduplicate and title/lowercase case consistently. Aim for 10-40 clean entries.
5. For each job in `experience[]`, include a concise `description` (1-3 sentences) summarising responsibilities and impact, and fill `technologies` with the stack used in that role.
6. Dates must follow "YYYY-MM" format. Use "Present" for ongoing roles and set `isCurrent: true`. If only a year is known, use "YYYY-01".
7. If a field is genuinely absent in the resume, use "Unknown" for strings, 0 for numbers, [] for arrays, and null where the schema allows it. Never invent education or jobs that are not in the text.

Resume:
{raw_text}

Required output schema (follow exactly; return a single JSON object):
{{
  "firstName": <string>,
  "lastName": <string>,
  "email": <string - infer a placeholder like firstname.lastname@unknown.com if not found>,
  "headline": <string - short professional title, e.g. "Junior AI Engineer - PyTorch & LLMs">,
  "bio": <string | null - 2-3 sentence professional summary, synthesized from the resume>,
  "location": <string - City, Country. If only one is known, return just that; use "Unknown" only if truly absent>,
  "skills": [
    {{
      "name": <string - a single canonical skill name, e.g. "PyTorch">,
      "level": <"Beginner" | "Intermediate" | "Advanced" | "Expert">,
      "yearsOfExperience": <integer >= 0>
    }}
  ],
  "languages": [
    {{"name": <string>, "proficiency": <"Basic" | "Conversational" | "Fluent" | "Native">}}
  ],
  "experience": [
    {{
      "company": <string>,
      "role": <string>,
      "startDate": <"YYYY-MM">,
      "endDate": <"YYYY-MM" | "Present">,
      "description": <string - 1-3 sentence summary of responsibilities / impact>,
      "technologies": [<string>],
      "isCurrent": <boolean>
    }}
  ],
  "education": [
    {{
      "institution": <string>,
      "degree": <string - e.g. "Bachelor's", "Master's", "PhD", "Diploma">,
      "fieldOfStudy": <string>,
      "startYear": <integer>,
      "endYear": <integer>
    }}
  ],
  "certifications": [
    {{"name": <string>, "issuer": <string>, "issueDate": <"YYYY-MM">}}
  ],
  "projects": [
    {{
      "name": <string>,
      "description": <string>,
      "technologies": [<string>],
      "role": <string>,
      "link": <string | null>,
      "startDate": <"YYYY-MM">,
      "endDate": <"YYYY-MM">
    }}
  ],
  "availability": {{
    "status": <"Available" | "Open to Opportunities" | "Not Available">,
    "type": <"Full-time" | "Part-time" | "Contract">,
    "startDate": <"YYYY-MM-DD" | null>
  }},
  "socialLinks": {{
    "linkedin": <string | null>,
    "github": <string | null>,
    "portfolio": <string | null>
  }}
}}"""
