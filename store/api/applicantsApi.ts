import { mapUmuravaProfileForIngest } from "../../lib/mapUmuravaProfileForIngest";
import { baseApi } from "./baseApi";
import type { Applicant, BackendApplicant, UmuravaProfile } from "../../types";

/** Adapt a backend applicant document to the frontend Applicant shape. */
function adaptBackendApplicant(a: BackendApplicant): Applicant {
  const nameParts = (a.parsed_profile?.name ?? "Unknown Candidate").split(" ");
  const firstName = nameParts[0] ?? "Unknown";
  const lastName = nameParts.slice(1).join(" ") || "";
  const sourceMap: Record<string, Applicant["source"]> = {
    umurava_platform: "umurava_platform",
    upload_csv: "csv_upload",
    resume_pdf: "pdf_upload",
  };
  return {
    _id: String(a._id),
    jobId: String(a.job_id),
    source: sourceMap[a.source] ?? "umurava_platform",
    profile: {
      id: String(a._id),
      firstName,
      lastName,
      email: "",
      title: a.parsed_profile?.summary?.slice(0, 60) ?? "",
      skills: a.parsed_profile?.skills ?? [],
      experienceYears: a.parsed_profile?.experience_years,
      education: a.parsed_profile?.education,
    },
    status: "pending",
    createdAt: a.createdAt ?? new Date().toISOString(),
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

type ApplicantListEnvelope = {
  data: BackendApplicant[];
  error: null;
  meta: { total: number; limit: number; offset: number };
};

type ApplicantArrayEnvelope = { data: BackendApplicant[]; error: null };

export const applicantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApplicants: builder.query<
      ListApplicantsResponse,
      { jobId: string; page?: number; limit?: number; status?: string; source?: string }
    >({
      query: ({ jobId, page = 1, limit = 100 }) => {
        const offset = (page - 1) * limit;
        return { url: `/jobs/${jobId}/applicants`, method: "get", params: { limit, offset } };
      },
      transformResponse: (raw: ApplicantListEnvelope) => {
        const total = raw.meta?.total ?? raw.data?.length ?? 0;
        const limit = raw.meta?.limit ?? 100;
        return {
          applicants: (raw.data ?? []).map(adaptBackendApplicant),
          total,
          page: 1,
          totalPages: Math.ceil(total / Math.max(limit, 1)),
        };
      },
      providesTags: ["Applicants"],
    }),

    ingestProfiles: builder.mutation<IngestApplicantsResponse, { jobId: string; profiles: UmuravaProfile[] }>({
      query: ({ jobId, profiles }) => ({
        url: `/jobs/${jobId}/applicants`,
        method: "post",
        data: { profiles: profiles.map(mapUmuravaProfileForIngest) },
      }),
      transformResponse: (raw: ApplicantArrayEnvelope) => ({
        inserted: raw.data?.length ?? 0,
        failed: 0,
        errors: [],
      }),
      invalidatesTags: ["Applicants"],
    }),

    uploadFiles: builder.mutation<UploadApplicantsResponse, { jobId: string; formData: FormData }>({
      query: ({ jobId, formData }) => ({
        url: `/jobs/${jobId}/applicants/upload`,
        method: "post",
        data: formData,
      }),
      transformResponse: (raw: ApplicantArrayEnvelope) => ({
        inserted: raw.data?.length ?? 0,
        failed: 0,
        errors: [],
      }),
      invalidatesTags: ["Applicants"],
    }),

    // Not in backend — kept for UI compatibility
    getApplicant: builder.query<Applicant, string>({
      query: (id) => ({ url: `/applicants/${id}`, method: "get" }),
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
  useDeleteApplicantMutation,
  useBulkDeleteMutation,
  useEnhanceProfileMutation,
} = applicantsApi;
