"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileSkillsToNames = profileSkillsToNames;
exports.headlineOrTitle = headlineOrTitle;
exports.loadLatestScoresByCandidateId = loadLatestScoresByCandidateId;
exports.mergeApplicantSourceFilter = mergeApplicantSourceFilter;
exports.formatApplicantListItem = formatApplicantListItem;
const Screening_model_1 = require("../models/Screening.model");
/** Normalize skills array — Umurava Talent Profile uses `{ name, level, ... }[]`; legacy uses `string[]`. */
function profileSkillsToNames(profile) {
    const raw = profile.skills;
    if (!Array.isArray(raw))
        return [];
    const names = [];
    for (const item of raw) {
        if (typeof item === "string") {
            names.push(item);
        }
        else if (item && typeof item === "object" && "name" in item) {
            names.push(String(item.name));
        }
    }
    return names.filter(Boolean);
}
function headlineOrTitle(profile) {
    const h = profile.headline;
    const t = profile.title;
    if (typeof h === "string" && h.trim())
        return h;
    if (typeof t === "string")
        return t;
    return "";
}
/** Latest completed screening for this job — scores keyed by `profile.id` / candidateId. */
async function loadLatestScoresByCandidateId(jobId) {
    const map = new Map();
    const screening = await Screening_model_1.ScreeningModel.findOne({ jobId, status: "completed" }).sort({ updatedAt: -1 }).lean();
    if (!screening?.results || typeof screening.results !== "object")
        return map;
    const results = screening.results;
    const allResults = results.allResults;
    if (Array.isArray(allResults)) {
        for (const row of allResults) {
            if (row?.candidateId != null && typeof row.totalScore === "number") {
                map.set(String(row.candidateId), row.totalScore);
            }
        }
        if (map.size > 0)
            return map;
    }
    const shortlist = results.shortlist;
    if (Array.isArray(shortlist)) {
        for (const row of shortlist) {
            if (row?.candidateId != null && typeof row.totalScore === "number") {
                map.set(String(row.candidateId), row.totalScore);
            }
        }
    }
    return map;
}
/** Merge query `source` into Mongo filter (`excel_upload` / `csv_upload` split by `originalFileName`). */
function mergeApplicantSourceFilter(filter, source) {
    if (!source || source === "all")
        return;
    if (source === "excel_upload") {
        filter.source = "csv_upload";
        filter.originalFileName = { $regex: /\.xlsx$/i };
        return;
    }
    if (source === "csv_upload") {
        filter.source = "csv_upload";
        filter.$nor = [{ originalFileName: { $regex: /\.xlsx$/i } }];
        return;
    }
    filter.source = source;
}
function formatApplicantListItem(doc, scoresByCandidateId) {
    const p = (doc.profile ?? {});
    const firstName = String(p.firstName ?? "");
    const lastName = String(p.lastName ?? "");
    const name = `${firstName} ${lastName}`.trim() || "Unknown Candidate";
    const email = String(p.email ?? "");
    const title = headlineOrTitle(p);
    const skillsAll = profileSkillsToNames(p);
    const skills = skillsAll.slice(0, 3);
    const candidateId = String(p.id ?? doc._id ?? "");
    let score = null;
    if (candidateId && scoresByCandidateId.has(candidateId)) {
        score = scoresByCandidateId.get(candidateId);
    }
    return {
        _id: doc._id,
        jobId: doc.jobId,
        source: doc.source,
        profile: doc.profile,
        status: doc.status,
        screeningId: doc.screeningId,
        rawText: doc.rawText,
        originalFileName: doc.originalFileName,
        createdAt: doc.createdAt,
        name,
        email,
        title,
        skills,
        score,
    };
}
