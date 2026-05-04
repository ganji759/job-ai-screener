import { createApi } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { axiosInstance } from "../../lib/axios";

interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig["method"];
  data?: unknown;
  params?: unknown;
  responseType?: AxiosRequestConfig["responseType"];
}

const axiosBaseQuery = (): BaseQueryFn<AxiosBaseQueryArgs, unknown, unknown> =>
  async ({ url, method = "get", data, params, responseType }, api) => {
    try {
      const result = await axiosInstance({ url, method, data, params, responseType, signal: api.signal });
      if (responseType === "blob") return { data: result.data };
      // If a payload includes both `error` and `success: true` (e.g. proxy), treat as success.
      const body = result.data as { data?: unknown; error?: unknown; success?: boolean } | null;
      const errFlag = body != null && typeof body === "object" && (body as { error?: unknown }).error;
      if (errFlag && (body as { success?: boolean }).success !== true) {
        return { error: { status: "CUSTOM_ERROR", data: (body as { error: unknown }).error } };
      }
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError as AxiosError<{ error?: string }>;
      return { error: { status: err.response?.status, data: err.response?.data ?? err.message } };
    }
  };

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["Jobs", "Applicants", "Screenings", "Dashboard", "Notifications", "Interviews", "GoogleCalendar"],
  refetchOnFocus: true,
  endpoints: () => ({}),
});
