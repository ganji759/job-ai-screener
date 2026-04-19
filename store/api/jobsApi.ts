import { baseApi } from "./baseApi";
import type { Job, BackendJob, ScoringWeights } from "../../types";

// Default weights used when not explicitly configured
const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  skills: 0.40,
  experience: 0.35,
  education: 0.15,
  cultural_fit: 0.10,
};

/** Map backend job document to the frontend Job shape (filling in unsupported fields with defaults). */
function adaptBackendJob(j: BackendJob): Job {
  return {
    _id: String(j._id),
    title: j.title,
    description: j.description,
    requirements: {
      domain: "",
      experienceLevel: "mid",
      minExperienceYears: j.requirements.experience_years,
      skills: j.requirements.skills,
      education: j.requirements.education_level,
    },
    location: "",
    employmentType: "full_time",
    recruiterId: "",
    status: "active",
    applicantCount: 0,
    createdAt: j.createdAt ?? new Date().toISOString(),
    updatedAt: j.updatedAt ?? new Date().toISOString(),
  };
}

interface GetJobsParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/** Payload sent to POST /api/jobs — aligned with backend Zod schema. */
export type CreateJobPayload = {
  title: string;
  description: string;
  requirements: {
    skills: string[];
    experience_years: number;
    education_level: string;
    nice_to_have?: string[];
  };
  scoring_weights?: ScoringWeights;
};

/** Payload sent to PATCH /api/jobs/:id — partial version of CreateJobPayload. */
export type PatchJobPayload = Partial<Pick<Job, "title" | "description" | "status">> & {
  requirements?: Partial<{
    skills: string[];
    experience_years: number;
    education_level: string;
    nice_to_have: string[];
    // legacy frontend-only fields (ignored by backend)
    domain?: string;
    experienceLevel?: string;
    minExperienceYears?: number;
    education?: string;
  }>;
  // legacy frontend-only fields (ignored by backend)
  location?: string;
  employmentType?: string;
};

type BackendJobEnvelope = { data: BackendJob; error: null };
type BackendJobsEnvelope = { data: BackendJob[]; error: null; meta: { total: number; limit: number; offset: number } };

export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<{ jobs: Job[]; total: number; page: number; totalPages: number }, GetJobsParams | void>({
      query: (params) => {
        const p = params as GetJobsParams | undefined;
        const limit = p?.limit ?? 20;
        const page = p?.page ?? 1;
        const offset = (page - 1) * limit;
        return { url: "/jobs", method: "get", params: { limit, offset, search: p?.search } };
      },
      transformResponse: (raw: BackendJobsEnvelope) => {
        const limit = raw.meta?.limit ?? 20;
        const offset = raw.meta?.offset ?? 0;
        const total = raw.meta?.total ?? raw.data?.length ?? 0;
        return {
          jobs: (raw.data ?? []).map(adaptBackendJob),
          total,
          page: Math.floor(offset / Math.max(limit, 1)) + 1,
          totalPages: Math.ceil(total / Math.max(limit, 1)),
        };
      },
      providesTags: ["Jobs"],
    }),

    getJob: builder.query<Job, string>({
      query: (id) => ({ url: `/jobs/${id}`, method: "get" }),
      transformResponse: (raw: BackendJobEnvelope) => adaptBackendJob(raw.data),
      providesTags: ["Jobs"],
    }),

    createJob: builder.mutation<Job, CreateJobPayload>({
      query: (body) => ({
        url: "/jobs",
        method: "post",
        data: { ...body, scoring_weights: body.scoring_weights ?? DEFAULT_SCORING_WEIGHTS },
      }),
      transformResponse: (raw: BackendJobEnvelope) => adaptBackendJob(raw.data),
      invalidatesTags: ["Jobs"],
    }),

    updateJob: builder.mutation<Job, { id: string; body: PatchJobPayload }>({
      query: ({ id, body }) => {
        // Map frontend patch shape to backend-compatible shape
        const backendBody: Record<string, unknown> = {};
        if (body.title !== undefined) backendBody.title = body.title;
        if (body.description !== undefined) backendBody.description = body.description;
        if (body.requirements) {
          const req: Record<string, unknown> = {};
          const r = body.requirements;
          if (r.skills !== undefined) req.skills = r.skills;
          // Support both legacy (minExperienceYears) and backend (experience_years) field names
          if (r.experience_years !== undefined) req.experience_years = r.experience_years;
          else if (r.minExperienceYears !== undefined) req.experience_years = r.minExperienceYears;
          if (r.education_level !== undefined) req.education_level = r.education_level;
          else if (r.education !== undefined) req.education_level = r.education;
          if (r.nice_to_have !== undefined) req.nice_to_have = r.nice_to_have;
          if (Object.keys(req).length > 0) backendBody.requirements = req;
        }
        return { url: `/jobs/${id}`, method: "patch", data: backendBody };
      },
      transformResponse: (raw: BackendJobEnvelope) => adaptBackendJob(raw.data),
      invalidatesTags: ["Jobs"],
    }),

    deleteJob: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/jobs/${id}`, method: "delete" }),
      transformResponse: () => ({ success: true }),
      invalidatesTags: ["Jobs"],
    }),

    // These endpoints do not exist in the backend — kept for UI compatibility (will 404 gracefully)
    getJobStats: builder.query<Record<string, unknown>, string>({
      query: (id) => ({ url: `/jobs/${id}/stats`, method: "get" }),
      providesTags: ["Jobs"],
    }),
    getJobBenchmark: builder.query<Record<string, unknown>, string>({
      query: (id) => ({ url: `/jobs/${id}/benchmark`, method: "get" }),
      providesTags: ["Jobs"],
    }),
  }),
});

export const {
  useGetJobsQuery,
  useGetJobQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
  useGetJobStatsQuery,
  useGetJobBenchmarkQuery,
} = jobsApi;
