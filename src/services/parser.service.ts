import { parse } from "csv-parse/sync";
import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import type { UmuravaProfile } from "../types";
import { callGeminiWithRetry } from "./gemini.service";
import { buildResumeExtractionPrompt } from "../utils/promptBuilder";
import { z } from "zod";

const PartialProfile = z.object({
  id: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  title: z.string().optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
}).passthrough();

export const parsePDF = async (buffer: Buffer): Promise<Partial<UmuravaProfile> & { rawText: string }> => {
  let parsed: { text?: string };
  try {
    const module = await import("pdf-parse");
    const pdfParse = (module as unknown as { default?: (input: Buffer) => Promise<{ text: string }> }).default;
    if (!pdfParse) {
      throw new Error("pdf-parse default export is unavailable");
    }
    parsed = await pdfParse(buffer);
  } catch (error) {
    throw new Error(
      `PDF parser initialization failed. This runtime may not support the current pdf-parse build. Details: ${String(error)}`,
    );
  }
  const rawText = parsed.text ?? "";
  const extracted = await callGeminiWithRetry(buildResumeExtractionPrompt(rawText), PartialProfile);
  return { ...(extracted as Partial<UmuravaProfile>), rawText };
};

export const parseCSV = async (buffer: Buffer): Promise<Partial<UmuravaProfile>[]> => {
  const rows = parse(buffer, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return rows.map((row, idx) => mapFlatRowToProfile(row, idx, "csv"));
};

export const parseExcel = async (buffer: Buffer): Promise<Partial<UmuravaProfile>[]> => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets[firstSheet], { defval: "" });
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
  return parsePDF(Buffer.from(arrayBuffer));
};

const mapFlatRowToProfile = (
  row: Record<string, string>,
  idx: number,
  prefix: "csv" | "excel",
): Partial<UmuravaProfile> => ({
    id: row.id ?? `${prefix}-${idx + 1}`,
    firstName: row.firstName ?? row.firstname ?? "Unknown",
    lastName: row.lastName ?? row.lastname ?? "Candidate",
    email: row.email ?? "unknown@example.com",
    title: row.title ?? row.currentRole ?? "N/A",
    skills: (row.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    location: row.location ?? "Unknown",
  });

export const normalizeProfile = (raw: unknown): UmuravaProfile => {
  const src = raw as Partial<UmuravaProfile>;
  const experience = src.experience ?? [];
  const totalYearsExperience = experience.reduce((acc, item) => acc + (item.yearsInRole ?? 0), 0);
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
  };
};
