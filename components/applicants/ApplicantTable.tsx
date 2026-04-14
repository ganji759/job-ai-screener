"use client";

import { useMemo, useState } from "react";
import { List, type RowComponentProps } from "react-window";
import type { Applicant } from "../../types";
import { Badge } from "../ui/Badge";
import { CandidateDetailDrawer } from "../screenings/CandidateDetailDrawer";
import { cn } from "../../lib/utils";

export const ApplicantTable = ({ applicants }: { applicants: Applicant[] }) => {
  const [selected, setSelected] = useState<Applicant | null>(null);
  const rowProps = useMemo(() => ({ applicants, onSelect: (row: Applicant) => setSelected(row) }), [applicants]);
  return (
    <div className="rounded-xl border border-brand-100 dark:border-slate-700">
      <div className="grid grid-cols-7 bg-brand-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-900 dark:bg-slate-800 dark:text-slate-100">
        <span>Name</span>
        <span>Title</span>
        <span>Skills</span>
        <span>Experience</span>
        <span>Source</span>
        <span>Status</span>
        <span>Score</span>
      </div>
      <List
        style={{ width: "100%" }}
        rowCount={applicants.length}
        rowHeight={56}
        rowComponent={ApplicantRow}
        rowProps={rowProps}
      />
      <CandidateDetailDrawer open={Boolean(selected)} onClose={() => setSelected(null)} candidate={selected?.profile as unknown as Record<string, unknown> ?? null} />
    </div>
  );
};

const ApplicantRow = ({ index, style, applicants, onSelect }: RowComponentProps<{ applicants: Applicant[]; onSelect: (row: Applicant) => void }>) => {
  const row = applicants[index];
  const fullName = `${row.profile.firstName} ${row.profile.lastName}`;
  const score = Number((row as unknown as { totalScore?: number }).totalScore ?? 0);
  const open = () => onSelect(row);
  return (
    <div
      style={style}
      role="button"
      tabIndex={0}
      className={cn(
        "grid cursor-pointer grid-cols-7 items-center border-t border-brand-100 px-4 text-sm text-slate-700 outline-none transition-colors",
        "hover:bg-brand-50/50 focus-visible:z-10 focus-visible:bg-brand-50/40 focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-inset",
        "dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:focus-visible:bg-slate-800/60",
      )}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      <span className="font-semibold">{fullName}</span>
      <span className="truncate pr-2">{row.profile.title}</span>
      <span className="truncate pr-2">{row.profile.skills.slice(0, 3).join(", ")}</span>
      <span>{row.profile.totalYearsExperience}y</span>
      <span><Badge variant="info">{row.source}</Badge></span>
      <span><Badge variant="neutral">{row.status}</Badge></span>
      <span className={score > 70 ? "text-emerald-600" : score > 40 ? "text-amber-600" : "text-red-600"}>{score || "-"}</span>
    </div>
  );
};
