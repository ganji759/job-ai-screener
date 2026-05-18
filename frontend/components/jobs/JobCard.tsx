"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Briefcase, Eye, MapPin, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { Job } from "../../types";
import { useDeleteJobMutation } from "../../store/api/jobsApi";
import { getRtkQueryErrorMessage } from "../../lib/rtkError";

const empLabel = (t: Job["employmentType"]) =>
  ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", remote: "Remote" })[t];

const STATUS_PILL: Record<Job["status"], string> = {
  active: "pill pill-mint",
  draft: "pill pill-amber",
  closed: "pill",
};

export const JobCard = ({
  job,
  screened = 0,
  shortlisted = 0,
}: {
  job: Job;
  screened?: number;
  shortlisted?: number;
}) => {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteJob, { isLoading: deleting }] = useDeleteJobMutation();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      const result = await deleteJob(job._id).unwrap();
      const { applicants, screenings, interviews } = result.deleted;
      const parts = [
        applicants > 0 && `${applicants} applicant${applicants !== 1 ? "s" : ""}`,
        screenings > 0 && `${screenings} screening${screenings !== 1 ? "s" : ""}`,
        interviews > 0 && `${interviews} interview${interviews !== 1 ? "s" : ""}`,
      ].filter(Boolean);
      const detail = parts.length > 0 ? ` (+ ${parts.join(", ")})` : "";
      toast.success(`"${job.title}" deleted${detail}.`);
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
      setConfirmDelete(false);
    }
  };

  const applied = job.applicantCount ?? 0;
  // The prototype uses fillPct = (shortlisted / applicants) * 100 * 6; clamp to 100.
  const fillPct = Math.min(100, applied > 0 ? Math.round((shortlisted / applied) * 100 * 6) : 0);

  const shortId = job._id.slice(-6).toUpperCase();
  const postedDate = new Date(job.createdAt).toLocaleDateString();
  const isUrgent = (job as unknown as { priority?: string }).priority === "high";

  return (
    <div
      className="panel lift cursor-pointer"
      style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, minHeight: 240 }}
      onMouseEnter={() => router.prefetch(`/jobs/${job._id}`)}
      onClick={() => {
        if (!confirmDelete) router.push(`/jobs/${job._id}`);
      }}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !confirmDelete) {
          e.preventDefault();
          router.push(`/jobs/${job._id}`);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="mono mb-[6px]"
            style={{ fontSize: 10.5, color: "var(--ink-4)", letterSpacing: "0.14em" }}
          >
            {shortId}
          </div>
          <h3 className="display m-0" style={{ fontSize: 20, lineHeight: 1.15 }}>
            {job.title}
          </h3>
          <div
            className="mt-2 flex flex-wrap items-center gap-[10px] text-[12.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {job.requirements?.domain || "—"}
            </span>
            <span style={{ color: "var(--ink-4)" }}>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location || "—"}
            </span>
          </div>
        </div>
        <span className={STATUS_PILL[job.status]}>{job.status}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="pill" style={{ height: 22, fontSize: 10.5 }}>
          {empLabel(job.employmentType)}
        </span>
        {isUrgent ? (
          <span className="pill pill-rose" style={{ height: 22, fontSize: 10.5 }}>
            ● Urgent
          </span>
        ) : null}
        <span className="pill" style={{ height: 22, fontSize: 10.5 }}>
          Posted {postedDate}
        </span>
      </div>

      <div className="mt-1 grid grid-cols-3 gap-[10px]">
        {(
          [
            { label: "Applied", v: applied, color: "#6366f1" },
            { label: "Screened", v: screened, color: "#22d3ee" },
            { label: "Shortlisted", v: shortlisted, color: "#34d399" },
          ] as const
        ).map((m) => (
          <div
            key={m.label}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,.025)",
              border: "1px solid var(--line)",
            }}
          >
            <div className="eyebrow mb-1" style={{ fontSize: 9.5 }}>
              {m.label}
            </div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: m.color }}>
              {m.v}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div
          className="mb-[6px] flex justify-between text-[11px]"
          style={{ color: "var(--ink-3)" }}
        >
          <span>Pipeline progress</span>
          <span className="mono" style={{ color: "#fff" }}>
            {fillPct}%
          </span>
        </div>
        <div className="mini-bar">
          <span style={{ width: `${fillPct}%` }} />
        </div>
      </div>

      <div className="mt-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/jobs/${job._id}`}
          className="btn btn-ghost flex-1 justify-center"
          style={{ height: 34, fontSize: 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className="h-3 w-3" /> View
        </Link>
        <Link
          href={`/jobs/${job._id}`}
          className="btn btn-ghost flex-1 justify-center"
          style={{ height: 34, fontSize: 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3 w-3" /> Edit
        </Link>
        <Link
          href={`/jobs/${job._id}/screenings`}
          className="btn btn-primary justify-center"
          style={{ flex: 1.2, height: 34, fontSize: 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Sparkles className="h-3 w-3" /> Screen
        </Link>
        {confirmDelete ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={deleting}
              onClick={(e) => void handleDelete(e)}
              className="btn"
              style={{
                height: 34,
                paddingLeft: 10,
                paddingRight: 10,
                background: "linear-gradient(135deg, #f43f5e, #be123c)",
                color: "#fff",
                fontSize: 12,
              }}
            >
              {deleting ? "…" : "Confirm"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              className="btn-icon"
              style={{ width: 34, height: 34 }}
              title="Cancel"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => void handleDelete(e)}
            className="btn-icon"
            style={{ width: 34, height: 34, color: "#fb7185" }}
            title="Delete job"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
