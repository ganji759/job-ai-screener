"use client";

import { useState } from "react";
import { CheckCircle2, CircleX, Mail, Phone, Sparkles, Trash2, UserCircle2, X } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Badge } from "../ui/Badge";
import type { Applicant } from "../../types";

export const ApplicantDetailDrawer = ({
  applicant,
  open,
  onClose,
  onDelete,
  onStatusChange,
}: {
  applicant: Applicant | null;
  open: boolean;
  onClose: () => void;
  onDelete: (applicantId: string) => void;
  onStatusChange: (applicantId: string, status: Applicant["status"]) => void;
}) => {
  const [tab, setTab] = useState<"profile" | "ai">("profile");
  if (!applicant) return null;

  const fullName = `${applicant.profile.firstName} ${applicant.profile.lastName}`;
  const initials = `${applicant.profile.firstName?.[0] ?? ""}${applicant.profile.lastName?.[0] ?? ""}`.toUpperCase();
  const score = Number(applicant.totalScore ?? 0);
  const scoreClass = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";
  const statusVariant =
    applicant.status === "shortlisted"
      ? "success"
      : applicant.status === "rejected"
        ? "error"
        : applicant.status === "screened"
          ? "info"
          : "warning";
  const sourceVariant = applicant.source === "umurava_platform" ? "info" : applicant.source === "pdf_upload" ? "neutral" : "neutral";

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Applicant Details</h3>
          <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-brand-100 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{initials || <UserCircle2 className="h-5 w-5" />}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900">{fullName}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600"><Mail className="h-3.5 w-3.5" />{applicant.profile.email}</p>
            {applicant.profile.phone ? <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600"><Phone className="h-3.5 w-3.5" />{applicant.profile.phone}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">Job ID: {applicant.jobId}</Badge>
          <Badge variant={sourceVariant}>{applicant.source === "umurava_platform" ? "Umurava" : applicant.source === "csv_upload" ? "CSV" : "PDF"}</Badge>
          <Badge variant={statusVariant}>{applicant.status}</Badge>
        </div>

        <div className="rounded-xl border border-brand-100 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-500">Status</span>
            <select
              value={applicant.status}
              onChange={(e) => onStatusChange(applicant._id, e.target.value as Applicant["status"])}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
              <option value="screened">Screened</option>
            </select>
          </div>
          {score > 0 ? (
            <p className={`text-3xl font-bold ${scoreClass}`}>{score}</p>
          ) : (
            <p className="text-sm text-slate-500">Not yet screened</p>
          )}
        </div>

        <div className="flex rounded-lg bg-slate-100 p-1">
          <button type="button" onClick={() => setTab("profile")} className={`flex-1 rounded-md px-3 py-1.5 text-sm ${tab === "profile" ? "bg-white font-semibold text-brand-700" : "text-slate-600"}`}>Profile</button>
          <button type="button" onClick={() => setTab("ai")} className={`flex-1 rounded-md px-3 py-1.5 text-sm ${tab === "ai" ? "bg-white font-semibold text-brand-700" : "text-slate-600"}`}>AI Analysis</button>
        </div>

        {tab === "profile" ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(applicant.profile.skills ?? []).map((skill) => (
                  <span key={skill} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{skill}</span>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-700">
              <strong>Experience:</strong>{" "}
              {applicant.profile.totalYearsExperience ?? applicant.profile.experienceYears ?? "—"} years
            </p>
            <p className="text-sm text-slate-700">
              <strong>Education:</strong>{" "}
              {Array.isArray(applicant.profile.education)
                ? applicant.profile.education.map((item) => item.degree).join(", ") || "N/A"
                : applicant.profile.education ?? "N/A"}
            </p>
            <p className="text-sm text-slate-700"><strong>Location:</strong> {applicant.profile.location || "N/A"}</p>
          </div>
        ) : score > 0 ? (
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Sparkles className="h-4 w-4 text-brand-600" />AI Insights</p>
            <ul className="space-y-1 text-sm text-emerald-700">
              <li className="inline-flex items-start gap-1"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5" />Strong technical profile alignment</li>
              <li className="inline-flex items-start gap-1"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5" />Relevant role experience detected</li>
            </ul>
            <ul className="space-y-1 text-sm text-red-600">
              <li className="inline-flex items-start gap-1"><CircleX className="mt-0.5 h-3.5 w-3.5" />Potential gaps in bonus skills</li>
            </ul>
            <p className="text-sm text-slate-700">Recommendation: proceed to shortlist if role-critical skill checks pass in interview.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 px-4 py-6 text-center text-sm text-slate-600">
            Not yet screened - run a screening to see AI analysis
          </div>
        )}

        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          <button type="button" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            Run Screening for this Job
          </button>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => onDelete(applicant._id)}>
            <Trash2 className="h-4 w-4" />
            Delete Applicant
          </button>
        </div>
      </div>
    </Drawer>
  );
};
