"use client";

import { Calendar, Clock, Link2, MapPin, Phone, Video } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Interview, InterviewStatus } from "../../store/api/interviewsApi";
import { useUpdateInterviewMutation, useDeleteInterviewMutation } from "../../store/api/interviewsApi";
import { InterviewStatusBadge } from "./InterviewStatusBadge";
import { Button } from "../ui/Button";

const TYPE_ICON: Record<string, React.ReactNode> = {
  video:       <Video className="h-4 w-4 text-brand-600" />,
  phone:       <Phone className="h-4 w-4 text-brand-600" />,
  "in-person": <MapPin className="h-4 w-4 text-brand-600" />,
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });

export const InterviewCard = ({ interview, onDeleted }: { interview: Interview; onDeleted?: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [updateInterview, { isLoading: updating }] = useUpdateInterviewMutation();
  const [deleteInterview, { isLoading: deleting }] = useDeleteInterviewMutation();

  const setStatus = async (status: InterviewStatus) => {
    try {
      await updateInterview({ id: interview._id, status }).unwrap();
      toast.success(`Interview marked as ${status}.`);
    } catch {
      toast.error("Could not update interview.");
    }
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
  };

  const displaySlot = interview.confirmedSlot ?? interview.proposedSlots[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {TYPE_ICON[interview.type] ?? TYPE_ICON.video}
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{interview.candidateName}</p>
            <p className="truncate text-xs text-slate-500">{interview.jobTitle}</p>
          </div>
        </div>
        <InterviewStatusBadge status={interview.status} />
      </div>

      {displaySlot ? (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {fmt(displaySlot.start)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            ends {new Date(displaySlot.end).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
          </span>
          {interview.confirmedSlot ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Confirmed slot</span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">First proposed slot</span>
          )}
        </div>
      ) : null}

      {interview.meetingLink ? (
        <a
          href={interview.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1 truncate text-xs text-brand-600 hover:underline"
        >
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          {interview.meetingLink}
        </a>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        {expanded ? "Hide details" : "Show details"}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {interview.proposedSlots.length > 0 ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Proposed slots</p>
              <ul className="space-y-1">
                {interview.proposedSlots.map((s, i) => (
                  <li key={i} className="text-xs text-slate-700">
                    {i + 1}. {fmt(s.start)} – {new Date(s.end).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {interview.notes ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notes</p>
              <p className="whitespace-pre-wrap text-xs text-slate-700">{interview.notes}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {interview.status === "pending" && (
              <Button size="sm" variant="primary" type="button" loading={updating} onClick={() => void setStatus("confirmed")}>
                Confirm
              </Button>
            )}
            {(interview.status === "pending" || interview.status === "confirmed") && (
              <Button size="sm" variant="secondary" type="button" loading={updating} onClick={() => void setStatus("completed")}>
                Mark complete
              </Button>
            )}
            {interview.status !== "cancelled" && interview.status !== "completed" && (
              <Button size="sm" variant="danger" type="button" loading={updating} onClick={() => void setStatus("cancelled")}>
                Cancel
              </Button>
            )}
            <Button size="sm" variant="ghost" type="button" loading={deleting} onClick={() => void handleDelete()}>
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
