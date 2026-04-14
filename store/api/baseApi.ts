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
  async ({ url, method = "get", data, params, responseType }) => {
    try {
      const result = await axiosInstance({ url, method, data, params, responseType });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError as AxiosError<{ error?: string }>;
      return { error: { status: err.response?.status, data: err.response?.data ?? err.message } };
    }
  };

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["Jobs", "Applicants", "Screenings", "Dashboard", "Notifications"],
  refetchOnFocus: true,
  endpoints: () => ({}),
});
