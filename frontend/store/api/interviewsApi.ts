import { baseApi } from "./baseApi";

export type InterviewType = "video" | "phone" | "in-person";
export type InterviewStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface InterviewSlot {
  start: string;
  end: string;
}

export interface Interview {
  _id: string;
  candidateId: string;
  applicantId: string;
  jobId: string;
  screeningId: string;
  recruiterId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  title: string;
  type: InterviewType;
  status: InterviewStatus;
  proposedSlots: InterviewSlot[];
  confirmedSlot?: InterviewSlot;
  meetingLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewPayload {
  candidateId: string;
  applicantId: string;
  jobId: string;
  screeningId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  title: string;
  type: InterviewType;
  proposedSlots: InterviewSlot[];
  meetingLink?: string;
  notes?: string;
}

export interface UpdateInterviewPayload {
  id: string;
  status?: InterviewStatus;
  confirmedSlot?: InterviewSlot;
  meetingLink?: string;
  notes?: string;
}

const unwrap = (raw: unknown): unknown => {
  const r = raw as Record<string, unknown>;
  return r?.data ?? r;
};

export const interviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInterviews: builder.query<
      { interviews: Interview[]; total: number; page: number; limit: number },
      { screeningId?: string; status?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: "/interviews",
        method: "get",
        params: params ?? {},
      }),
      transformResponse: (raw: unknown) => {
        const d = unwrap(raw) as { interviews?: Interview[]; total?: number; page?: number; limit?: number };
        return {
          interviews: d?.interviews ?? [],
          total: d?.total ?? 0,
          page: d?.page ?? 1,
          limit: d?.limit ?? 20,
        };
      },
      providesTags: ["Interviews"],
    }),

    getScreeningInterviews: builder.query<Interview[], string>({
      query: (screeningId) => ({ url: `/screenings/${screeningId}/interviews`, method: "get" }),
      transformResponse: (raw: unknown) => {
        const d = unwrap(raw) as { interviews?: Interview[] };
        return d?.interviews ?? [];
      },
      providesTags: ["Interviews"],
    }),

    createInterview: builder.mutation<Interview, CreateInterviewPayload>({
      query: (body) => ({ url: "/interviews", method: "post", data: body }),
      transformResponse: (raw: unknown) => unwrap(raw) as Interview,
      invalidatesTags: ["Interviews"],
    }),

    updateInterview: builder.mutation<Interview, UpdateInterviewPayload>({
      query: ({ id, ...body }) => ({ url: `/interviews/${id}`, method: "patch", data: body }),
      transformResponse: (raw: unknown) => unwrap(raw) as Interview,
      invalidatesTags: ["Interviews"],
    }),

    deleteInterview: builder.mutation<{ deleted: boolean }, string>({
      query: (id) => ({ url: `/interviews/${id}`, method: "delete" }),
      invalidatesTags: ["Interviews"],
    }),
  }),
});

export const {
  useGetInterviewsQuery,
  useGetScreeningInterviewsQuery,
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useDeleteInterviewMutation,
} = interviewsApi;
