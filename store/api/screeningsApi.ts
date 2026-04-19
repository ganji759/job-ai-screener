import { baseApi } from "./baseApi";
import type { Screening } from "../../types";

/** Enriched row from GET /api/v1/screenings */
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
  /** Present on some analytics joins */
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
  shortlistSize: 10 | 20;
  weights?: { skills: number; experience: number; education: number };
};

export const screeningsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getScreenings: builder.query<
      { screenings: ScreeningListItem[] },
      { status?: string; date?: string; search?: string; sort?: string } | void
    >({
      query: (params) => ({ url: "/screenings", method: "get", params: params ?? {} }),
      providesTags: ["Screenings"],
    }),
    runScreening: builder.mutation<{ screeningId: string; status: string; message: string }, RunScreeningPayload>({
      query: (body) => ({ url: "/screenings/run", method: "post", data: body }),
      invalidatesTags: ["Screenings"],
    }),
    getScreening: builder.query<Screening, string>({
      query: (id) => ({ url: `/screenings/${id}`, method: "get" }),
      providesTags: ["Screenings"],
    }),
    getScreeningExplanations: builder.query<Record<string, unknown>, string>({
      query: (id) => ({ url: `/screenings/${id}/explanations`, method: "get" }),
      providesTags: ["Screenings"],
    }),
    getScreeningStatus: builder.query<
      { screeningId: string; status: string; progress?: unknown; estimatedTimeRemaining: null },
      string
    >({
      query: (id) => ({ url: `/screenings/${id}/status`, method: "get" }),
      providesTags: ["Screenings"],
    }),
    getJobScreenings: builder.query<Screening[], string>({
      query: (jobId) => ({ url: `/screenings/job/${jobId}`, method: "get" }),
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
    compareApplicants: builder.mutation<
      Record<string, unknown>,
      { id: string; candidateIds: string[] }
    >({
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
  useGetScreeningExplanationsQuery,
  useGetScreeningStatusQuery,
  useGetJobScreeningsQuery,
  useExportScreeningMutation,
  useExportScreeningExplanationsMutation,
  useCompareApplicantsMutation,
  useDeleteScreeningMutation,
  useSubmitFeedbackMutation,
  useGetDashboardAnalyticsQuery,
} = screeningsApi;
