"use client";

import { useMemo, useState } from "react";
import { Eye, Mail, MapPin, MoreHorizontal, Trash2 } from "lucide-react";
import type { Applicant } from "../../types";
import { ApplicantDetailDrawer } from "./ApplicantDetailDrawer";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function ScoreBar({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="mono text-[12px]" style={{ color: "var(--ink-4)" }}>
        —
      </span>
    );
  }
  const c =
    score >= 85 ? "#34d399" : score >= 75 ? "#fbbf24" : score >= 65 ? "#22d3ee" : "#fb7185";
  return (
    <div className="flex items-center gap-2" style={{ minWidth: 110 }}>
      <div
        className="overflow-hidden"
        style={{ flex: 1, height: 5, borderRadius: 999, background: "rgba(255,255,255,.06)" }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, score))}%`,
            height: "100%",
            background: c,
            boxShadow: `0 0 8px ${c}80`,
            borderRadius: 999,
          }}
        />
      </div>
      <span
        className="mono text-[12px] font-semibold"
        style={{ color: c, minWidth: 24, textAlign: "right" }}
      >
        {score}
      </span>
    </div>
  );
}

const STATUS_PILL: Record<Applicant["status"], string> = {
  pending: "pill pill-amber",
  screened: "pill pill-cyan",
  shortlisted: "pill pill-mint",
  rejected: "pill pill-rose",
};

export const ApplicantTable = ({
  applicants,
  onDelete,
  onClearFilters,
  hasActiveFilters,
  onOpenUpload,
  selectedIds,
  onToggleSelected,
  onToggleAll,
  jobTitleById,
}: {
  applicants: Applicant[];
  onDelete: (applicantId: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  onOpenUpload: () => void;
  selectedIds?: Set<string>;
  onToggleSelected?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
  jobTitleById?: Record<string, string>;
}) => {
  const [selected, setSelected] = useState<Applicant | null>(null);
  const selectedJobTitle = selected ? jobTitleById?.[String(selected.jobId)] : undefined;

  const allChecked = useMemo(() => {
    if (!selectedIds || applicants.length === 0) return false;
    return applicants.every((a) => selectedIds.has(a._id));
  }, [applicants, selectedIds]);

  if (applicants.length === 0) {
    return (
      <div
        className="px-6 py-12 text-center"
        style={{ border: "1px dashed var(--line-strong)", borderRadius: 16, background: "rgba(255,255,255,.02)" }}
      >
        <p className="display" style={{ fontSize: 18, color: "#fff" }}>
          {hasActiveFilters ? "No applicants match your filters" : "No applicants yet"}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
          {hasActiveFilters
            ? "Try adjusting your search or clearing the filters."
            : "Upload candidates or paste Umurava profiles to get started."}
        </p>
        <button
          type="button"
          onClick={hasActiveFilters ? onClearFilters : onOpenUpload}
          className="btn btn-primary mt-4"
        >
          {hasActiveFilters ? "Clear filters" : "Upload Applicants"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="panel overflow-x-auto" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              {selectedIds ? (
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => onToggleAll?.(applicants.map((a) => a._id))}
                    style={{ accentColor: "#6366f1" }}
                  />
                </th>
              ) : null}
              <th>Candidate</th>
              <th>Role</th>
              <th>Skills</th>
              <th>Score</th>
              <th>Status</th>
              <th>Source</th>
              <th>Applied</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {applicants.map((a) => {
              const fullName = `${a.profile.firstName} ${a.profile.lastName}`.trim() || "Applicant";
              const initials = `${a.profile.firstName?.[0] ?? ""}${a.profile.lastName?.[0] ?? ""}`.toUpperCase() || "?";
              const scoreNum =
                a.totalScore != null && !Number.isNaN(Number(a.totalScore)) ? Math.round(Number(a.totalScore)) : null;
              const fileLower = a.originalFileName?.toLowerCase() ?? "";
              const isExcelSheet = a.source === "csv_upload" && fileLower.endsWith(".xlsx");
              const sourceLabel =
                a.source === "umurava_platform" ? "Umurava" : a.source === "pdf_upload" ? "PDF" : isExcelSheet ? "Excel" : "CSV";
              const skills = a.profile.skills ?? [];
              const isSelected = selectedIds?.has(a._id) ?? false;
              return (
                <tr key={a._id} onClick={() => setSelected(a)} style={{ cursor: "pointer" }}>
                  {selectedIds ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelected?.(a._id)}
                        style={{ accentColor: "#6366f1" }}
                      />
                    </td>
                  ) : null}
                  <td>
                    <div className="flex items-center gap-[10px]">
                      <span className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium" style={{ color: "#fff" }}>
                          {fullName}
                        </div>
                        <div
                          className="flex items-center gap-1 truncate text-[11px]"
                          style={{ color: "var(--ink-4)" }}
                        >
                          {a.profile.location ? (
                            <>
                              <MapPin className="h-3 w-3" />
                              {a.profile.location}
                            </>
                          ) : (
                            a.profile.email
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--ink-2)" }}>{a.profile.title || a.profile.headline || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="mono"
                          style={{
                            fontSize: 10.5,
                            padding: "2px 7px",
                            borderRadius: 5,
                            background: "rgba(99,102,241,.10)",
                            border: "1px solid rgba(99,102,241,.25)",
                            color: "#c7d2fe",
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                      {skills.length > 3 ? (
                        <span
                          className="mono"
                          style={{
                            fontSize: 10.5,
                            padding: "2px 7px",
                            borderRadius: 5,
                            background: "rgba(255,255,255,.04)",
                            border: "1px solid var(--line)",
                            color: "var(--ink-3)",
                          }}
                        >
                          +{skills.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <ScoreBar score={scoreNum} />
                  </td>
                  <td>
                    <span className={STATUS_PILL[a.status] ?? "pill"}>{a.status}</span>
                  </td>
                  <td className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
                    {sourceLabel}
                  </td>
                  <td className="mono text-[12px]" style={{ color: "var(--ink-3)" }}>
                    {relativeTime(a.createdAt)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: 28, height: 28 }}
                        title="View profile"
                        onClick={() => setSelected(a)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {a.profile.email ? (
                        <a
                          href={`mailto:${a.profile.email}`}
                          className="btn-icon"
                          style={{ width: 28, height: 28 }}
                          title={`Email ${a.profile.email}`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: 28, height: 28, color: "#fb7185" }}
                        title="Delete applicant"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.confirm("Delete this applicant permanently?")) {
                            onDelete(a._id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="btn-icon" style={{ width: 28, height: 28 }} title="More">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ApplicantDetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        applicant={selected}
        onDelete={onDelete}
        jobTitle={selectedJobTitle}
      />
    </>
  );
};
