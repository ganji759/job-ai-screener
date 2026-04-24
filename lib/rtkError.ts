/** Extract user-facing message from RTK Query / Axios base query errors. */
export function getRtkQueryErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error || typeof error !== "object") return fallback;
  const e = error as {
    data?: unknown;
    error?: string | { data?: { error?: string; message?: string; details?: unknown } };
    message?: string;
    status?: number;
  };

  const data = e.data as
    | { error?: string; message?: string; details?: { path: (string | number)[]; message: string }[] | Array<{ path?: (string | number)[]; message: string }> }
    | string
    | undefined;
  if (typeof data === "string" && data.trim().length > 0) {
    if (!data.startsWith("<!DOCTYPE") && !data.startsWith("<html")) {
      return data.length > 400 ? data.slice(0, 400) + "…" : data;
    }
  }
  if (data != null && typeof data === "object" && Array.isArray((data as { details?: unknown }).details) && (data as { details: Array<{ path?: (string | number)[]; message: string }> }).details.length > 0) {
    const dets = (data as { details: Array<{ path?: (string | number)[]; message: string }> }).details;
    return dets
      .map((d) => (Array.isArray(d.path) && d.path.length > 0 ? `${d.path.join(".")}: ` : "") + (d.message || ""))
      .filter(Boolean)
      .join(" · ");
  }
  if (data != null && typeof data === "object" && typeof (data as { message?: string }).message === "string") {
    return (data as { message: string }).message;
  }
  if (data != null && typeof data === "object" && typeof (data as { error?: string }).error === "string") {
    return (data as { error: string }).error;
  }

  if (typeof e.error === "string") return e.error;
  if (e.error && typeof e.error === "object") {
    const nested = e.error.data as { error?: string; message?: string } | undefined;
    if (typeof nested?.message === "string") return nested.message;
    if (typeof nested?.error === "string") return nested.error;
  }

  if (typeof e.message === "string" && e.message.trim() && e.message.length < 500) {
    if (!/^Request failed with status code \d+$/i.test(e.message) && !e.message.toLowerCase().includes("rejected with")) {
      return e.message;
    }
  }
  return fallback;
}
