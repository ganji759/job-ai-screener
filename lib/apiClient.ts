import { clearToken, getToken } from "./auth";
import type { Job, UmuravaProfile } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(path: string, init: RequestInit = {}, retries = 2): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
    if (response.status === 401) {
      clearToken();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
      throw new Error(errorPayload.error ?? "Request failed");
    }
    if (response.headers.get("content-type")?.includes("application/pdf")) return (await response.blob()) as T;
    return (await response.json()) as T;
  } catch (error) {
    if (retries > 0) {
      await sleep(1000);
      return request<T>(path, init, retries - 1);
    }
    throw error;
  }
}

export const api = {
  auth: {
    login: (email: string, password: string) => request<{ token?: string; requiresOtp?: boolean }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    register: (name: string, email: string, password: string) => request<{ token: string }>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
    me: () => request("/auth/me"),
    updateProfile: (data: Record<string, unknown>) => request("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
  },
  jobs: {
    list: (params?: Record<string, string | number>) => request<{ jobs: Job[]; total: number; page: number; totalPages: number }>(`/jobs?${new URLSearchParams((params ?? {}) as Record<string, string>).toString()}`),
    get: (id: string) => request<Job>(`/jobs/${id}`),
    create: (data: Partial<Job>) => request<Job>("/jobs", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Job>) => request<Job>(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/jobs/${id}`, { method: "DELETE" }),
    stats: (id: string) => request(`/jobs/${id}/stats`),
    benchmark: (id: string) => request(`/jobs/${id}/benchmark`),
  },
  applicants: {
    list: (jobId: string, params?: Record<string, string | number>) =>
      request(`/applicants?${new URLSearchParams({ jobId, ...(params as Record<string, string>) }).toString()}`),
    ingest: (jobId: string, profiles: UmuravaProfile[]) => request("/applicants/ingest", { method: "POST", body: JSON.stringify({ jobId, profiles }) }),
    uploadCSV: (jobId: string, file: File) => {
      const form = new FormData();
      form.append("jobId", jobId);
      form.append("fileType", "csv");
      form.append("files", file);
      return request("/applicants/upload", { method: "POST", body: form });
    },
    uploadPDFs: (jobId: string, files: File[]) => {
      const form = new FormData();
      form.append("jobId", jobId);
      form.append("fileType", "pdf");
      files.forEach((f) => form.append("files", f));
      return request("/applicants/upload", { method: "POST", body: form });
    },
    delete: (id: string) => request(`/applicants/${id}`, { method: "DELETE" }),
    enhance: (id: string) => request(`/applicants/${id}/enhance`, { method: "POST" }),
    feedback: (id: string, data: Record<string, unknown>) => request(`/candidates/${id}/feedback`, { method: "POST", body: JSON.stringify(data) }),
  },
  screenings: {
    run: (jobId: string, shortlistSize: 10 | 20) => request("/screenings/run", { method: "POST", body: JSON.stringify({ jobId, shortlistSize }) }),
    get: (id: string) => request(`/screenings/${id}`),
    getStatus: (id: string) => request(`/screenings/${id}/status`),
    getByJob: (jobId: string) => request(`/screenings/job/${jobId}`),
    compare: (id: string, candidateIds: string[]) => request(`/screenings/${id}/compare`, { method: "POST", body: JSON.stringify({ candidateIds }) }),
    export: (id: string) => request<Blob>(`/screenings/${id}/export`, { method: "POST" }),
    delete: (id: string) => request(`/screenings/${id}`, { method: "DELETE" }),
  },
  analytics: {
    getDashboard: () => request("/dashboard/analytics"),
  },
};
