import { adaptApiJobToJob, type UpdateJobBody } from "../../lib/jobApiMapping";
import { baseApi } from "./baseApi";
import type { ApiJob, Job } from "../../types";

export type { UpdateJobBody };

interface GetJobsParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/** POST /api/v1/jobs — body matches Mongoose Job + Zod (requirements is a nested object). */
export type CreateJobPayload = {
  title: string;
  description: string;
  requirements: {
    title: string;
    description: string;
    mustHaveSkills: string[];
    niceToHaveSkills?: string[];
    minYearsExperience: number;
    educationLevel: "none" | "certificate" | "bachelor" | "master" | "phd";
    domain?: string;
    location?: string;
    remoteAllowed?: boolean;
  };
};

export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<{ jobs: Job[]; total: number; page: number; totalPages: number }, GetJobsParams | void>({
      query: (params) => {
        const p = params as GetJobsParams | undefined;
        const limit = p?.limit ?? 20;
        const page = p?.page ?? 1;
        return { url: "/jobs", method: "get", params: { limit, page, search: p?.search, status: p?.status } };
      },
      transformResponse: (raw: { jobs?: ApiJob[]; total?: number; page?: number; totalPages?: number }) => {
        const jobs = raw.jobs ?? [];
        const total = raw.total ?? jobs.length;
        const page = raw.page ?? 1;
        const totalPages = raw.totalPages ?? Math.ceil(total / 20);
        return {
          jobs: jobs.map(adaptApiJobToJob),
          total,
          page,
          totalPages,
        };
      },
      providesTags: ["Jobs"],
    }),

    getJob: builder.query<Job, string>({
      query: (id) => ({ url: `/jobs/${id}`, method: "get" }),
      transformResponse: (raw: ApiJob) => adaptApiJobToJob(raw),
      providesTags: ["Jobs"],
    }),

    createJob: builder.mutation<Job, CreateJobPayload>({
      query: (body) => ({
        url: "/jobs",
        method: "post",
        data: body,
      }),
      transformResponse: (raw: ApiJob) => adaptApiJobToJob(raw),
      invalidatesTags: ["Jobs"],
    }),

    updateJob: builder.mutation<Job, { id: string; body: UpdateJobBody }>({
      query: ({ id, body }) => ({
        url: `/jobs/${id}`,
        method: "put",
        data: body,
      }),
      transformResponse: (raw: ApiJob) => adaptApiJobToJob(raw),
      invalidatesTags: ["Jobs"],
    }),

    deleteJob: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/jobs/${id}`, method: "delete" }),
      transformResponse: () => ({ success: true }),
      invalidatesTags: ["Jobs"],
    }),

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
