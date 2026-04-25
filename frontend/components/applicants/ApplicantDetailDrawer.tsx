"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleX,
  Code2,
  FolderGit2,
  Globe,
  GraduationCap,
  Languages as LanguagesIcon,
  Linkedin,
  Mail,
  MapPin,
  Medal,
  Phone,
  RefreshCw,
  Sparkles,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Badge } from "../ui/Badge";
import { useEnhanceProfileMutation } from "../../store/api/applicantsApi";
import { getRtkQueryErrorMessage } from "../../lib/rtkError";
import type { Applicant } from "../../types";

export const ApplicantDetailDrawer = ({
  applicant,
  open,
  onClose,
  onDelete,
  jobTitle,
}: {
  applicant: Applicant | null;
  open: boolean;
  onClose: () => void;
  onDelete: (applicantId: string) => void;
  /** Optional job title to show in the header. Falls back to a short jobId when missing. */
  jobTitle?: string;
}) => {
  const [tab, setTab] = useState<"profile" | "ai">("profile");
  const [enhanceProfile, { isLoading: isRefreshing }] = useEnhanceProfileMutation();
  if (!applicant) return null;

  const handleRefresh = async () => {
    try {
      await enhanceProfile(applicant._id).unwrap();
      toast.success("Profile refreshed from resume");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err, "Refresh failed"));
    }
  };

  const profile = applicant.profile;
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const initials = `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase();
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
  const fileLower = applicant.originalFileName?.toLowerCase() ?? "";
  const isExcelSheet = applicant.source === "csv_upload" && fileLower.endsWith(".xlsx");
  const sourceDisplay =
    applicant.source === "umurava_platform"
      ? "Umurava Platform"
      : applicant.source === "pdf_upload"
        ? "PDF"
        : isExcelSheet
          ? "Excel"
          : "CSV";
  const sourceVariant = applicant.source === "umurava_platform" ? "info" : "neutral";

  const headline = profile.headline ?? profile.title;
  const experience = profile.experience ?? [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const educationString =
    !Array.isArray(profile.education) && typeof profile.education === "string" ? profile.education : "";
  const certifications = profile.certifications ?? [];
  const projects = profile.projects ?? [];
  const languages = profile.languages ?? [];
  const social = profile.socialLinks;
  const availability = profile.availability;
  const yearsLabel =
    profile.totalYearsExperience != null
      ? profile.totalYearsExperience
      : profile.experienceYears != null
        ? profile.experienceYears
        : null;

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
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {initials || <UserCircle2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-base font-semibold text-slate-900">{fullName}</p>
            {headline ? <p className="truncate text-xs text-slate-600">{headline}</p> : null}
            <p className="inline-flex items-center gap-1 text-sm text-slate-600">
              <Mail className="h-3.5 w-3.5" />
              {profile.email}
            </p>
            {profile.phone ? (
              <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                <Phone className="h-3.5 w-3.5" />
                {profile.phone}
              </p>
            ) : null}
            {profile.location && profile.location.toLowerCase() !== "unknown" ? (
              <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </p>
            ) : null}
            {availability ? (
              <p className="inline-flex items-center gap-1 text-xs text-slate-600">
                <CalendarClock className="h-3.5 w-3.5" />
                {availability.status} · {availability.type}
                {availability.startDate ? ` · from ${availability.startDate}` : ""}
              </p>
            ) : null}
            {social && (social.linkedin || social.github || social.portfolio) ? (
              <div className="mt-1 flex flex-wrap gap-3 text-xs">
                {social.linkedin ? (
                  <a
                    href={social.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                ) : null}
                {social.github ? (
                  <a
                    href={social.github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    <Code2 className="h-3.5 w-3.5" /> GitHub
                  </a>
                ) : null}
                {social.portfolio ? (
                  <a
                    href={social.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> Portfolio
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span title={String(applicant.jobId)} className="inline-flex">
            <Badge variant="info">
              <Briefcase className="mr-1 inline h-3 w-3" />
              {jobTitle && jobTitle.trim().length
                ? jobTitle
                : `Job #${String(applicant.jobId).slice(-6)}`}
            </Badge>
          </span>
          <Badge variant={sourceVariant}>{sourceDisplay}</Badge>
        </div>

        {/* Status is a read-only reflection of the screening pipeline — pending until
             screened, then shortlisted / rejected based on AI score. Not editable here. */}
        <div className="rounded-xl border border-brand-100 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-500">Status</span>
            <Badge variant={statusVariant}>{statusLabel(applicant.status)}</Badge>
          </div>
          {score > 0 ? (
            <>
              <p className={`text-3xl font-bold ${scoreClass}`}>{score}</p>
              <p className="text-xs text-slate-500">{statusHint(applicant.status)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Not yet screened</p>
          )}
        </div>

        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("profile")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm ${tab === "profile" ? "bg-white font-semibold text-brand-700" : "text-slate-600"}`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setTab("ai")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm ${tab === "ai" ? "bg-white font-semibold text-brand-700" : "text-slate-600"}`}
          >
            AI Analysis
          </button>
        </div>

        {tab === "profile" ? (
          <div className="space-y-4">
            {profile.bio ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{profile.bio}</p>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Experience" value={yearsLabel != null ? `${yearsLabel} yrs` : "—"} />
              <Stat label="Skills" value={String((profile.skills ?? []).length)} />
              <Stat label="Projects" value={String(projects.length)} />
            </div>

            {(profile.skills ?? []).length ? (
              <div>
                <p className="text-sm font-semibold text-slate-800">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(profile.skills ?? []).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {experience.length ? (
              <Section icon={<Briefcase className="h-4 w-4" />} title="Experience">
                <ul className="space-y-2">
                  {experience.map((job, idx) => (
                    <li key={`${job.company}-${idx}`} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {job.title} <span className="font-normal text-slate-600">@ {job.company}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {job.startDate} – {job.endDate ?? "Present"}
                        </p>
                      </div>
                      {job.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-slate-700">{job.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {projects.length ? (
              <Section icon={<FolderGit2 className="h-4 w-4" />} title="Projects">
                <ul className="space-y-2">
                  {projects.map((p, idx) => (
                    <li key={`${p.name}-${idx}`} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                        {p.link ? (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand-700 hover:underline"
                          >
                            Open ↗
                          </a>
                        ) : null}
                      </div>
                      {p.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-slate-700">{p.description}</p>
                      ) : null}
                      {p.technologies?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.technologies.map((t) => (
                            <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {education.length ? (
              <Section icon={<GraduationCap className="h-4 w-4" />} title="Education">
                <ul className="space-y-1 text-sm text-slate-700">
                  {education.map((e, idx) => (
                    <li key={`${e.institution}-${idx}`}>
                      <strong>{e.degree}</strong>
                      {e.field ? ` in ${e.field}` : ""} · {e.institution}
                      {e.graduationYear ? ` (${e.graduationYear})` : ""}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : educationString ? (
              <Section icon={<GraduationCap className="h-4 w-4" />} title="Education">
                <p className="text-sm text-slate-700">{educationString}</p>
              </Section>
            ) : null}

            {certifications.length ? (
              <Section icon={<Medal className="h-4 w-4" />} title="Certifications">
                <ul className="space-y-1 text-sm text-slate-700">
                  {certifications.map((c, idx) => (
                    <li key={`${c.name}-${idx}`}>
                      <strong>{c.name}</strong> — {c.issuer}
                      {c.year ? ` (${c.year})` : c.issueDate ? ` (${c.issueDate})` : ""}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {languages.length ? (
              <Section icon={<LanguagesIcon className="h-4 w-4" />} title="Languages">
                <ul className="space-y-1 text-sm text-slate-700">
                  {languages.map((l, idx) => (
                    <li key={`${l.name}-${idx}`}>
                      <strong>{l.name}</strong> — {l.level}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {!experience.length && !education.length && !projects.length && !certifications.length ? (
              <div className="space-y-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                <p>
                  No structured experience, education, projects or certifications were extracted from this resume.
                  {applicant.rawText
                    ? " Click 'Refresh from resume' to re-run the AI extraction with the updated prompt."
                    : " Re-upload the source PDF to refresh the profile."}
                </p>
                {applicant.rawText ? (
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Refreshing…" : "Refresh from resume"}
                  </button>
                ) : null}
              </div>
            ) : applicant.rawText ? (
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing…" : "Refresh from resume"}
              </button>
            ) : null}
          </div>
        ) : score > 0 ? (
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Sparkles className="h-4 w-4 text-brand-600" />
              AI Insights
            </p>
            <ul className="space-y-1 text-sm text-emerald-700">
              <li className="inline-flex items-start gap-1">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" />
                Strong technical profile alignment
              </li>
              <li className="inline-flex items-start gap-1">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" />
                Relevant role experience detected
              </li>
            </ul>
            <ul className="space-y-1 text-sm text-red-600">
              <li className="inline-flex items-start gap-1">
                <CircleX className="mt-0.5 h-3.5 w-3.5" />
                Potential gaps in bonus skills
              </li>
            </ul>
            <p className="text-sm text-slate-700">
              Recommendation: proceed to shortlist if role-critical skill checks pass in interview.
            </p>
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
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
            onClick={() => onDelete(applicant._id)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Applicant
          </button>
        </div>
      </div>
    </Drawer>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function statusLabel(s: Applicant["status"]): string {
  switch (s) {
    case "shortlisted":
      return "Shortlisted";
    case "rejected":
      return "Rejected";
    case "screened":
      return "Screened";
    case "pending":
    default:
      return "Pending";
  }
}

function statusHint(s: Applicant["status"]): string {
  switch (s) {
    case "shortlisted":
      return "AI screening placed this candidate on the shortlist.";
    case "rejected":
      return "AI screening marked this candidate below the threshold.";
    case "screened":
      return "AI screening completed — see score and breakdown.";
    case "pending":
    default:
      return "Awaiting screening.";
  }
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="text-brand-700">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}
