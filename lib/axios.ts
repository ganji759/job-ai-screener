import axios from "axios";
import { clearToken, getToken } from "./auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export const axiosInstance = axios.create({
  baseURL: apiUrl,
  timeout: 30000,
});

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  const url = String(config.url ?? "");
  const publicAuthRoute =
    url.startsWith("/auth/login") ||
    url.startsWith("/auth/register") ||
    url.startsWith("/auth/otp/send") ||
    url.startsWith("/auth/otp/verify") ||
    url.startsWith("/auth/refresh");

  if (token && !publicAuthRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    // Keep console quieter for expected client/business responses (400/401/404/409)
    if (!status || status >= 500) {
      console.error("API error", { status, url: error?.config?.url, message: error?.message });
    }
    return Promise.reject(error);
  },
);
