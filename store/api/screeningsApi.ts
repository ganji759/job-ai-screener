import { baseApi } from "./baseApi";

export const screeningsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    runScreening: builder.mutation<{ screeningId: string; status: string; message: string }, { jobId: string; shortlistSize: 10 | 20 }>({
      query: (body) => ({ url: "/screenings/run", method: "post", data: body }),
      invalidatesTags: ["Screenings"],
    }),
    getScreening: builder.query<Record<string, unknown>, string>({ query: (id) => ({ url: `/screenings/${id}`, method: "get" }), providesTags: ["Screenings"] }),
    getScreeningExplanations: builder.query<Record<string, unknown>, string>({ query: (id) => ({ url: `/screenings/${id}/explanations`, method: "get" }), providesTags: ["Screenings"] }),
    getScreeningStatus: builder.query<Record<string, unknown>, string>({ query: (id) => ({ url: `/screenings/${id}/status`, method: "get" }), providesTags: ["Screenings"] }),
    getJobScreenings: builder.query<Record<string, unknown>[], string>({ query: (jobId) => ({ url: `/screenings/job/${jobId}`, method: "get" }), providesTags: ["Screenings"] }),
    exportScreening: builder.mutation<Blob, string>({ query: (id) => ({ url: `/screenings/${id}/export`, method: "post", responseType: "blob" }) }),
    exportScreeningExplanations: builder.mutation<Blob, string>({ query: (id) => ({ url: `/screenings/${id}/explanations/export`, method: "get", responseType: "blob" }) }),
    compareApplicants: builder.mutation<Record<string, unknown>, { id: string; candidateIds: string[] }>({ query: ({ id, candidateIds }) => ({ url: `/screenings/${id}/compare`, method: "post", data: { candidateIds } }) }),
    deleteScreening: builder.mutation<{ deleted: boolean }, string>({ query: (id) => ({ url: `/screenings/${id}`, method: "delete" }), invalidatesTags: ["Screenings"] }),
    submitFeedback: builder.mutation<Record<string, unknown>, { id: string; hired: boolean; feedbackNote?: string }>({ query: ({ id, ...body }) => ({ url: `/candidates/${id}/feedback`, method: "post", data: body }) }),
    getDashboardAnalytics: builder.query<Record<string, unknown>, void>({ query: () => ({ url: "/dashboard/analytics", method: "get" }), providesTags: ["Dashboard"] }),
  }),
});

export const { useRunScreeningMutation, useGetScreeningQuery, useGetScreeningExplanationsQuery, useGetScreeningStatusQuery, useGetJobScreeningsQuery, useExportScreeningMutation, useExportScreeningExplanationsMutation, useCompareApplicantsMutation, useDeleteScreeningMutation, useSubmitFeedbackMutation, useGetDashboardAnalyticsQuery } = screeningsApi;
