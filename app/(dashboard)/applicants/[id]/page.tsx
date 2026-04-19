"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, UserCircle2 } from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Card } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { useDeleteApplicantMutation, useGetApplicantQuery } from "../../../../store/api/applicantsApi";
import { getRtkQueryErrorMessage } from "../../../../lib/rtkError";

export default function ApplicantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { data: applicant, isLoading, error } = useGetApplicantQuery(id, { skip: !id });
  const [deleteApplicant, { isLoading: isDeleting }] = useDeleteApplicantMutation();

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
      <PageHeader title={fullName} subtitle={applicant.profile.title} />
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {initials || <UserCircle2 className="h-6 w-6" />}
            </div>
            <div>
              <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                <Mail className="h-3.5 w-3.5" />
                {applicant.profile.email}
              </p>
              {applicant.profile.phone ? <p className="mt-1 text-sm text-slate-600">{applicant.profile.phone}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Job ID: {applicant.jobId}</Badge>
            <Badge variant="neutral">{sourceLabel}</Badge>
            <Badge variant={statusVariant}>{applicant.status}</Badge>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(applicant.profile.skills ?? []).map((skill) => (
              <span key={skill} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-700">
          <strong>Experience:</strong> {applicant.profile.totalYearsExperience ?? applicant.profile.experienceYears ?? "—"} years
        </p>
        <p className="text-sm text-slate-700">
          <strong>Education:</strong>{" "}
          {Array.isArray(applicant.profile.education)
            ? applicant.profile.education.map((e) => e.degree).join(", ") || "N/A"
            : applicant.profile.education ?? "N/A"}
        </p>
        <p className="text-sm text-slate-700">
          <strong>Location:</strong> {applicant.profile.location ?? "N/A"}
        </p>
        <p className="text-sm text-slate-700">
          <strong>Score:</strong> {score != null && !Number.isNaN(score) ? score : "—"}
        </p>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => void handleDelete()}
          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Delete Applicant"}
        </button>
      </Card>
    </div>
  );
}
