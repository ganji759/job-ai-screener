import { ScreeningModel } from "../models/Screening.model";

/** Normalize skills array — Umurava Talent Profile uses `{ name, level, ... }[]`; legacy uses `string[]`. */
export function profileSkillsToNames(profile: Record<string, unknown>): string[] {
  const raw = profile.skills;
  if (!Array.isArray(raw)) return [];
  const names: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      names.push(item);
    } else if (item && typeof item === "object" && "name" in item) {
      names.push(String((item as { name: string }).name));
    }
  }
  return names.filter(Boolean);
}

export function headlineOrTitle(profile: Record<string, unknown>): string {
  const h = profile.headline;
  const t = profile.title;
  if (typeof h === "string" && h.trim()) return h;
  if (typeof t === "string") return t;
  return "";
}

/** Latest completed screening for this job — scores keyed by `profile.id` / candidateId. */
export async function loadLatestScoresByCandidateId(jobId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const screening = await ScreeningModel.findOne({ jobId, status: "completed" }).sort({ updatedAt: -1 }).lean();
  if (!screening?.results || typeof screening.results !== "object") return map;

  const results = screening.results as Record<string, unknown>;
  const allResults = results.allResults as Array<{ candidateId?: string; totalScore?: number }> | undefined;
  if (Array.isArray(allResults)) {
    for (const row of allResults) {
      if (row?.candidateId != null && typeof row.totalScore === "number") {
        map.set(String(row.candidateId), row.totalScore);
      }
    }
    if (map.size > 0) return map;
  }

  const shortlist = results.shortlist as Array<{ candidateId?: string; totalScore?: number }> | undefined;
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
export function mergeApplicantSourceFilter(filter: Record<string, unknown>, source: string | undefined): void {
  if (!source || source === "all") return;

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

export function formatApplicantListItem(doc: Record<string, unknown>, scoresByCandidateId: Map<string, number>): Record<string, unknown> {
  const p = (doc.profile ?? {}) as Record<string, unknown>;
  const firstName = String(p.firstName ?? "");
  const lastName = String(p.lastName ?? "");
  const name = `${firstName} ${lastName}`.trim() || "Unknown Candidate";
  const email = String(p.email ?? "");
  const title = headlineOrTitle(p);
  const skillsAll = profileSkillsToNames(p);
  const skills = skillsAll.slice(0, 3);
  const candidateId = String(p.id ?? doc._id ?? "");

  let score: number | null = null;
  if (candidateId && scoresByCandidateId.has(candidateId)) {
    score = scoresByCandidateId.get(candidateId)!;
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
