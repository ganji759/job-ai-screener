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

export const screeningsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Not in backend — returns empty list gracefully
    getScreenings: builder.query<
      { screenings: ScreeningListItem[] },
      { status?: string; date?: string; search?: string; sort?: string } | void
    >({
      query: () => ({ url: "/screenings", method: "get" }),
      transformResponse: (raw: unknown): { screenings: ScreeningListItem[] } => {
        const rows = Array.isArray(raw) ? raw : [];
        const screenings = rows.map((item): ScreeningListItem => {
          const r = item as Record<string, unknown>;
          const status = String(r.status ?? "");
          const display =
            (r.displayStatus as ScreeningListItem["displayStatus"]) ??
            (status === "completed" ? "completed" : status === "failed" ? "failed" : "running");
          const uiStatus = ((): ScreeningListItem["status"] => {
            if (status === "completed") return "completed";
            if (status === "failed") return "failed";
            if (status === "queued" || status === "running") return "running";
            return "pending";
          })();
          return {
            _id: String(r._id),
            jobId: String(r.jobId),
            jobTitle: String(r.jobTitle ?? ""),
            jobDomain: String(r.jobDomain ?? ""),
            status: uiStatus,
            displayStatus: display,
            totalAnalyzed: Number(r.totalAnalyzed ?? 0),
            shortlistedCount: Number(r.shortlistedCount ?? 0),
            averageScore: Number(r.averageScore ?? 0),
            createdAt: String(r.createdAt ?? ""),
            updatedAt: String(r.updatedAt ?? ""),
            durationMs: r.durationMs != null ? Number(r.durationMs) : undefined,
            results: r.results as ScreeningListItem["results"],
          };
        });
        return { screenings };
      },
      providesTags: ["Screenings"],
    }),

    // POST /api/jobs/:jobId/screenings — trigger a new screening run
    runScreening: builder.mutation<{ screeningId: string; status: string; message: string }, RunScreeningPayload>({
      query: ({ jobId }) => ({ url: `/jobs/${jobId}/screenings`, method: "post", data: {} }),
      transformResponse: (raw: unknown) => {
        const env = raw as RunEnvelope | Record<string, unknown>;
        const nested = env && typeof env === "object" && "data" in env ? (env as RunEnvelope).data : undefined;
        const flat = nested
          ? { screeningId: nested._id, status: nested.status }
          : {
              screeningId: (env as Record<string, unknown>).screeningId,
              status: (env as Record<string, unknown>).status,
            };
        return {
          screeningId: String(flat.screeningId ?? ""),
          status: normalizeStatus(String(flat.status ?? "queued")),
          message: String((env as Record<string, unknown>).message ?? "Screening queued"),
        };
      },
      invalidatesTags: ["Screenings"],
    }),

    // GET /api/screenings/:runId/status — poll run status
    getScreeningStatus: builder.query<
      { screeningId: string; status: string; progress: number; estimatedTimeRemaining: null; error?: string },
      string
    >({
      query: (id) => ({ url: `/screenings/${id}/status`, method: "get" }),
      transformResponse: (raw: unknown, _meta, id: string) => {
        const nested = raw as StatusEnvelope | Record<string, unknown>;
        const d =
          nested && typeof nested === "object" && "data" in nested && (nested as StatusEnvelope).data
            ? (nested as StatusEnvelope).data
            : (nested as Record<string, unknown>);
        return {
          screeningId: String((d as Record<string, unknown>).screeningId ?? id),
          status: normalizeStatus(String((d as Record<string, unknown>).status ?? "")),
          progress: Number((d as Record<string, unknown>).progress ?? 0),
          estimatedTimeRemaining: null,
          error: (d as Record<string, unknown>).error != null ? String((d as Record<string, unknown>).error) : undefined,
        };
      },
      providesTags: ["Screenings"],
    }),

    // GET /api/v1/screenings/:id/results — ranked shortlist (only when complete)
    getScreeningResults: builder.query<BackendScreeningResults, string>({
      query: (id) => ({ url: `/screenings/${id}/results`, method: "get" }),
      transformResponse: (raw: unknown): BackendScreeningResults => {
        const r = raw as { data?: BackendScreeningResults; ranked?: BackendScreeningResults["ranked"]; meta?: BackendScreeningResults["meta"] };
        if (r?.data?.ranked) return r.data;
        if (Array.isArray(r?.ranked)) return { ranked: r.ranked, meta: r.meta };
        return { ranked: [] };
      },
      providesTags: ["Screenings"],
    }),

    /** POST /api/v1/screenings/platform — sync Umurava-platform applicants */
    runPlatformScreening: builder.mutation<
      { screeningId: string },
      { jobId: string; topN?: 10 | 20; shortlistSize?: 10 | 20; recruiterId?: string }
    >({
      query: (body) => ({ url: "/screenings/platform", method: "post", data: body }),
      transformResponse: (raw: unknown) => {
        const r = raw as Record<string, unknown>;
        return { screeningId: String(r.screeningId ?? "") };
      },
      invalidatesTags: ["Screenings", "Applicants"],
    }),

    /**
     * POST /api/v1/screenings/run-for-job — one-click screening for a single job.
     * Screens ALL pending applicants for the job (any source). Used by the in-job
     * "Run AI Screening" buttons where the recruiter doesn't need to pick a scenario.
     */
    runScreeningForJob: builder.mutation<
      { screeningId: string },
      { jobId: string; shortlistSize?: 10 | 20 }
    >({
      query: (body) => ({ url: "/screenings/run-for-job", method: "post", data: body }),
      transformResponse: (raw: unknown) => {
        const r = raw as Record<string, unknown>;
        return { screeningId: String(r.screeningId ?? "") };
      },
      invalidatesTags: ["Screenings", "Applicants"],
    }),

    /** POST /api/v1/screenings/external — sync CSV/PDF-upload applicants */
    runExternalScreening: builder.mutation<
      { screeningId: string },
      { jobId: string; topN?: 10 | 20; shortlistSize?: 10 | 20; recruiterId?: string }
    >({
      query: (body) => ({ url: "/screenings/external", method: "post", data: body }),
      transformResponse: (raw: unknown) => {
        const r = raw as Record<string, unknown>;
        return { screeningId: String(r.screeningId ?? "") };
      },
      invalidatesTags: ["Screenings", "Applicants"],
    }),

    // Alias for getScreeningStatus — used by RunScreeningModal for polling
    getScreening: builder.query<
      { _id: string; status: string; progress: number; errorMessage?: string; jobId?: string },
      string
    >({
      query: (id) => ({ url: `/screenings/${id}/status`, method: "get" }),
      transformResponse: (raw: unknown, _meta, id: string) => {
        const nested = raw as StatusEnvelope | Record<string, unknown>;
        const d =
          nested && typeof nested === "object" && "data" in nested && (nested as StatusEnvelope).data
            ? (nested as StatusEnvelope).data
            : (nested as Record<string, unknown>);
        return {
          _id: id,
          status: normalizeStatus(String((d as Record<string, unknown>).status ?? "")),
          progress: Number((d as Record<string, unknown>).progress ?? 0),
          errorMessage: (d as Record<string, unknown>).error != null ? String((d as Record<string, unknown>).error) : undefined,
          jobId: undefined,
        };
      },
      providesTags: ["Screenings"],
    }),

    // Not in backend — kept for UI compatibility (will 404 gracefully)
    /**
     * PUT /api/v1/screenings/:id/recruiter-decisions — persist HR accept/reject/review + notes (merged per applicant id).
     */
    saveRecruiterDecisions: builder.mutation<
      { success: boolean; recruiterDecisions: Record<string, { decision: string; hrNote: string; decidedAt?: string; aiLabel?: string }> },
      { id: string; body: Record<string, { decision: string; hrNote: string; decidedAt?: string; aiLabel?: string }> }
    >({
      query: ({ id, body }) => ({
        url: `/screenings/${id}/recruiter-decisions`,
        method: "put",
        data: body,
      }),
      invalidatesTags: ["Screenings"],
    }),

    /** POST /api/v1/screenings/:id/send-acceptance-emails — congrats email to all HR-approved shortlisted candidates */
    sendAcceptanceEmails: builder.mutation<
      { success: boolean; sent: number; skipped: number; errors: string[] },
      { id: string; message: string; subject?: string }
    >({
      query: ({ id, message, subject }) => ({
        url: `/screenings/${id}/send-acceptance-emails`,
        method: "post",
        data: subject ? { message, subject } : { message },
      }),
      invalidatesTags: ["Screenings"],
    }),

    getScreeningExplanations: builder.query<Record<string, unknown>, string>({
      query: (id) => ({ url: `/screenings/${id}/explanations`, method: "get" }),
      providesTags: ["Screenings"],
    }),
    getJobScreenings: builder.query<unknown[], string>({
      query: (jobId) => ({ url: `/screenings/job/${jobId}`, method: "get" }),
      transformResponse: (raw: unknown) => (Array.isArray(raw) ? raw : []),
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

    /** POST /api/v1/screenings/:id/ai-chat — RAG chat about a specific shortlisted candidate */
    candidateAiChat: builder.mutation<
      { reply: string },
      {
        screeningId: string;
        candidateId: string;
        message: string;
        history?: Array<{ role: "user" | "model"; content: string }>;
      }
    >({
      query: ({ screeningId, candidateId, message, history }) => ({
        url: `/screenings/${screeningId}/ai-chat`,
        method: "post",
        data: { candidateId, message, history: history ?? [] },
      }),
    }),

    /** GET /api/v1/screenings/:id/accepted — approved candidates enriched with interview status */
    getAcceptedCandidates: builder.query<
      {
        accepted: Array<{
          applicantId: string;
          decision: { decision: string; hrNote: string; decidedAt: string; aiLabel: string; congratsEmailSentAt?: string };
          applicant: { profile: Record<string, unknown>; source: string };
          shortlistEntry: Record<string, unknown> | null;
          interview: Record<string, unknown> | null;
        }>;
      },
      string
    >({
      query: (id) => ({ url: `/screenings/${id}/accepted`, method: "get" }),
      transformResponse: (raw: unknown) => {
        const r = raw as { data?: { accepted?: unknown[] } };
        return { accepted: (r?.data?.accepted ?? []) } as {
          accepted: Array<{
            applicantId: string;
            decision: { decision: string; hrNote: string; decidedAt: string; aiLabel: string; congratsEmailSentAt?: string };
            applicant: { profile: Record<string, unknown>; source: string };
            shortlistEntry: Record<string, unknown> | null;
            interview: Record<string, unknown> | null;
          }>;
        };
      },
      providesTags: ["Screenings", "Interviews"],
    }),

    /** POST /api/v1/screenings/:id/advisory-chat — cohort-level AI advisory (all candidates) */
    poolAdvisoryChat: builder.mutation<
      { reply: string },
      {
        screeningId: string;
        message: string;
        history?: Array<{ role: "user" | "model"; content: string }>;
      }
    >({
      query: ({ screeningId, message, history }) => ({
        url: `/screenings/${screeningId}/advisory-chat`,
        method: "post",
        data: { message, history: history ?? [] },
      }),
    }),
  }),
});

export const {
  useGetAcceptedCandidatesQuery,
  useGetScreeningsQuery,
  useRunScreeningMutation,
  useRunScreeningForJobMutation,
  useRunPlatformScreeningMutation,
  useRunExternalScreeningMutation,
  useGetScreeningQuery,
  useGetScreeningStatusQuery,
  useGetScreeningResultsQuery,
  useSaveRecruiterDecisionsMutation,
  useSendAcceptanceEmailsMutation,
  useGetScreeningExplanationsQuery,
  useGetJobScreeningsQuery,
  useExportScreeningMutation,
  useExportScreeningExplanationsMutation,
  useCompareApplicantsMutation,
  useDeleteScreeningMutation,
  useSubmitFeedbackMutation,
  useGetDashboardAnalyticsQuery,
  useCandidateAiChatMutation,
  usePoolAdvisoryChatMutation,
} = screeningsApi;
