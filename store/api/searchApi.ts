import { baseApi } from "./baseApi";

type GlobalSearchResponse = {
  jobs: Array<{ _id: string; title: string; status: string; requirements?: { domain?: string; location?: string } }>;
  applicants: Array<{
    _id: string;
    jobId: string;
    jobTitle?: string;
    status: string;
    source: string;
    profile: { firstName?: string; lastName?: string; email?: string; title?: string };
  }>;
  screenings: Array<{ _id: string; jobId: string; status: string; createdAt: string }>;
  notifications: Array<{ _id: string; title: string; message: string; readAt?: string; createdAt: string }>;
};

export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    globalSearch: builder.query<GlobalSearchResponse, { q: string; limit?: number }>({
      query: ({ q, limit = 5 }) => ({ url: "/search/global", method: "get", params: { q, limit } }),
    }),
  }),
});

export const { useGlobalSearchQuery } = searchApi;
