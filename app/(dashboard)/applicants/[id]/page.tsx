"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  Code2,
  FolderGit2,
  Globe,
  GraduationCap,
  Languages,
  Linkedin,
  Mail,
  MapPin,
  Medal,
  UserCircle2,
} from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Card } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { useDeleteApplicantMutation, useGetApplicantQuery } from "../../../../store/api/applicantsApi";
import { useGetJobsQuery } from "../../../../store/api/jobsApi";
import { getRtkQueryErrorMessage } from "../../../../lib/rtkError";

export default function ApplicantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { data: applicant, isLoading, error } = useGetApplicantQuery(id, { skip: !id });
  const [deleteApplicant, { isLoading: isDeleting }] = useDeleteApplicantMutation();
  const { data: jobsData } = useGetJobsQuery({ page: 1, limit: 200 });

  const handleDelete = async () => {
    if (!applicant || !window.confirm("Delete this applicant permanently?")) return;
    try {
      await deleteApplicant(applicant._id).unwrap();
      toast.success("Applicant deleted");
      router.push("/applicants");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Invalid applicant.</p>
        <Link href="/applicants" className="mt-2 inline-block text-sm font-semibold text-brand-700">
          Back to Applicants
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Loading applicant…</p>
      </div>
    );
  }

  if (error || !applicant) {
    return (
      <div className="p-6">
        <p className="text-slate-600">{getRtkQueryErrorMessage(error, "Applicant not found.")}</p>
        <Link href="/applicants" className="mt-2 inline-block text-sm font-semibold text-brand-700">
          Back to Applicants
        </Link>
      </div>
    );
  }

  const fullName = `${applicant.profile.firstName} ${applicant.profile.lastName}`;
  const initials = `${applicant.profile.firstName?.[0] ?? ""}${applicant.profile.lastName?.[0] ?? ""}`.toUpperCase();
  const score = applicant.totalScore != null ? Number(applicant.totalScore) : null;
  const sourceLabel = applicant.source === "umurava_platform" ? "Umurava" : applicant.source === "csv_upload" ? "CSV" : "PDF";
  const statusVariant =
    applicant.status === "shortlisted"
      ? "success"
      : applicant.status === "rejected"
        ? "error"
        : applicant.status === "screened"
          ? "info"
          : "warning";

  const profile = applicant.profile;
  const headline = profile.headline || profile.title;
  const jobTitle = jobsData?.jobs?.find((j) => j._id === String(applicant.jobId))?.title ?? "";
  const experience = profile.experience ?? [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const certifications = profile.certifications ?? [];
  const projects = profile.projects ?? [];
  const languages = profile.languages ?? [];
  const social = profile.socialLinks;
  const availability = profile.availability;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/applicants"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applicants
        </Link>
      </div>
      <PageHeader title={fullName} subtitle={headline} />

      {/* Header card — contact, source, status, quick summary */}
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {initials || <UserCircle2 className="h-6 w-6" />}
            </div>
            <div className="space-y-1">
              <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                <Mail className="h-3.5 w-3.5" />
                {profile.email}
              </p>
              {profile.phone ? <p className="text-sm text-slate-600">{profile.phone}</p> : null}
              {profile.location ? (
                <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </p>
              ) : null}
              {availability ? (
                <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {availability.status} · {availability.type}
                  {availability.startDate ? ` · from ${availability.startDate}` : ""}
                </p>
              ) : null}
              {social && (social.linkedin || social.github || social.portfolio) ? (
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  {social.linkedin ? (
                    <a href={social.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                  ) : null}
                  {social.github ? (
                    <a href={social.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                      <Code2 className="h-3.5 w-3.5" /> GitHub
                    </a>
                  ) : null}
                  {social.portfolio ? (
                    <a href={social.portfolio} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                      <Globe className="h-3.5 w-3.5" /> Portfolio
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {jobTitle ? (
              <Link
                href={`/jobs/${applicant.jobId}`}
                className="inline-flex items-center"
                title={String(applicant.jobId)}
              >
                <Badge variant="info">
                  <Briefcase className="mr-1 inline h-3 w-3" />
                  {jobTitle}
                </Badge>
              </Link>
            ) : (
              <span title={String(applicant.jobId)} className="inline-flex">
                <Badge variant="info">Job #{String(applicant.jobId).slice(-6)}</Badge>
              </span>
            )}
            <Badge variant="neutral">{sourceLabel}</Badge>
            <Badge variant={statusVariant}>{applicant.status}</Badge>
          </div>
        </div>

        {profile.bio ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{profile.bio}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Experience" value={`${profile.totalYearsExperience ?? profile.experienceYears ?? "—"} yrs`} />
          <Stat label="Score" value={score != null && !Number.isNaN(score) ? String(score) : "—"} />
          <Stat label="Skills" value={String((profile.skills ?? []).length)} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">Skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(profile.skills ?? []).map((skill) => (
              <span key={skill} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={isDeleting}
          onClick={() => void handleDelete()}
          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Delete Applicant"}
        </button>
      </Card>

      {/* Experience */}
      {experience.length ? (
        <Card className="space-y-3 p-6">
          <SectionHeader icon={<Briefcase className="h-4 w-4" />} title="Experience" />
          <ul className="space-y-3">
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
        </Card>
      ) : null}

      {/* Projects */}
      {projects.length ? (
        <Card className="space-y-3 p-6">
          <SectionHeader icon={<FolderGit2 className="h-4 w-4" />} title="Projects" />
          <ul className="space-y-3">
            {projects.map((p, idx) => (
              <li key={`${p.name}-${idx}`} className="rounded-lg border border-slate-100 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  {p.link ? (
                    <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">
                      Open ↗
                    </a>
                  ) : null}
                </div>
                {p.description ? (
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{p.description}</p>
                ) : null}
                {p.technologies && p.technologies.length ? (
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
        </Card>
      ) : null}

      {/* Education */}
      {education.length ? (
        <Card className="space-y-3 p-6">
          <SectionHeader icon={<GraduationCap className="h-4 w-4" />} title="Education" />
          <ul className="space-y-2 text-sm text-slate-700">
            {education.map((e, idx) => (
              <li key={`${e.institution}-${idx}`}>
                <strong>{e.degree}</strong>
                {e.field ? ` in ${e.field}` : ""} · {e.institution}
                {e.graduationYear ? ` (${e.graduationYear})` : ""}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Certifications + Languages */}
      {certifications.length || languages.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {certifications.length ? (
            <Card className="space-y-3 p-6">
              <SectionHeader icon={<Medal className="h-4 w-4" />} title="Certifications" />
              <ul className="space-y-1 text-sm text-slate-700">
                {certifications.map((c, idx) => (
                  <li key={`${c.name}-${idx}`}>
                    <strong>{c.name}</strong> — {c.issuer}
                    {c.year ? ` (${c.year})` : c.issueDate ? ` (${c.issueDate})` : ""}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {languages.length ? (
            <Card className="space-y-3 p-6">
              <SectionHeader icon={<Languages className="h-4 w-4" />} title="Languages" />
              <ul className="space-y-1 text-sm text-slate-700">
                {languages.map((l, idx) => (
                  <li key={`${l.name}-${idx}`}>
                    <strong>{l.name}</strong> — {l.level}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
      <span className="text-brand-700">{icon}</span>
      {title}
    </div>
  );
}
