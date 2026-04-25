"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProfile = exports.parseResumeFromUrl = exports.parseExcel = exports.parseCSV = exports.parsePDF = exports.heuristicExtractResume = void 0;
const sync_1 = require("csv-parse/sync");
const node_crypto_1 = require("node:crypto");
const exceljs_1 = __importDefault(require("exceljs"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const gemini_service_1 = require("./gemini.service");
const talentProfile_adapter_1 = require("./talentProfile.adapter");
const promptBuilder_1 = require("../utils/promptBuilder");
const jsonValidator_1 = require("../utils/jsonValidator");
/** Regex / line heuristics when Gemini is unavailable — improves name/email vs "Unknown". */
const heuristicExtractResume = (rawText) => {
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
    const candidateLine = lines.find((l) => l.length >= 3 && l.length < 100 && !l.includes("@") && !/^\d/.test(l));
    if (candidateLine) {
        const parts = candidateLine.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            firstName = parts[0];
            lastName = parts.slice(1).join(" ");
        }
        else if (parts.length === 1) {
            firstName = parts[0];
            lastName = "";
        }
    }
    const yearsMatch = compact.match(/(\d+)\s*\+?\s*(?:years?|yrs?|ans?)/i);
    const totalYearsExperience = yearsMatch ? Math.min(60, Number(yearsMatch[1])) : 0;
    const phoneMatch = compact.match(/(?:\+?\d[\d\s.-]{8,}\d)/);
    return {
        id: (0, node_crypto_1.randomUUID)(),
        firstName,
        lastName,
        email,
        phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, " ").trim() : undefined,
        title: lines[1] && lines[1] !== candidateLine ? lines[1].slice(0, 120) : "Professional",
        summary: compact.slice(0, 2000),
        skills: [],
        languages: [],
        experience: [],
        education: [],
        totalYearsExperience,
        location: "Unknown",
        remotePreference: "flexible",
    };
};
exports.heuristicExtractResume = heuristicExtractResume;
const mergeGeminiResume = (rawText, gemini) => {
    const base = (0, exports.heuristicExtractResume)(rawText);
    const g = gemini;
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
    return {
        ...base,
        firstName: (first || base.firstName),
        lastName: (last || base.lastName),
        email: typeof g.email === "string" && g.email.includes("@") ? g.email : base.email,
        phone: typeof g.phone === "string" ? g.phone : base.phone,
        title: typeof g.title === "string" ? g.title : base.title,
        summary: typeof g.summary === "string" ? g.summary : base.summary,
        skills,
        languages: Array.isArray(g.languages) ? g.languages : base.languages ?? [],
        experience: Array.isArray(g.experience) ? g.experience : base.experience ?? [],
        education: Array.isArray(g.education) ? g.education : base.education ?? [],
        totalYearsExperience: typeof g.totalYearsExperience === "number" ? g.totalYearsExperience : base.totalYearsExperience ?? 0,
        location: typeof g.location === "string" ? g.location : base.location,
    };
};
/** Uses `pdf-parse@1.x` — Node-compatible; Gemini structures fields; heuristics fill gaps. */
const parsePDF = async (buffer) => {
    let rawText = "";
    try {
        const data = await (0, pdf_parse_1.default)(buffer);
        rawText = typeof data?.text === "string" ? data.text : "";
    }
    catch (error) {
        throw new Error(`PDF text extraction failed: ${String(error)}`);
    }
    try {
        const extracted = await (0, gemini_service_1.callGeminiWithRetry)((0, promptBuilder_1.buildResumeExtractionPrompt)(rawText), jsonValidator_1.ZodResumeGeminiExtraction);
        const merged = mergeGeminiResume(rawText, extracted);
        return { ...merged, rawText };
    }
    catch {
        return { ...(0, exports.heuristicExtractResume)(rawText), rawText };
    }
};
exports.parsePDF = parsePDF;
const parseCSV = async (buffer) => {
    const rows = (0, sync_1.parse)(buffer, { columns: true, skip_empty_lines: true });
    return rows.map((row, idx) => mapFlatRowToProfile(row, idx, "csv"));
};
exports.parseCSV = parseCSV;
const parseExcel = async (buffer) => {
    const workbook = new exceljs_1.default.Workbook();
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet)
        return [];
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? "").trim();
    });
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1)
            return;
        const mappedRow = {};
        headers.forEach((header, index) => {
            if (!header)
                return;
            const cellValue = row.getCell(index + 1).value;
            mappedRow[header] = String(cellValue ?? "").trim();
        });
        rows.push(mappedRow);
    });
    return rows.map((row, idx) => mapFlatRowToProfile(row, idx, "excel"));
};
exports.parseExcel = parseExcel;
const parseResumeFromUrl = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch resume URL: ${url}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("pdf")) {
        throw new Error(`Resume URL is not a PDF: ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return (0, exports.parsePDF)(Buffer.from(arrayBuffer));
};
exports.parseResumeFromUrl = parseResumeFromUrl;
const mapFlatRowToProfile = (row, idx, prefix) => {
    const skillsRaw = row.skills ?? row.Skills ?? "";
    const skills = skillsRaw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    const expYearsRaw = row.experienceYears ??
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
const normalizeProfile = (raw) => {
    const talent = (0, talentProfile_adapter_1.safeParseTalentProfile)(raw);
    if (talent)
        return (0, talentProfile_adapter_1.talentProfileToUmuravaProfile)(talent);
    const src = raw;
    const experience = src.experience ?? [];
    const totalYearsExperience = experience.reduce((acc, item) => acc + (item.yearsInRole ?? 0), 0);
    return {
        id: src.id ?? (0, node_crypto_1.randomUUID)(),
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
exports.normalizeProfile = normalizeProfile;
