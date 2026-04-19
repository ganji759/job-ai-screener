import type { Notification } from "../types";

export type NotificationVisualKind =
  | "screening"
  | "shortlist"
  | "screening_failed"
  | "job"
  | "job_closed"
  | "applicant_upload"
  | "system";

const extractIds = (text: string): string[] => [...text.matchAll(/\b([a-f\d]{24})\b/gi)].map((m) => m[1]);

export function classifyNotification(n: Notification): NotificationVisualKind {
  const blob = `${n.title} ${n.message}`.toLowerCase();
  if (blob.includes("login") || blob.includes("otp") || blob.includes("logged in") || blob.includes("password")) {
    return "system";
  }
  if (blob.includes("screening failed") || (n.type === "error" && blob.includes("screening"))) {
    return "screening_failed";
  }
  if (blob.includes("shortlist") && (blob.includes("review") || blob.includes("ready"))) {
    return "shortlist";
  }
  if (blob.includes("screening") && (blob.includes("completed") || blob.includes("shortlisted"))) {
    return "screening";
  }
  if (blob.includes("upload") || blob.includes("ingested") || blob.includes("applicant")) {
    return "applicant_upload";
  }
  if (blob.includes("closed")) {
    return "job_closed";
  }
  if (blob.includes("job") && (blob.includes("active") || blob.includes("created"))) {
    return "job";
  }
  if (blob.includes("job")) {
    return "job";
  }
  if (n.channel === "system") {
    return "system";
  }
  return "system";
}

export function notificationMatchesTab(
  n: Notification,
  tab: "all" | "unread" | "screenings" | "jobs" | "system",
  isUnreadFn: (id: string, readAt?: string) => boolean,
): boolean {
  const unread = isUnreadFn(n._id, n.readAt);
  if (tab === "unread") return unread;

  const kind = classifyNotification(n);
  if (tab === "all") return true;
  if (tab === "screenings") {
    return kind === "screening" || kind === "shortlist" || kind === "screening_failed";
  }
  if (tab === "jobs") {
    return kind === "job" || kind === "job_closed";
  }
  if (tab === "system") {
    return kind === "system";
  }
  return true;
}

export function getNotificationHref(n: Notification): string {
  const meta = n.metadata;
  if (meta?.screeningId && typeof meta.screeningId === "string") {
    return `/screenings/${meta.screeningId}`;
  }
  if (meta?.jobId && typeof meta.jobId === "string") {
    return `/jobs/${meta.jobId}`;
  }
  const ids = extractIds(`${n.title} ${n.message}`);
  const kind = classifyNotification(n);
  if (kind === "screening" || kind === "shortlist" || kind === "screening_failed") {
    if (ids[0]) return `/screenings/${ids[0]}`;
  }
  if (kind === "job" || kind === "job_closed") {
    if (ids[0]) return `/jobs/${ids[0]}`;
  }
  if (kind === "applicant_upload") return "/applicants";
  if (kind === "system") return "/settings";
  return "/notifications";
}

export type TimeGroup = "today" | "yesterday" | "week" | "older";

export function getTimeGroup(date: Date, now = new Date()): TimeGroup {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const weekAgo = new Date(startToday);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= startToday) return "today";
  if (date >= startYesterday && date < startToday) return "yesterday";
  if (date >= weekAgo) return "week";
  return "older";
}

export function formatRelativeNotificationTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 10) return "Just now";
  if (sec < 60) return `${sec} seconds ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? "1 minute ago" : `${min} minutes ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24 && date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
  }

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  if (date >= startYesterday && date < startToday) {
    return `Yesterday at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameYear) {
    return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}
