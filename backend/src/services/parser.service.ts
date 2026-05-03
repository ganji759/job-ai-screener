import { parse } from "csv-parse/sync";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import pdfParse from "pdf-parse";
import { env } from "../config/env";
import type { UmuravaProfile } from "../types";
import { AiServiceError, normalisePdf } from "./aiClient";
import { pythonProfileToUmurava } from "./pythonAdapter";
import { callGeminiWithRetry } from "./gemini.service";
import { safeParseTalentProfile, talentProfileToUmuravaProfile } from "./talentProfile.adapter";
import { buildResumeExtractionPrompt } from "../utils/promptBuilder";
import { ZodResumeGeminiExtraction } from "../utils/jsonValidator";

/** Curated dictionary of common tech / professional skills — matched against resume text when Gemini is unavailable. */
const SKILL_DICTIONARY: string[] = [
  "javascript", "typescript", "python", "java", "c#", "c++", "go", "golang", "rust",
  "kotlin", "swift", "ruby", "php", "scala", "dart", "r", "matlab", "perl", "bash",
  "react", "react.js", "next.js", "nextjs", "vue", "vue.js", "nuxt", "angular",
  "svelte", "redux", "rxjs", "tailwind", "tailwindcss", "bootstrap", "material ui",
  "html", "css", "sass", "scss", "less", "webpack", "vite", "rollup",
  "node.js", "nodejs", "express", "fastify", "nestjs", "koa", "django", "flask",
  "fastapi", "spring", "spring boot", "rails", "ruby on rails", "laravel", ".net",
  "asp.net", "symfony",
  "mongodb", "postgresql", "postgres", "mysql", "sqlite", "redis", "elasticsearch",
  "dynamodb", "firebase", "firestore", "oracle", "sql server", "mssql", "cassandra",
  "neo4j", "sql", "nosql",
  "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "terraform",
  "ansible", "jenkins", "github actions", "gitlab ci", "circleci", "travis ci",
  "prometheus", "grafana", "datadog", "sentry", "nginx", "apache",
  "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "scipy",
  "spark", "hadoop", "airflow", "dbt", "snowflake", "bigquery", "databricks",
  "tableau", "power bi", "looker",
  "react native", "flutter", "ionic", "android", "ios", "xcode",
  "git", "github", "gitlab", "bitbucket", "jira", "confluence", "figma", "sketch",
  "graphql", "rest api", "grpc", "websockets", "rabbitmq", "kafka", "mqtt",
  "microservices", "serverless", "linux", "unix", "ci/cd",
  "agile", "scrum", "kanban", "lean", "waterfall",
  "seo", "sem", "content marketing", "copywriting", "google analytics",
  "project management", "product management", "stakeholder management",
  "communication", "leadership", "teamwork", "problem solving", "critical thinking",
];

/** Job-title patterns used when Gemini doesn't return a `title`. Ordered by specificity. */
const TITLE_PATTERNS: RegExp[] = [
  /\b(senior|junior|lead|principal|staff|associate|mid[-\s]?level)\s+(software|frontend|front[-\s]?end|backend|back[-\s]?end|full[-\s]?stack|mobile|android|ios|devops|site reliability|sre|cloud|data|machine learning|ml|ai|product|project|qa|test|security|network|systems)\s+(engineer|developer|scientist|analyst|manager|architect|designer|consultant|specialist)\b/i,
  /\b(software|frontend|front[-\s]?end|backend|back[-\s]?end|full[-\s]?stack|mobile|android|ios|devops|cloud|data|machine learning|ml|ai|qa|test|security)\s+(engineer|developer|scientist|analyst|architect)\b/i,
  /\b(ui|ux)(?:\s*[\/&]\s*(ui|ux))?\s+designer\b/i,
  /\b(product|project|program|engineering)\s+manager\b/i,
  /\b(data|business|financial|marketing)\s+analyst\b/i,
  /\bweb\s+developer\b/i,
  /\bhr\s+(manager|specialist|recruiter)\b/i,
  /\bdigital\s+marketer\b/i,
];

/** Extract skills from raw resume text: "Skills" section + dictionary scan. */
export const extractSkillsFromText = (rawText: string): string[] => {
  const lower = rawText.toLowerCase();
  const found = new Set<string>();

  const sectionMatch = rawText.match(
    /(?:^|\n)\s*(?:technical\s+skills|skills(?:\s*&\s*tools)?|technologies|tech\s+stack|core\s+competencies|competencies|expertise)\s*[:\-]?\s*\n([\s\S]{0,1200}?)(?:\n\s*\n|\n\s*[A-Z][A-Z\s&]{2,}\s*\n|$)/i,
  );
  if (sectionMatch?.[1]) {
    sectionMatch[1]
      .split(/[,;•·|\n]|\s{2,}/)
      .map((s) => s.trim().replace(/^[-*●▪■]\s*/, "").toLowerCase())
      .filter((s) => s.length >= 2 && s.length <= 40 && !/^(and|or|with|in|of|the|a|an|etc)$/i.test(s) && /[a-z]/i.test(s))
      .forEach((s) => found.add(s));
  }

  for (const skill of SKILL_DICTIONARY) {
    const escaped = skill.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[^a-z0-9+#.])${escaped}(?:[^a-z0-9+#.]|$)`, "i");
    if (re.test(lower)) found.add(skill);
  }

  return Array.from(found).slice(0, 50);
};

/** Detect a plausible job title / headline from the resume text. */
export const extractTitleFromText = (rawText: string): string | undefined => {
  const topLines = rawText
    .split("\n")
    .slice(0, 20)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of topLines) {
    for (const pattern of TITLE_PATTERNS) {
      if (pattern.test(line)) {
        return line.length <= 120 ? line : line.slice(0, 120);
      }
    }
  }

  for (const pattern of TITLE_PATTERNS) {
    const m = rawText.match(pattern);
    if (m?.[0]) return m[0].trim();
  }

  return undefined;
};

/** Regex / line heuristics when Gemini is unavailable — best-effort parse of name, title, and skills. */
export const heuristicExtractResume = (rawText: string): Partial<UmuravaProfile> => {
  const text = rawText.replace(/\r\n/g, "\n");
  const compact = text.replace(/\s+/g, " ").trim();
  const emailMatch = compact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "unknown@example.com";
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^page\s+\d+/i.test(l));

  let firstName = "Unknown";
  let lastName = "Candidate";
  const candidateLine =
    lines.slice(0, 8).find(
      (l) => l.length >= 3 && l.length < 80 && !l.includes("@") && !/^\d/.test(l) && /^[A-Za-zÀ-ÿ'\-\s.]+$/.test(l),
    ) ?? lines.find((l) => l.length >= 3 && l.length < 100 && !l.includes("@") && !/^\d/.test(l));
  if (candidateLine) {
    const parts = candidateLine.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      firstName = parts[0];
      lastName = parts.slice(1).join(" ");
    } else if (parts.length === 1) {
      firstName = parts[0];
      lastName = "";
    }
  }

  const yearsMatch = compact.match(/(\d+)\s*\+?\s*(?:years?|yrs?|ans?)/i);
  const totalYearsExperience = yearsMatch ? Math.min(60, Number(yearsMatch[1])) : 0;
  const phoneMatch = compact.match(/(?:\+?\d[\d\s.-]{8,}\d)/);

  const detectedTitle = extractTitleFromText(text);
  const fallbackTitle =
    lines[1] && lines[1] !== candidateLine && !lines[1].includes("@") && !/^\+?\d/.test(lines[1])
      ? lines[1].slice(0, 120)
      : "Professional";
  const skills = extractSkillsFromText(text);

  return {
    id: randomUUID(),
    firstName,
    lastName,
    email,
    phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, " ").trim() : undefined,
    title: detectedTitle ?? fallbackTitle,
    summary: compact.slice(0, 2000),
    skills,
    languages: [],
    experience: [],
    education: [],
    totalYearsExperience,
    location: "Unknown",
    remotePreference: "flexible",
  };
}; 

const mergeGeminiResume = (
  rawText: string,
  gemini: Record<string, unknown>,
): Partial<UmuravaProfile> => {
  const base = heuristicExtractResume(rawText);
  const g = gemini as Record<string, unknown>;
  const fullName = typeof g.fullName === "string" ? g.fullName.trim() : "";
  let first = typeof g.firstName === "string" ? g.firstName.trim() : "";
  let last = typeof g.lastName === "string" ? g.lastName.trim() : "";
  if (!first && fullName) {
    const p = fullName.split(/\s+/).filter(Boolean);
    first = p[0] ?? first;
    last = p.slice(1).join(" ") || last;
  }
  const skillsRaw = g.skills;
  const fromGemini = Array.isArray(skillsRaw)
    ? skillsRaw.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
    : [];
  const baseSkills = base.skills ?? [];
  const skills = fromGemini.length ? fromGemini : baseSkills;

  const geminiTitle = typeof g.title === "string" ? g.title.trim() : "";
  const titleIsPlaceholder = !geminiTitle || /^(professional|n\/a|unknown)$/i.test(geminiTitle);
  const title = titleIsPlaceholder ? base.title ?? "Professional" : geminiTitle;

  return {
    ...base,
    firstName: (first || base.firstName) as string,
    lastName: (last || base.lastName) as string,
    email: typeof g.email === "string" && g.email.includes("@") ? g.email : base.email,
    phone: typeof g.phone === "string" ? g.phone : base.phone,
    title,
    summary: typeof g.summary === "string" ? g.summary : base.summary,
    skills,
    languages: Array.isArray(g.languages) ? (g.languages as UmuravaProfile["languages"]) : base.languages ?? [],
    experience: Array.isArray(g.experience) ? (g.experience as UmuravaProfile["experience"]) : base.experience ?? [],
    education: Array.isArray(g.education) ? (g.education as UmuravaProfile["education"]) : base.education ?? [],
    totalYearsExperience:
      typeof g.totalYearsExperience === "number" ? g.totalYearsExperience : base.totalYearsExperience ?? 0,
    location: typeof g.location === "string" ? g.location : base.location,
  };
};

/**
 * Parse a PDF resume into a `UmuravaProfile`.
 *
 * Primary path: forwards to Python's `POST /normalise/pdf` (pdfplumber + Gemini via the AI service).
 * Fallback path: if AI_SERVICE_URL is unset OR the Python service returns an error, drops back to
 * the legacy Node path (pdf-parse + Gemini via /ai/generate + heuristics).
 */
export const parsePDF = async (
  buffer: Buffer,
  filename = "resume.pdf",
): Promise<Partial<UmuravaProfile> & { rawText: string }> => {
  if (env.AI_SERVICE_URL) {
    try {
      const parsed = await normalisePdf({ buffer, filename, mimetype: "application/pdf" });
      const profile = pythonProfileToUmurava(parsed);
      const rawText = await extractRawTextFromPdf(buffer).catch(() => "");
      return {
        ...profile,
        headline: parsed.headline,
        bio: parsed.bio ?? undefined,
        projects: parsed.projects?.map((p) => ({
          name: p.name,
          description: p.description,
          technologies: p.technologies,
          role: p.role,
          link: p.link,
          startDate: p.startDate,
          endDate: p.endDate,
        })),
        availability: parsed.availability,
        socialLinks: parsed.socialLinks ?? undefined,
        rawText,
      };
    } catch (err) {
      const reason = err instanceof AiServiceError ? `${err.code}: ${err.message}` : String(err);
      // eslint-disable-next-line no-console
      console.warn(`[parsePDF] Python /normalise/pdf failed — falling back to Node parser. Reason: ${reason}`);
    }
  }

  return legacyParsePdf(buffer);
};

/** Fallback: Node-side PDF → profile (pdf-parse + Gemini via /ai/generate + heuristics). */
const legacyParsePdf = async (buffer: Buffer): Promise<Partial<UmuravaProfile> & { rawText: string }> => {
  const rawText = await extractRawTextFromPdf(buffer);

  try {
    const extracted = await callGeminiWithRetry(buildResumeExtractionPrompt(rawText), ZodResumeGeminiExtraction);
    const merged = mergeGeminiResume(rawText, extracted as Record<string, unknown>);
    return { ...merged, rawText };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn(`[parsePDF] Gemini extraction failed — using heuristic fallback. Reason: ${reason}`);
    return { ...heuristicExtractResume(rawText), rawText };
  }
};

const extractRawTextFromPdf = async (buffer: Buffer): Promise<string> => {
  try {
    const data = await pdfParse(buffer);
    return typeof data?.text === "string" ? data.text : "";
  } catch (error) {
    throw new Error(`PDF text extraction failed: ${String(error)}`);
  }
};

export const parseCSV = async (buffer: Buffer): Promise<Partial<UmuravaProfile>[]> => {
  const rows = parse(buffer, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return rows.map((row, idx) => mapFlatRowToProfile(row, idx, "csv"));
};

export const parseExcel = async (buffer: Buffer): Promise<Partial<UmuravaProfile>[]> => {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(arrayBuffer as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const mappedRow: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const cellValue = row.getCell(index + 1).value;
      mappedRow[header] = String(cellValue ?? "").trim();
    });

    rows.push(mappedRow);
  });

  return rows.map((row, idx) => mapFlatRowToProfile(row, idx, "excel"));
};

export const parseResumeFromUrl = async (url: string): Promise<Partial<UmuravaProfile> & { rawText?: string }> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch resume URL: ${url}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf")) {
    throw new Error(`Resume URL is not a PDF: ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const filename = url.split("/").pop()?.split("?")[0] || "resume.pdf";
  return parsePDF(Buffer.from(arrayBuffer), filename);
};

const mapFlatRowToProfile = (
  row: Record<string, string>,
  idx: number,
  prefix: "csv" | "excel",
): Partial<UmuravaProfile> => {
  const skillsRaw = row.skills ?? row.Skills ?? "";
  const skills = skillsRaw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  const expYearsRaw =
    row.experienceYears ??
    row.experience_years ??
    row.years ??
    row["Years of Experience"] ??
    row["Years"] ??
    "";
  const totalYearsExperience = Math.min(60, Math.max(0, Number.parseFloat(String(expYearsRaw)) || 0));
  return {
    id: row.id ?? `${prefix}-${idx + 1}`,
    firstName: row.firstName ?? row.firstname ?? row.FirstName ?? "Unknown",
    lastName: row.lastName ?? row.lastname ?? row.LastName ?? "Candidate",
    email: row.email ?? row.Email ?? "unknown@example.com",
    title: row.title ?? row.currentRole ?? row.Role ?? "N/A",
    skills,
    location: row.location ?? row.Location ?? "Unknown",
    totalYearsExperience,
    summary: row.summary ?? row.Summary ?? row.bio ?? undefined,
  };
};

export const normalizeProfile = (raw: unknown): UmuravaProfile => {
  const talent = safeParseTalentProfile(raw);
  if (talent) return talentProfileToUmuravaProfile(talent);

  const src = raw as Partial<UmuravaProfile>;
  const experience = src.experience ?? [];
  // Prefer the value computed upstream (Python /normalise/pdf returns it via yearsBetween).
  // Only fall back to summing `yearsInRole` when upstream gave us nothing.
  const summedFromRoles = experience.reduce((acc, item) => acc + (item.yearsInRole ?? 0), 0);
  const totalYearsExperience = src.totalYearsExperience && src.totalYearsExperience > 0
    ? src.totalYearsExperience
    : summedFromRoles;
  return {
    id: src.id ?? randomUUID(),
    firstName: src.firstName ?? "Unknown",
    lastName: src.lastName ?? "Candidate",
    email: src.email ?? "unknown@example.com",
    phone: src.phone,
    title: src.title ?? "N/A",
    summary: src.summary,
    skills: (src.skills ?? []).map((s) => s.trim().toLowerCase()),
    languages: src.languages ?? [],
    experience,
    education: src.education ?? [],
    certifications: src.certifications,
    totalYearsExperience,
    availableFrom: src.availableFrom,
    expectedSalary: src.expectedSalary,
    location: src.location ?? "Unknown",
    remotePreference: src.remotePreference ?? "flexible",
    // Preserve the richer fields populated by the Python AI service so the
    // frontend applicant detail views can render headline, bio, projects, etc.
    headline: src.headline,
    bio: src.bio,
    projects: src.projects,
    availability: src.availability,
    socialLinks: src.socialLinks,
  };
};
