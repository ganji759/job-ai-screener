import { mapUmuravaProfileForIngest } from "../../lib/mapUmuravaProfileForIngest";
import { baseApi } from "./baseApi";
import type { Applicant, UmuravaProfile } from "../../types";

export type ListApplicantsResponse = {
  applicants: Applicant[];
  total: number;
  page: number;
  totalPages: number;
};

export type IngestApplicantsResponse = {
  inserted: number;
  failed: number;
  errors: Array<{ index: number; message: string }>;
};

export type UploadApplicantsResponse = {
  inserted: number;
  failed: number;
  errors: unknown[];
  previewProfiles?: unknown[];
};

export const applicantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApplicants: builder.query<
      ListApplicantsResponse,
      { jobId: string; page?: number; limit?: number; status?: string; source?: string }
    >({
      query: (params) => ({ url: "/applicants", method: "get", params }),
      providesTags: ["Applicants"],
    }),
    getApplicant: builder.query<Applicant, string>({
      query: (id) => ({ url: `/applicants/${id}`, method: "get" }),
      providesTags: (_result, _err, id) => [{ type: "Applicants", id }],
    }),
    ingestProfiles: builder.mutation<IngestApplicantsResponse, { jobId: string; profiles: UmuravaProfile[] }>({
      query: ({ jobId, profiles }) => ({
        url: "/applicants/ingest",
        method: "post",
        data: { jobId, profiles: profiles.map((p) => mapUmuravaProfileForIngest(p)) },
      }),
      invalidatesTags: ["Applicants"],
    }),
    uploadFiles: builder.mutation<UploadApplicantsResponse, FormData>({
      query: (formData) => ({
        url: "/applicants/upload",
        method: "post",
        data: formData,
      }),
      invalidatesTags: ["Applicants"],
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
  useDeleteApplicantMutation,
  useBulkDeleteMutation,
  useEnhanceProfileMutation,
} = applicantsApi;
