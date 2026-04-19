import { baseApi } from "./baseApi";
import type { Job, JobRequirements } from "../../types";

interface GetJobsParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type CreateJobPayload = {
  title: string;
  description: string;
  location: string;
  employmentType: Job["employmentType"];
  status: "draft" | "active";
  requirements: JobRequirements;
};

export type PatchJobPayload = Partial<Pick<Job, "title" | "description" | "location" | "employmentType" | "status">> & {
  requirements?: Partial<JobRequirements>;
};

export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<{ jobs: Job[]; total: number; page: number; totalPages: number }, GetJobsParams | void>({
      query: (params) => ({ url: "/jobs", method: "get", params }),
      providesTags: ["Jobs"],
    }),
    getJob: builder.query<Job, string>({ query: (id) => ({ url: `/jobs/${id}`, method: "get" }), providesTags: ["Jobs"] }),
    createJob: builder.mutation<Job, CreateJobPayload>({
      query: (body) => ({ url: "/jobs", method: "post", data: body }),
      invalidatesTags: ["Jobs"],
    }),
    updateJob: builder.mutation<Job, { id: string; body: PatchJobPayload }>({
      query: ({ id, body }) => ({ url: `/jobs/${id}`, method: "patch", data: body }),
      invalidatesTags: ["Jobs"],
    }),
    deleteJob: builder.mutation<{ success: boolean }, string>({ query: (id) => ({ url: `/jobs/${id}`, method: "delete" }), invalidatesTags: ["Jobs"] }),
    getJobStats: builder.query<Record<string, unknown>, string>({ query: (id) => ({ url: `/jobs/${id}/stats`, method: "get" }), providesTags: ["Jobs"] }),
    getJobBenchmark: builder.query<Record<string, unknown>, string>({ query: (id) => ({ url: `/jobs/${id}/benchmark`, method: "get" }), providesTags: ["Jobs"] }),
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
