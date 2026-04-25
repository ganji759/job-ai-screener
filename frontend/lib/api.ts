"use client";

import { resolveApiBaseUrl } from "./resolveApiBaseUrl";

export const API_BASE_URL = resolveApiBaseUrl();
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:3001/ws/notifications";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const getAuthToken = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("umurava_token") ?? "";
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("umurava_token", token);
  document.cookie = `umurava_token=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
};

export const clearAuthToken = (): void => {
  localStorage.removeItem("umurava_token");
  document.cookie = "umurava_token=; Path=/; Max-Age=0; SameSite=Lax";
};

export const apiRequest = async <T>(path: string, method: ApiMethod = "GET", body?: unknown): Promise<T> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({ error: "Request failed." }));
    throw new Error(errorPayload.error ?? "Request failed.");
  }
  return response.json() as Promise<T>;
};

export const getNotificationsSocketUrl = (): string => {
  const token = getAuthToken();
  return `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;
};
