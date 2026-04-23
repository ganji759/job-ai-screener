/** Extract user-facing message from RTK Query / Axios base query errors. */
export function getRtkQueryErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error || typeof error !== "object") return fallback;
  const e = error as { data?: unknown; error?: string; status?: number };
  const data = e.data as { error?: string; message?: string; details?: { path: (string | number)[]; message: string }[] } | undefined;
  if (Array.isArray(data?.details) && data.details.length > 0) {
    return data.details.map((d) => d.message).join(" · ");
  }
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof e.error === "string") return e.error;
  return fallback;
}
