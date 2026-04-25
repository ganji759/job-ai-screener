import { mapUmuravaProfileForIngest } from "../../lib/mapUmuravaProfileForIngest";
import { baseApi } from "./baseApi";
import type { Applicant, ApplicantProfile, UmuravaProfile } from "../../types";

/** Fastify `/api/v1/applicants` — list items include mapped `name`, `email`, `title`, `skills`, `score`. */
function adaptApiApplicant(a: Record<string, unknown>): Applicant {
  const profile = (a.profile ?? {}) as Record<string, unknown>;
  const skillsFromApi = a.skills;
  const skillsRaw = profile.skills;
  let skills: string[] = [];
  if (Array.isArray(skillsFromApi) && skillsFromApi.every((x) => typeof x === "string")) {
    skills = skillsFromApi as string[];
  } else if (Array.isArray(skillsRaw)) {
    skills = skillsRaw.map((s) => {
      if (typeof s === "string") return s;
      if (s && typeof s === "object" && "name" in s) return String((s as { name: string }).name);
      return "";
    }).filter(Boolean);
  }
  const src = String(a.source ?? "");
  const statusRaw = String(a.status ?? "pending");
  const status = (["pending", "screened", "shortlisted", "rejected"].includes(statusRaw) ? statusRaw : "pending") as Applicant["status"];

  const titleFromApi = a.title != null ? String(a.title) : "";
  const prof: ApplicantProfile = {
    id: profile.id != null ? String(profile.id) : String(a._id),
    firstName: String(profile.firstName ?? "Unknown"),
    lastName: String(profile.lastName ?? ""),
    email: String(a.email ?? profile.email ?? ""),
    title: titleFromApi || String(profile.headline ?? profile.title ?? ""),
    skills,
    experienceYears: typeof profile.totalYearsExperience === "number" ? profile.totalYearsExperience : undefined,
    education: profile.education as ApplicantProfile["education"],
    location: profile.location != null ? String(profile.location) : undefined,
    bio: profile.bio != null ? String(profile.bio) : undefined,
    phone: profile.phone != null ? String(profile.phone) : undefined,
    totalYearsExperience: typeof profile.totalYearsExperience === "number" ? profile.totalYearsExperience : undefined,
    headline: profile.headline != null ? String(profile.headline) : undefined,
    languages: Array.isArray(profile.languages) ? (profile.languages as ApplicantProfile["languages"]) : undefined,
    experience: Array.isArray(profile.experience) ? (profile.experience as ApplicantProfile["experience"]) : undefined,
    certifications: Array.isArray(profile.certifications)
      ? (profile.certifications as ApplicantProfile["certifications"])
      : undefined,
    projects: Array.isArray(profile.projects) ? (profile.projects as ApplicantProfile["projects"]) : undefined,
    availability: profile.availability as ApplicantProfile["availability"],
    socialLinks: profile.socialLinks as ApplicantProfile["socialLinks"],
  };

  let totalScore: number | undefined;
  if (a.score !== undefined && a.score !== null && a.score !== "") {
    const n = Number(a.score);
    if (!Number.isNaN(n)) totalScore = n;
  } else if (a.totalScore !== undefined && a.totalScore !== null && a.totalScore !== "") {
    const n = Number(a.totalScore);
    if (!Number.isNaN(n)) totalScore = n;
  }

  return {
    _id: String(a._id),
    jobId: String(a.jobId ?? ""),
    source: (src === "csv_upload" || src === "pdf_upload" || src === "umurava_platform" ? src : "umurava_platform") as Applicant["source"],
    profile: prof,
    rawText: a.rawText != null ? String(a.rawText) : undefined,
    originalFileName: a.originalFileName != null ? String(a.originalFileName) : undefined,
    status,
    screeningId: a.screeningId != null ? String(a.screeningId) : undefined,
    totalScore,
    createdAt: a.createdAt != null ? String(a.createdAt) : new Date().toISOString(),
  };
}

export type ListApplicantsResponse = {
  applicants: Applicant[];
  total: number;
  page: number;
  totalPages: number;
};

// Backward-compatible response shape for ingest/upload mutations
export type IngestApplicantsResponse = {
  inserted: number;
  failed: number;
  errors: Array<{ index: number; message: string }>;
};

export type UploadApplicantsResponse = {
  inserted: number;
  failed: number;
  errors: unknown[];
};

export const applicantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApplicants: builder.query<
      ListApplicantsResponse,
      { jobId?: string; page?: number; limit?: number; status?: string; source?: string }
    >({
      query: ({ jobId = "all", page = 1, limit = 100, status, source }) => {
        const offset = (page - 1) * limit;
        /* Prefer flat `/api/v1/applicants` — always registered; avoids nested-route / Fastify ordering issues. */
        const jid = jobId?.trim() || "all";
        return { url: "/applicants", method: "get", params: { jobId: jid, limit, offset, status, source } };
      },
      transformResponse: (raw: unknown): ListApplicantsResponse => {
        const body = raw as {
          applicants?: Record<string, unknown>[];
          total?: number;
          page?: number;
          totalPages?: number;
          data?: Record<string, unknown>[];
          meta?: { total?: number };
        };
        const rows = body.applicants ?? body.data ?? [];
        const total = body.total ?? body.meta?.total ?? rows.length;
        const page = body.page ?? 1;
        const totalPages = body.totalPages ?? Math.max(1, Math.ceil(total / 20));
        return {
          applicants: rows.map((r) => adaptApiApplicant(r)),
          total,
          page,
          totalPages,
        };
      },
      providesTags: ["Applicants"],
    }),

    ingestProfiles: builder.mutation<IngestApplicantsResponse, { jobId: string; profiles: UmuravaProfile[] }>({
      query: ({ jobId, profiles }) => ({
        url: "/applicants/ingest",
        method: "post",
        data: { jobId, profiles: profiles.map(mapUmuravaProfileForIngest) },
      }),
      transformResponse: (raw: unknown): IngestApplicantsResponse => {
        const body = raw as Partial<IngestApplicantsResponse>;
        return {
          inserted: body.inserted ?? 0,
          failed: body.failed ?? 0,
          errors: Array.isArray(body.errors) ? body.errors : [],
        };
      },
      invalidatesTags: ["Applicants"],
    }),

    uploadFiles: builder.mutation<UploadApplicantsResponse, { jobId: string; formData: FormData }>({
      query: ({ formData }) => ({
        url: "/applicants/upload",
        method: "post",
        data: formData,
      }),
      transformResponse: (raw: unknown): UploadApplicantsResponse => {
        const body = raw as Partial<UploadApplicantsResponse> & { previewProfiles?: unknown };
        return {
          inserted: body.inserted ?? 0,
          failed: body.failed ?? 0,
          errors: Array.isArray(body.errors) ? body.errors : [],
        };
      },
      invalidatesTags: ["Applicants"],
    }),

    /** POST /api/v1/applicants/external-ingest — resume URLs (and optional spreadsheet rows). */
    externalIngestApplicants: builder.mutation<
      IngestApplicantsResponse & { previewProfiles?: unknown[] },
      { jobId: string; resumeLinks?: string[]; spreadsheetRows?: Array<Record<string, string>> }
    >({
      query: (body) => ({ url: "/applicants/external-ingest", method: "post", data: body }),
      transformResponse: (raw: unknown): IngestApplicantsResponse => {
        const body = raw as Partial<IngestApplicantsResponse>;
        return {
          inserted: body.inserted ?? 0,
          failed: body.failed ?? 0,
          errors: Array.isArray(body.errors) ? body.errors : [],
        };
      },
      invalidatesTags: ["Applicants"],
    }),

    /**
     * Backend has no `GET /applicants/:id`. We fetch the recruiter-wide list with a large
     * page and find the record locally. Cached under the same `Applicants` tag so the
     * list and detail view share invalidation.
     */
    getApplicant: builder.query<Applicant, string>({
      async queryFn(id, _api, _extra, baseQuery) {
        const result = await baseQuery({
          url: "/applicants",
          method: "get",
          params: { jobId: "all", limit: 10000, offset: 0 },
        });
        if (result.error) return { error: result.error };
        const body = result.data as {
          applicants?: Record<string, unknown>[];
          data?: Record<string, unknown>[];
        };
        const rows = body.applicants ?? body.data ?? [];
        const match = rows.find((row) => String(row._id) === id);
        if (!match) {
          return {
            error: { status: 404, data: { error: "Applicant not found" } },
          };
        }
        return { data: adaptApiApplicant(match) };
      },
      providesTags: (_result, _err, id) => [{ type: "Applicants", id }],
    }),
    deleteApplicant: builder.mutation<{ deleted: number }, string>({
      query: (id) => ({ url: `/applicants/${id}`, method: "delete" }),
      invalidatesTags: ["Applicants"],
    }),
    bulkDelete: builder.mutation<{ deleted: number }, { jobId: string; applicantIds?: string[] }>({
      query: (body) => ({ url: "/applicants/bulk-delete", method: "post", data: body }),
      invalidatesTags: ["Applicants"],
    }),
    enhanceProfile: builder.mutation<Record<string, unknown>, string>({
      query: (id) => ({ url: `/applicants/${id}/enhance`, method: "post" }),
      invalidatesTags: ["Applicants"],
    }),
  }),
});

export const {
  useGetApplicantsQuery,
  useGetApplicantQuery,
  useIngestProfilesMutation,
  useUploadFilesMutation,
  useExternalIngestApplicantsMutation,
  useDeleteApplicantMutation,
  useBulkDeleteMutation,
  useEnhanceProfileMutation,
} = applicantsApi;
