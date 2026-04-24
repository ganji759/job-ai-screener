import { baseApi } from "./baseApi";

type GlobalSearchResponse = {
  jobs: Array<{
    _id: string;
    title: string;
    status: string;
    requirements?: { domain?: string; location?: string };
  }>;
  applicants: Array<{
    _id: string;
    jobId: string;
    jobTitle?: string;
    status: string;
    source: string;
    profile: {
      firstName?: string;
      lastName?: string;
      email?: string;
      title?: string;
    };
  }>;
  screenings: Array<{
    _id: string;
    jobId: string;
    status: string;
    createdAt: string;
  }>;
  notifications: Array<{
    _id: string;
    title: string;
    message: string;
    readAt?: string;
    createdAt: string;
  }>;
};

type RawJob = {
  _id: string;
  title?: string;
  status?: string;
  requirements?: { domain?: string; location?: string };
};

type RawApplicant = {
  _id: string;
  jobId?: string;
  jobTitle?: string;
  status?: string;
  source?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    title?: string;
  };
};

type RawNotification = {
  _id: string;
  title?: string;
  message?: string;
  readAt?: string;
  createdAt?: string;
};

const matches = (haystack: string | undefined, needle: string) =>
  !!haystack && haystack.toLowerCase().includes(needle);

/**
 * Backend has no `/search/global`. We fan out to jobs, applicants, and notifications,
 * filter locally by the query string, and return a unified payload.
 */
export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    globalSearch: builder.query<GlobalSearchResponse, { q: string; limit?: number }>({
      async queryFn({ q, limit = 5 }, _api, _extra, baseQuery) {
        const term = q.trim().toLowerCase();
        if (!term) {
          return {
            data: { jobs: [], applicants: [], screenings: [], notifications: [] },
          };
        }

        const [jobsRes, applicantsRes, notificationsRes] = await Promise.all([
          baseQuery({ url: "/jobs", method: "get", params: { limit: 100, offset: 0 } }),
          baseQuery({
            url: "/applicants",
            method: "get",
            params: { jobId: "all", limit: 200, offset: 0 },
          }),
          baseQuery({
            url: "/notifications",
            method: "get",
            params: { page: 1, limit: 50 },
          }),
        ]);

        const jobsBody = (jobsRes.data as { data?: RawJob[]; jobs?: RawJob[] }) ?? {};
        const applicantsBody =
          (applicantsRes.data as {
            applicants?: RawApplicant[];
            data?: RawApplicant[];
          }) ?? {};
        const notificationsBody =
          (notificationsRes.data as { notifications?: RawNotification[] }) ?? {};

        const jobsRaw = jobsBody.data ?? jobsBody.jobs ?? [];
        const applicantsRaw = applicantsBody.applicants ?? applicantsBody.data ?? [];
        const notificationsRaw = notificationsBody.notifications ?? [];

        const jobs = jobsRaw
          .filter(
            (j) =>
              matches(j.title, term) ||
              matches(j.requirements?.domain, term) ||
              matches(j.requirements?.location, term),
          )
          .slice(0, limit)
          .map((j) => ({
            _id: j._id,
            title: j.title ?? "",
            status: j.status ?? "unknown",
            requirements: j.requirements,
          }));

        const applicants = applicantsRaw
          .filter((a) => {
            const p = a.profile ?? {};
            const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
            return (
              matches(name, term) ||
              matches(p.email, term) ||
              matches(p.title, term) ||
              matches(a.jobTitle, term)
            );
          })
          .slice(0, limit)
          .map((a) => ({
            _id: a._id,
            jobId: a.jobId ?? "",
            jobTitle: a.jobTitle,
            status: a.status ?? "unknown",
            source: a.source ?? "unknown",
            profile: a.profile ?? {},
          }));

        const notifications = notificationsRaw
          .filter(
            (n) => matches(n.title, term) || matches(n.message, term),
          )
          .slice(0, limit)
          .map((n) => ({
            _id: n._id,
            title: n.title ?? "",
            message: n.message ?? "",
            readAt: n.readAt,
            createdAt: n.createdAt ?? new Date().toISOString(),
          }));

        return {
          data: {
            jobs,
            applicants,
            screenings: [],
            notifications,
          },
        };
      },
    }),
  }),
});

export const { useGlobalSearchQuery } = searchApi;
