import { baseApi } from "./baseApi";
import type { Applicant, UmuravaProfile } from "../../types";

export const applicantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApplicants: builder.query<{ applicants: Applicant[]; total: number; page: number; totalPages: number }, { jobId: string; status?: string; source?: string; page?: number; limit?: number }>({
      query: (params) => ({ url: "/applicants", method: "get", params }),
      providesTags: ["Applicants"],
    }),
    ingestProfiles: builder.mutation<{ inserted: number; failed: number }, { jobId: string; profiles: UmuravaProfile[] }>({
      query: (body) => ({ url: "/applicants/ingest", method: "post", data: body }),
      invalidatesTags: ["Applicants"],
    }),
    uploadFiles: builder.mutation<Record<string, unknown>, FormData>({
      query: (formData) => ({ url: "/applicants/upload", method: "post", data: formData }),
      invalidatesTags: ["Applicants"],
    }),
    deleteApplicant: builder.mutation<{ deleted: number }, string>({ query: (id) => ({ url: `/applicants/${id}`, method: "delete" }), invalidatesTags: ["Applicants"] }),
    bulkDelete: builder.mutation<{ deleted: number }, { jobId: string; applicantIds?: string[] }>({ query: (body) => ({ url: "/applicants/bulk-delete", method: "post", data: body }), invalidatesTags: ["Applicants"] }),
    enhanceProfile: builder.mutation<Record<string, unknown>, string>({ query: (id) => ({ url: `/applicants/${id}/enhance`, method: "post" }), invalidatesTags: ["Applicants"] }),
  }),
});

export const { useGetApplicantsQuery, useIngestProfilesMutation, useUploadFilesMutation, useDeleteApplicantMutation, useBulkDeleteMutation, useEnhanceProfileMutation } = applicantsApi;
