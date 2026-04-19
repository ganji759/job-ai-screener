"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import type { Applicant } from "../../types";
import { Badge } from "../ui/Badge";
import { ApplicantDetailDrawer } from "./ApplicantDetailDrawer";
import { cn } from "../../lib/utils";

export const ApplicantTable = ({
  applicants,
  onDelete,
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
  onOpenUpload,
}: {
  applicants: Applicant[];
  onDelete: (applicantId: string) => void;
  onStatusChange: (applicantId: string, status: Applicant["status"]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  onOpenUpload: () => void;
}) => {
  const [selected, setSelected] = useState<Applicant | null>(null);
  const rowProps = useMemo(
    () => ({
      applicants,
      onSelect: (row: Applicant) => setSelected(row),
      onDelete,
    }),
    [applicants, onDelete],
  );
  if (applicants.length === 0) {
    return (
      <div className="rounded-xl border border-brand-100 p-8 text-center">
        <p className="text-3xl">{hasActiveFilters ? "🔎" : "📥"}</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">{hasActiveFilters ? "No applicants match your filters" : "No applicants yet"}</p>
        <p className="mt-1 text-sm text-slate-500">{hasActiveFilters ? "Try adjusting your search or clearing the filters" : "Upload candidates or paste Umurava profiles to get started"}</p>
        <button
          type="button"
          onClick={hasActiveFilters ? onClearFilters : onOpenUpload}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {hasActiveFilters ? "Clear filters" : "Upload Applicants"}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-100 dark:border-slate-700">
      <div className="grid min-w-[960px] grid-cols-[2fr_1.2fr_1.8fr_0.9fr_1fr_0.8fr_0.8fr] bg-brand-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-900 dark:bg-slate-800 dark:text-slate-100">
        <span className="sticky top-0">Name</span>
        <span>Title</span>
        <span>Skills</span>
        <span>Source</span>
        <span>Status</span>
        <span>Score</span>
        <span>Actions</span>
      </div>
      <div className="max-h-[540px] overflow-y-auto">
        {applicants.map((applicant, index) => (
          <ApplicantRow key={applicant._id} index={index} applicants={rowProps.applicants} onSelect={rowProps.onSelect} onDelete={rowProps.onDelete} />
        ))}
      </div>
      <ApplicantDetailDrawer open={Boolean(selected)} onClose={() => setSelected(null)} applicant={selected} onDelete={onDelete} onStatusChange={onStatusChange} />
    </div>
  );
};

const ApplicantRow = ({
  index,
  applicants,
  onSelect,
  onDelete,
}: {
  index: number;
  applicants: Applicant[];
  onSelect: (row: Applicant) => void;
  onDelete: (id: string) => void;
}) => {
  const row = applicants[index];
  const fullName = `${row.profile.firstName} ${row.profile.lastName}`;
  const initials = `${row.profile.firstName?.[0] ?? ""}${row.profile.lastName?.[0] ?? ""}`.toUpperCase();
  const scoreRaw = row.totalScore;
  const scoreDisplay = scoreRaw != null && !Number.isNaN(Number(scoreRaw)) ? Number(scoreRaw) : null;
  const open = () => onSelect(row);
  const sourceLabel = row.source === "umurava_platform" ? "Umurava" : row.source === "csv_upload" ? "CSV" : "PDF";
  const sourceVariant = row.source === "umurava_platform" ? "info" : row.source === "pdf_upload" ? "neutral" : "neutral";
  const statusVariant =
    row.status === "shortlisted"
      ? "success"
      : row.status === "rejected"
        ? "error"
        : row.status === "screened"
          ? "info"
          : "warning";

  const handleDelete = () => {
    if (typeof window !== "undefined" && window.confirm("Delete this applicant permanently?")) {
      onDelete(row._id);
    }
  };

  const skills = row.profile.skills ?? [];

  return (
    <div
      className={cn(
        "grid min-w-[960px] grid-cols-[2fr_1.2fr_1.8fr_0.9fr_1fr_0.8fr_0.8fr] items-center border-t border-brand-100 px-4 py-3 text-sm text-slate-700 transition-colors",
        index % 2 === 0 ? "bg-white" : "bg-[#f9fafb]",
        "hover:bg-slate-100/80",
        "dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:focus-visible:bg-slate-800/60",
      )}
    >
      <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={open}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{initials}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-slate-900 hover:text-brand-700">{fullName}</span>
          <span className="block truncate text-xs text-slate-500">{row.profile.email}</span>
        </span>
      </button>
      <span className="truncate pr-2">{row.profile.title}</span>
      <span className="flex flex-wrap gap-1 pr-2">
        {skills.slice(0, 3).map((skill) => (
          <span key={skill} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
            {skill}
          </span>
        ))}
        {skills.length > 3 ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">+{skills.length - 3} more</span> : null}
      </span>
      <span>
        <Badge variant={sourceVariant}>{sourceLabel}</Badge>
      </span>
      <span>
        <Badge variant={statusVariant}>{row.status}</Badge>
      </span>
      <span
        className={
          scoreDisplay === null
            ? "text-slate-400"
            : scoreDisplay >= 70
              ? "font-semibold text-emerald-600"
              : scoreDisplay >= 40
                ? "font-semibold text-amber-600"
                : "font-semibold text-red-600"
        }
      >
        {scoreDisplay === null ? "—" : scoreDisplay}
      </span>
      <span className="inline-flex items-center gap-1">
        <Link
          href={`/applicants/${row._id}`}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200"
          aria-label="View applicant"
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className="h-4 w-4" />
        </Link>
        <button type="button" className="rounded-md p-1.5 text-red-600 hover:bg-red-50" onClick={handleDelete} aria-label="Delete applicant">
          <Trash2 className="h-4 w-4" />
        </button>
      </span>
    </div>
  );
};
