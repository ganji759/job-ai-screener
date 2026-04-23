/** Resolve API origin for axios; accepts full `/api` URL or bare `http://localhost:3001`. */
export function resolveApiBaseUrl(): string {
  const fromUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const fromBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const raw = fromUrl || fromBase || "http://localhost:3001/api/v1";
  const noTrailing = raw.replace(/\/+$/, "");
  // Bare origin (no path) — append backend API v1 prefix
  if (/^https?:\/\/[^/]+$/.test(noTrailing)) {
    return `${noTrailing}/api/v1`;
  }
  return noTrailing;
}
