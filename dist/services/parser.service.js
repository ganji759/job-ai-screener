"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProfile = exports.parseResumeFromUrl = exports.parseExcel = exports.parseCSV = exports.parsePDF = void 0;
const sync_1 = require("csv-parse/sync");
const node_crypto_1 = require("node:crypto");
const XLSX = __importStar(require("xlsx"));
const gemini_service_1 = require("./gemini.service");
const promptBuilder_1 = require("../utils/promptBuilder");
const zod_1 = require("zod");
const PartialProfile = zod_1.z.object({
    id: zod_1.z.string().optional(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    location: zod_1.z.string().optional(),
}).passthrough();
const parsePDF = async (buffer) => {
    let parsed;
    try {
        const module = await Promise.resolve().then(() => __importStar(require("pdf-parse")));
        const pdfParse = module.default;
        if (!pdfParse) {
            throw new Error("pdf-parse default export is unavailable");
        }
        parsed = await pdfParse(buffer);
    }
    catch (error) {
        throw new Error(`PDF parser initialization failed. This runtime may not support the current pdf-parse build. Details: ${String(error)}`);
    }
    const rawText = parsed.text ?? "";
    const extracted = await (0, gemini_service_1.callGeminiWithRetry)((0, promptBuilder_1.buildResumeExtractionPrompt)(rawText), PartialProfile);
    return { ...extracted, rawText };
};
exports.parsePDF = parsePDF;
const parseCSV = async (buffer) => {
    const rows = (0, sync_1.parse)(buffer, { columns: true, skip_empty_lines: true });
    return rows.map((row, idx) => mapFlatRowToProfile(row, idx, "csv"));
};
exports.parseCSV = parseCSV;
const parseExcel = async (buffer) => {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
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
const mapFlatRowToProfile = (row, idx, prefix) => ({
    id: row.id ?? `${prefix}-${idx + 1}`,
    firstName: row.firstName ?? row.firstname ?? "Unknown",
    lastName: row.lastName ?? row.lastname ?? "Candidate",
    email: row.email ?? "unknown@example.com",
    title: row.title ?? row.currentRole ?? "N/A",
    skills: (row.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    location: row.location ?? "Unknown",
});
const normalizeProfile = (raw) => {
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
