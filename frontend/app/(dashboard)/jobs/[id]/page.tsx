"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import {
  useGetJobQuery,
  useUpdateJobMutation,
  useDeleteJobMutation,
} from "../../../../store/api/jobsApi";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { SkillBadge } from "../../../../components/ui/SkillBadge";
import { Input } from "../../../../components/ui/Input";
import { Textarea } from "../../../../components/ui/Textarea";
import { Select } from "../../../../components/ui/Select";
import { TagInput } from "../../../../components/ui/TagInput";
import type { ExperienceLevel, Job } from "../../../../types";
import { cn } from "../../../../lib/utils";
import { getRtkQueryErrorMessage } from "../../../../lib/rtkError";
import { buildUpdateJobBody, jobToEditDraft, type JobEditDraft } from "../../../../lib/jobApiMapping";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id ?? "";
  const { data: job, isLoading: jobLoading, isError, error } = useGetJobQuery(id, { skip: !id });

  const [updateJob, { isLoading: updating }] = useUpdateJobMutation();
  const [deleteJob, { isLoading: deleting }] = useDeleteJobMutation();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<JobEditDraft | null>(null);
  /** Snapshot when entering edit mode — used to compute PUT body aligned with API. */
  const [baselineDraft, setBaselineDraft] = useState<JobEditDraft | null>(null);
  const [skillsInput, setSkillsInput] = useState("");

  useEffect(() => {
    if (job) setDraft(jobToEditDraft(job));
  }, [job]);

  const syncDraftFromJob = useCallback(() => {
    if (job) setDraft(jobToEditDraft(job));
  }, [job]);

  const handleStatusChange = async (next: Job["status"]) => {
    if (!job || next === job.status) return;
    try {
      await updateJob({ id, body: { status: next } }).unwrap();
      toast.success(`Status updated to “${next}”.`);
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  const handleSave = async () => {
    if (!job || !draft) return;
    if (!draft.requirementsTitle.trim() || !draft.requirementsDescription.trim()) {
      toast.error("Requirements title and description cannot be empty.");
      return;
    }
    if (draft.skills.length === 0) {
      toast.error("Add at least one required skill.");
      return;
    }
    const baseline = baselineDraft ?? jobToEditDraft(job);
    const body = buildUpdateJobBody(baseline, draft);
    if (!body) {
      toast.success("No changes to save.");
      setEditing(false);
      setBaselineDraft(null);
      setSkillsInput("");
      return;
    }
    try {
      await updateJob({ id, body }).unwrap();
      toast.success("Job saved successfully.");
      setEditing(false);
      setBaselineDraft(null);
      setSkillsInput("");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  const handleCancelEdit = () => {
    syncDraftFromJob();
    setEditing(false);
    setBaselineDraft(null);
    setSkillsInput("");
  };

  const handleDelete = async () => {
    if (!job) return;
    if (!window.confirm(
      `Permanently delete "${job.title}"?\n\nThis will also delete all applicants, screening results, and interviews for this job. This cannot be undone.`
    )) return;
    try {
      const result = await deleteJob(id).unwrap();
      const { applicants, screenings, interviews } = result.deleted;
      const parts = [
        applicants > 0 && `${applicants} applicant${applicants !== 1 ? "s" : ""}`,
        screenings > 0 && `${screenings} screening${screenings !== 1 ? "s" : ""}`,
        interviews > 0 && `${interviews} interview${interviews !== 1 ? "s" : ""}`,
      ].filter(Boolean);
      const detail = parts.length > 0 ? ` (+ ${parts.join(", ")})` : "";
      toast.success(`"${job.title}" deleted${detail}.`);
      router.push("/jobs");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  const startEditing = () => {
    if (job) {
      setBaselineDraft(jobToEditDraft(job));
      setDraft(jobToEditDraft(job));
    }
    setEditing(true);
  };

  if (!id) return null;

  if (jobLoading && !job) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand-100 bg-white py-16 text-slate-500 dark:border-slate-700 dark:bg-slate-900">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" aria-hidden />
        <p className="text-sm font-medium">Loading job…</p>
      </div>
    );
  }

  if (isError || !job || !draft) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        <p className="font-semibold">Could not load job</p>
        <p className="mt-1 text-sm">{error ? getRtkQueryErrorMessage(error) : "Try again later."}</p>
        <Link href="/jobs" className="mt-4 inline-block font-medium text-brand-700 underline dark:text-brand-400">
          Back to jobs
        </Link>
      </div>
    );
  }

  const labelsEmp: Record<Job["employmentType"], string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    remote: "Remote",
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" subtitle="Role summary, pipeline intelligence, and hiring benchmarks." />

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {!editing ? (
              <Button type="button" variant="secondary" size="sm" onClick={startEditing}>
                Edit
              </Button>
            ) : (
              <>
                <Button type="button" size="sm" loading={updating} disabled={updating} onClick={() => void handleSave()}>
                  Save changes
                </Button>
                <Button type="button" variant="secondary" size="sm" disabled={updating} onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </>
            )}
            <Button type="button" variant="danger" size="sm" loading={deleting} disabled={deleting || editing} onClick={() => void handleDelete()}>
              Delete job
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Status</span>
            <select
              value={job.status}
              onChange={(e) => void handleStatusChange(e.target.value as Job["status"])}
              className={cn(
                "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100",
              )}
              aria-label="Job status"
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="closed">closed</option>
            </select>
          </div>
        </div>

        {!editing ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{job.title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Posted role</p>
            </div>
            <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-300">Role requirements</h3>
              <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{job.requirements.requirementsTitle}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{job.requirements.requirementsDescription}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Job description</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{job.description}</p>
            </div>
            <dl className="grid gap-3 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Location</dt>
                <dd className="mt-1">{job.location || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Employment</dt>
                <dd className="mt-1">{labelsEmp[job.employmentType]}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Domain</dt>
                <dd className="mt-1">{job.requirements.domain}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Experience band</dt>
                <dd className="mt-1 capitalize">{job.requirements.experienceLevel}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Min. years experience</dt>
                <dd className="mt-1">{job.requirements.minExperienceYears}</dd>
              </div>
              {job.requirements.education ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Education</dt>
                  <dd className="mt-1">{job.requirements.education}</dd>
                </div>
              ) : null}
            </dl>
            {job.requirements.skills?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Skills</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.requirements.skills.map((s) => (
                    <SkillBadge key={s} skill={s} variant="match" />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-4">
            <Input label="Job title" value={draft.title} onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))} />
            <Textarea
              label="Job description"
              rows={6}
              value={draft.description}
              onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
            />
            <Input
              label="Requirements title"
              value={draft.requirementsTitle}
              onChange={(e) => setDraft((d) => (d ? { ...d, requirementsTitle: e.target.value } : d))}
            />
            <Textarea
              label="Requirements description"
              rows={4}
              value={draft.requirementsDescription}
              onChange={(e) => setDraft((d) => (d ? { ...d, requirementsDescription: e.target.value } : d))}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Location" value={draft.location} onChange={(e) => setDraft((d) => (d ? { ...d, location: e.target.value } : d))} />
              <Select
                label="Employment type"
                options={[
                  { label: "Full-time", value: "full_time" },
                  { label: "Part-time", value: "part_time" },
                  { label: "Contract", value: "contract" },
                  { label: "Remote", value: "remote" },
                ]}
                value={draft.employmentType}
                onChange={(e) => setDraft((d) => (d ? { ...d, employmentType: e.target.value as Job["employmentType"] } : d))}
              />
            </div>
            <Input label="Domain" value={draft.domain} onChange={(e) => setDraft((d) => (d ? { ...d, domain: e.target.value } : d))} />
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Experience band"
                options={[
                  { label: "Junior", value: "junior" },
                  { label: "Mid", value: "mid" },
                  { label: "Senior", value: "senior" },
                ]}
                value={draft.experienceLevel}
                onChange={(e) => {
                  const level = e.target.value as ExperienceLevel;
                  const years = level === "junior" ? 1 : level === "senior" ? 7 : 3;
                  setDraft((d) => (d ? { ...d, experienceLevel: level, minExperienceYears: years } : d));
                }}
              />
              <Input
                label="Minimum years experience"
                type="number"
                min={0}
                value={String(draft.minExperienceYears)}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, minExperienceYears: Math.max(0, Math.floor(Number(e.target.value) || 0)) } : d))
                }
              />
            </div>
            <Input
              label="Education (optional)"
              value={draft.education}
              onChange={(e) => setDraft((d) => (d ? { ...d, education: e.target.value } : d))}
            />
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">Required skills</p>
              <TagInput
                showAddButton
                value={draft.skills}
                onChange={(tags) => setDraft((d) => (d ? { ...d, skills: tags } : d))}
                inputValue={skillsInput}
                onInputChange={setSkillsInput}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-brand-100 pt-4 dark:border-slate-700">
          <Link href={`/jobs/${id}/applicants`}>
            <Button variant="secondary" className="w-full sm:w-auto">
              Applicants
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/jobs/${id}/screenings`}>
            <Button className="w-full sm:w-auto">
              Screenings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
