import { baseApi } from "./baseApi";

export const calendarApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCalendarStatus: builder.query<{ connected: boolean; configured: boolean }, void>({
      query: () => ({ url: "/auth/google/status", method: "get" }),
      transformResponse: (raw: unknown) => {
        const r = raw as { connected?: boolean; configured?: boolean };
        return { connected: r?.connected ?? false, configured: r?.configured ?? false };
      },
      providesTags: ["GoogleCalendar"],
    }),

    getCalendarAuthUrl: builder.query<{ url: string }, void>({
      query: () => ({ url: "/auth/google/url", method: "get" }),
    }),

    disconnectCalendar: builder.mutation<{ disconnected: boolean }, void>({
      query: () => ({ url: "/auth/google/disconnect", method: "delete" }),
      invalidatesTags: ["GoogleCalendar"],
    }),
  }),
});

export const {
  useGetCalendarStatusQuery,
  useGetCalendarAuthUrlQuery,
  useDisconnectCalendarMutation,
} = calendarApi;
