import { baseApi } from "./baseApi";
import type { BackendScreeningRun, BackendScreeningStatus, BackendScreeningResults } from "../../types";

/** Normalize backend status values to frontend conventions. */
function normalizeStatus(s: string): string {
  if (s === "complete") return "completed";
  if (s === "pending") return "queued";
  return s;
}

export interface ScreeningListItem {
  _id: string;
  jobId: string;
  jobTitle: string;
  jobDomain: string;
  status: "pending" | "running" | "completed" | "failed";
  displayStatus: "running" | "completed" | "failed";
  totalAnalyzed: number;
  shortlistedCount: number;
  averageScore: number;
  createdAt: string;
  updatedAt: string;
  durationMs?: number;
  results?: {
    shortlist?: unknown[];
    averageScore: number;
    topSkillsFound: string[];
    skillGapsInPool: string[];
  };
}

export type RunScreeningPayload = {
  jobId: string;
  shortlistSize?: 10 | 20;
  weights?: { skills: number; experience: number; education: number };
};

type RunEnvelope = { data: BackendScreeningRun; error: null };
type StatusEnvelope = { data: BackendScreeningStatus; error: null };
type ResultsEnvelope = { data: BackendScreeningResults; error: null };

export const screeningsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Not in backend — returns empty list gracefully
    getScreenings: builder.query<
      { screenings: ScreeningListItem[] },
      { status?: string; date?: string; search?: string; sort?: string } | void
    >({
      query: () => ({ url: "/screenings", method: "get" }),
      transformResponse: () => ({ screenings: [] }),
      providesTags: ["Screenings"],
    }),

    // POST /api/jobs/:jobId/screenings — trigger a new screening run
    runScreening: builder.mutation<{ screeningId: string; status: string; message: string }, RunScreeningPayload>({
      query: ({ jobId }) => ({ url: `/jobs/${jobId}/screenings`, method: "post", data: {} }),
      transformResponse: (raw: RunEnvelope) => ({
        screeningId: String(raw.data._id),
        status: normalizeStatus(raw.data.status),
        message: "Screening queued",
      }),
      invalidatesTags: ["Screenings"],
    }),

    // GET /api/screenings/:runId/status — poll run status
    getScreeningStatus: builder.query<
      { screeningId: string; status: string; progress: number; estimatedTimeRemaining: null; error?: string },
      string
    >({
      query: (id) => ({ url: `/screenings/${id}/status`, method: "get" }),
      transformResponse: (raw: StatusEnvelope, _meta, id: string) => ({
        screeningId: id,
        status: normalizeStatus(raw.data.status),
        progress: raw.data.progress ?? 0,
        estimatedTimeRemaining: null,
        error: raw.data.error,
      }),
      providesTags: ["Screenings"],
    }),

    // GET /api/screenings/:runId/results — ranked shortlist (only when complete)
    getScreeningResults: builder.query<BackendScreeningResults, string>({
      query: (id) => ({ url: `/screenings/${id}/results`, method: "get" }),
      transformResponse: (raw: ResultsEnvelope) => raw.data,
      providesTags: ["Screenings"],
    }),

    // Alias for getScreeningStatus — used by RunScreeningModal for polling
    getScreening: builder.query<
      { _id: string; status: string; progress: number; errorMessage?: string; jobId?: string },
      string
    >({
      query: (id) => ({ url: `/screenings/${id}/status`, method: "get" }),
      transformResponse: (raw: StatusEnvelope, _meta, id: string) => ({
        _id: id,
        status: normalizeStatus(raw.data.status),
        progress: raw.data.progress ?? 0,
        errorMessage: raw.data.error,
        jobId: undefined,
      }),
      providesTags: ["Screenings"],
    }),

    // Not in backend — kept for UI compatibility (will 404 gracefully)
    getScreeningExplanations: builder.query<Record<string, unknown>, string>({
      query: (id) => ({ url: `/screenings/${id}/explanations`, method: "get" }),
      providesTags: ["Screenings"],
    }),
    getJobScreenings: builder.query<unknown[], string>({
      query: (jobId) => ({ url: `/screenings/job/${jobId}`, method: "get" }),
      transformResponse: () => [],
      providesTags: ["Screenings"],
    }),
    exportScreening: builder.mutation<Blob, { id: string; format?: "pdf" | "csv" }>({
      query: ({ id, format }) => ({
        url: `/screenings/${id}/export`,
        method: "post",
        data: format ? { format } : {},
        responseType: "blob",
      }),
    }),
    exportScreeningExplanations: builder.mutation<Blob, string>({
      query: (id) => ({ url: `/screenings/${id}/explanations/export`, method: "get", responseType: "blob" }),
    }),
    compareApplicants: builder.mutation<Record<string, unknown>, { id: string; candidateIds: string[] }>({
      query: ({ id, candidateIds }) => ({ url: `/screenings/${id}/compare`, method: "post", data: { candidateIds } }),
    }),
    deleteScreening: builder.mutation<{ deleted: boolean }, string>({
      query: (id) => ({ url: `/screenings/${id}`, method: "delete" }),
      invalidatesTags: ["Screenings"],
    }),
    submitFeedback: builder.mutation<Record<string, unknown>, { id: string; hired: boolean; feedbackNote?: string }>({
      query: ({ id, ...body }) => ({ url: `/candidates/${id}/feedback`, method: "post", data: body }),
    }),
    getDashboardAnalytics: builder.query<Record<string, unknown>, void>({
      query: () => ({ url: "/dashboard/analytics", method: "get" }),
      providesTags: ["Dashboard"],
    }),
  }),
});

export const {
  useGetScreeningsQuery,
  useRunScreeningMutation,
  useGetScreeningQuery,
  useGetScreeningStatusQuery,
  useGetScreeningResultsQuery,
  useGetScreeningExplanationsQuery,
  useGetJobScreeningsQuery,
  useExportScreeningMutation,
  useExportScreeningExplanationsMutation,
  useCompareApplicantsMutation,
  useDeleteScreeningMutation,
  useSubmitFeedbackMutation,
  useGetDashboardAnalyticsQuery,
} = screeningsApi;
