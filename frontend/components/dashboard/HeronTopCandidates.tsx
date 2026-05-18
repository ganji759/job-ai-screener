"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Applicant } from "../../types";

const STATUS_PILL: Record<string, string> = {
  shortlisted: "pill pill-mint",
  screened: "pill pill-cyan",
  pending: "pill pill-fuchsia",
  rejected: "pill pill-rose",
};

const STATUS_LABEL: Record<string, string> = {
  shortlisted: "shortlisted",
  screened: "screened",
  pending: "review",
  rejected: "rejected",
};

function initialsOf(a: Applicant): string {
  const f = (a.profile?.firstName ?? "").trim().charAt(0).toUpperCase();
  const l = (a.profile?.lastName ?? "").trim().charAt(0).toUpperCase();
  if (f && l) return `${f}${l}`;
  if (f) return f.repeat(2);
  return "?";
}

function fullName(a: Applicant): string {
  return `${(a.profile?.firstName ?? "").trim()} ${(a.profile?.lastName ?? "").trim()}`.trim() || "Candidate";
}

export function HeronTopCandidates({ items }: { items: Applicant[] }) {
  return (
    <div className="panel panel-lg">
      <div className="mb-[14px] flex items-center justify-between">
        <div>
          <div className="eyebrow">Top candidates</div>
          <div className="mt-1 text-base font-semibold" style={{ color: "#fff" }}>
            Ranked by AI score
          </div>
        </div>
        <Link href="/applicants" className="btn btn-ghost" style={{ height: 30, fontSize: 12 }}>
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <div
          className="rounded-[14px] px-4 py-10 text-center"
          style={{ border: "1px dashed var(--line)", color: "var(--ink-3)" }}
        >
          <p className="text-sm">No scored candidates yet.</p>
          <p className="mt-1 text-xs">Run a screening to populate this list.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map((c) => {
            const score = typeof c.totalScore === "number" ? Math.round(c.totalScore) : null;
            const status = (c.status ?? "pending") as keyof typeof STATUS_PILL;
            const scoreColor =
              score == null ? "var(--ink-3)" : score >= 85 ? "#34d399" : score >= 75 ? "#fbbf24" : "#fb7185";
            return (
              <Link
                href={`/applicants?highlightApplicant=${c._id}`}
                key={c._id}
                className="grid items-center gap-3 rounded-[10px] px-2 py-[11px] transition-colors"
                style={{ gridTemplateColumns: "auto 1fr auto auto" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="relative">
                  <span className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                    {initialsOf(c)}
                  </span>
                  {score != null ? (
                    <span
                      className="mono absolute"
                      style={{
                        bottom: -4,
                        right: -6,
                        background: "#0c0c18",
                        border: "1px solid var(--line)",
                        fontSize: 9,
                        padding: "1px 5px",
                        borderRadius: 6,
                        color: scoreColor,
                      }}
                    >
                      {score}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium" style={{ color: "#fff" }}>
                    {fullName(c)}
                  </div>
                  <div className="truncate text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                    {c.profile?.title || c.profile?.headline || "—"}
                    {c.profile?.location ? ` · ${c.profile.location}` : ""}
                  </div>
                </div>
                <span className={STATUS_PILL[status] ?? "pill"}>{STATUS_LABEL[status] ?? status}</span>
                <ChevronRight className="h-[14px] w-[14px]" style={{ color: "var(--ink-4)" }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
