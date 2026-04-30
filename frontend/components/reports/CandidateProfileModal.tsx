"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Code2,
  FileText,
  GraduationCap,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  UserCircle2,
  X,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import type { Applicant } from "../../types";

function scoreLabel(s: number): string {
  if (s >= 85) return "Excellent match";
  if (s >= 70) return "Strong match";
  if (s >= 55) return "Good match";
  if (s >= 40) return "Fair match";
  return "Low match";
}

function scoreColors(s: number): { bar: string; text: string; bg: string; border: string } {
  if (s >= 70) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (s >= 45) return { bar: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
  return { bar: "bg-red-400", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" };
}

function statusColors(status: string): string {
  if (status === "shortlisted") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "screened") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

function sourceLabel(applicant: Applicant): string {
  if (applicant.source === "umurava_platform") return "Umurava Platform";
  if (applicant.source === "pdf_upload") return "PDF Upload";
  const lower = applicant.originalFileName?.toLowerCase() ?? "";
  if (lower.endsWith(".xlsx")) return "Excel Upload";
  return "CSV Upload";
}

export function CandidateProfileModal({
  applicant,
  open,
  onClose,
  jobTitle,
  rank,
}: {
  applicant: Applicant | null;
  open: boolean;
  onClose: () => void;
  jobTitle?: string;
  rank?: number;
}) {
  const [showResume, setShowResume] = useState(false);

  if (!applicant) return null;

  const profile = applicant.profile;
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Unknown Candidate";
  const initials = `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const score = Number(applicant.totalScore ?? 0);
  const colors = scoreColors(score);
  const headline = profile.headline ?? profile.title ?? "";
  const skills = profile.skills ?? [];
  const experience = profile.experience ?? [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const social = profile.socialLinks;
  const yearsExp =
    profile.totalYearsExperience ?? profile.experienceYears ?? null;
  const displayJobTitle = jobTitle ?? `Job #${String(applicant.jobId).slice(-6)}`;

  return (
    <Modal open={open} onClose={onClose} size="md">
      {/* Scrollable body */}
      <div className="max-h-[88vh] overflow-y-auto">

        {/* ── Close button ── */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rank != null && (
              <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">
                #{rank}
              </span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors(applicant.status)}`}>
              {applicant.status}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
              {sourceLabel(applicant)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Avatar + name + headline ── */}
        <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 ring-2 ring-brand-200">
            {initials || <UserCircle2 className="h-7 w-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-slate-900">{fullName}</p>
            {headline ? <p className="mt-0.5 text-sm text-slate-600">{headline}</p> : null}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {profile.email ? (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />{profile.email}
                </span>
              ) : null}
              {profile.phone ? (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />{profile.phone}
                </span>
              ) : null}
              {profile.location && profile.location.toLowerCase() !== "unknown" ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{profile.location}
                </span>
              ) : null}
            </div>
            {social && (social.linkedin || social.github || social.portfolio) ? (
              <div className="mt-2 flex flex-wrap gap-3">
                {social.linkedin ? (
                  <a href={social.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-700 hover:underline">
                    <Linkedin className="h-3 w-3" /> LinkedIn
                  </a>
                ) : null}
                {social.github ? (
                  <a href={social.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-700 hover:underline">
                    <Code2 className="h-3 w-3" /> GitHub
                  </a>
                ) : null}
                {social.portfolio ? (
                  <a href={social.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-700 hover:underline">
                    <Globe className="h-3 w-3" /> Portfolio
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Score block ── */}
        <div className={`mt-3 rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Match Score</p>
              <p className={`mt-0.5 text-4xl font-extrabold leading-none ${colors.text}`}>
                {score}
                <span className="ml-1 text-lg font-semibold text-slate-400">/100</span>
              </p>
              <p className={`mt-1 text-xs font-semibold ${colors.text}`}>{scoreLabel(score)}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {displayJobTitle}</p>
              <p className="mt-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {new Date(applicant.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/60">
            <div
              className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
        </div>

        {/* ── Quick stats ── */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Experience</p>
            <p className="mt-1 text-sm font-bold text-slate-800">
              {yearsExp != null ? `${yearsExp} yrs` : experience.length ? `${experience.length} roles` : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Skills</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{skills.length || "—"}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Education</p>
            <p className="mt-1 text-sm font-bold text-slate-800">
              {education.length ? education[0].degree?.split(" ").slice(0, 2).join(" ") || "Listed" : "—"}
            </p>
          </div>
        </div>

        {/* ── Skills ── */}
        {skills.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 12).map((skill) => (
                <span key={skill} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  {skill}
                </span>
              ))}
              {skills.length > 12 ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                  +{skills.length - 12} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── Last experience ── */}
        {experience.length > 0 ? (
          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Briefcase className="h-3 w-3" /> Latest Role
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {experience[0].title}{" "}
              <span className="font-normal text-slate-500">@ {experience[0].company}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {experience[0].startDate} – {experience[0].endDate ?? "Present"}
            </p>
          </div>
        ) : null}

        {/* ── Education snippet ── */}
        {education.length > 0 ? (
          <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <GraduationCap className="h-3 w-3" /> Education
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {education[0].degree}{education[0].field ? ` in ${education[0].field}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {education[0].institution}
              {education[0].graduationYear ? ` · ${education[0].graduationYear}` : ""}
            </p>
          </div>
        ) : null}

        {/* ── Resume text ── */}
        <div className="mt-3">
          {applicant.rawText ? (
            <>
              <button
                type="button"
                onClick={() => setShowResume((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-brand-600" />
                  View ingested resume text
                </span>
                {showResume ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {showResume ? (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700">
                    {applicant.rawText}
                  </pre>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400">
              <FileText className="h-4 w-4" />
              {applicant.source === "umurava_platform"
                ? "Profile sourced from Umurava Platform — no raw resume text stored."
                : "No resume text available for this candidate."}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <Link
            href={`/applicants/${applicant._id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Open Full Profile →
          </Link>
        </div>

      </div>
    </Modal>
  );
}
