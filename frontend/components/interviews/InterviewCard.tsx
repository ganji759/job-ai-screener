"use client";

import { Calendar, Mail, MoreHorizontal, Phone, Video } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Interview, InterviewStatus } from "../../store/api/interviewsApi";
import { useDeleteInterviewMutation, useUpdateInterviewMutation } from "../../store/api/interviewsApi";

const TYPE_LABEL: Record<string, string> = {
  video: "Video",
  phone: "Phone",
  "in-person": "In-person",
};

function fmtDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function durationMin(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return `${Math.max(1, Math.round(ms / 60_000))}m`;
}

function statusPillClass(status: InterviewStatus, isLive: boolean): string {
  if (isLive) return "pill pill-mint pulse-ring";
  if (status === "confirmed") return "pill pill-indigo";
  if (status === "completed") return "pill pill-mint";
  if (status === "cancelled") return "pill pill-rose";
  return "pill pill-amber";
}

function statusLabel(status: InterviewStatus, isLive: boolean): string {
  if (isLive) return "live";
  if (status === "confirmed") return "upcoming";
  return status;
}

function initialsOf(name?: string): string {
  if (!name) return "??";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("") || "??";
}

export const InterviewCard = ({
  interview,
  onDeleted,
}: {
  interview: Interview;
  onDeleted?: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [updateInterview, { isLoading: updating }] = useUpdateInterviewMutation();
  const [deleteInterview] = useDeleteInterviewMutation();

  const slot = interview.confirmedSlot ?? interview.proposedSlots?.[0];
  const now = Date.now();
  const isLive =
    interview.status === "confirmed" &&
    !!slot &&
    now >= new Date(slot.start).getTime() &&
    now <= new Date(slot.end).getTime();

  const setStatus = async (status: InterviewStatus) => {
    try {
      await updateInterview({ id: interview._id, status }).unwrap();
      toast.success(`Interview marked as ${status}.`);
    } catch {
      toast.error("Could not update interview.");
    }
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this interview? This cannot be undone.")) return;
    try {
      await deleteInterview(interview._id).unwrap();
      toast.success("Interview deleted.");
      onDeleted?.();
    } catch {
      toast.error("Could not delete interview.");
    }
    setMenuOpen(false);
  };

  const typeLabel = TYPE_LABEL[interview.type] ?? interview.type;

  return (
    <div
      className="panel lift relative"
      style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div className="flex items-start justify-between">
        <span className={statusPillClass(interview.status, isLive)}>
          {isLive ? <span className="dot" /> : null}
          {statusLabel(interview.status, isLive)}
        </span>
        <div className="relative">
          <button
            type="button"
            className="btn-icon"
            style={{ width: 28, height: 28 }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen ? (
            <div className="panel absolute right-0 top-9 z-10 w-44 p-1">
              {interview.status === "pending" ? (
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                  style={{ color: "var(--ink-2)" }}
                  onClick={() => void setStatus("confirmed")}
                  disabled={updating}
                >
                  Confirm
                </button>
              ) : null}
              {interview.status !== "completed" ? (
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                  style={{ color: "var(--ink-2)" }}
                  onClick={() => void setStatus("completed")}
                  disabled={updating}
                >
                  Mark complete
                </button>
              ) : null}
              {interview.status !== "cancelled" ? (
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                  style={{ color: "var(--ink-2)" }}
                  onClick={() => void setStatus("cancelled")}
                  disabled={updating}
                >
                  Cancel
                </button>
              ) : null}
              <button
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-rose-500/10"
                style={{ color: "#fb7185" }}
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="avatar" style={{ width: 44, height: 44, fontSize: 14 }}>
          {initialsOf(interview.candidateName)}
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold truncate" style={{ color: "#fff" }}>
            {interview.candidateName || "Candidate"}
          </div>
          <div className="text-[12.5px] truncate" style={{ color: "var(--ink-3)" }}>
            {interview.jobTitle || interview.title || "—"}
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-2"
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(255,255,255,.025)",
          border: "1px solid var(--line)",
        }}
      >
        <div className="flex justify-between text-[12.5px]">
          <span style={{ color: "var(--ink-3)" }}>When</span>
          <span className="mono" style={{ color: "#fff" }}>
            {slot ? `${fmtDay(slot.start)} · ${fmtTime(slot.start)}` : "TBD"}
          </span>
        </div>
        <div className="flex justify-between text-[12.5px]">
          <span style={{ color: "var(--ink-3)" }}>Type</span>
          <span style={{ color: "#fff" }} className="inline-flex items-center gap-1">
            {interview.type === "phone" ? (
              <Phone className="h-3 w-3" />
            ) : interview.type === "in-person" ? (
              <Calendar className="h-3 w-3" />
            ) : (
              <Video className="h-3 w-3" />
            )}
            {typeLabel}
          </span>
        </div>
        <div className="flex justify-between text-[12.5px]">
          <span style={{ color: "var(--ink-3)" }}>Duration</span>
          <span style={{ color: "#fff" }}>{slot ? durationMin(slot.start, slot.end) : "—"}</span>
        </div>
      </div>

      <div className="mt-1 flex gap-2">
        {isLive && interview.meetingLink ? (
          <a
            href={interview.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary flex-1 justify-center"
            style={{ height: 34, fontSize: 12 }}
          >
            Join now
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-ghost flex-1 justify-center"
            style={{ height: 34, fontSize: 12 }}
            onClick={() => setMenuOpen(true)}
          >
            <Calendar className="h-3 w-3" /> Reschedule
          </button>
        )}
        {interview.candidateEmail ? (
          <a
            href={`mailto:${interview.candidateEmail}`}
            className="btn-icon"
            style={{ width: 34, height: 34 }}
            title={`Email ${interview.candidateEmail}`}
          >
            <Mail className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
};
