"use client";

import { useParams } from "next/navigation";
import { useGetApplicantsQuery } from "../../../../../store/api/applicantsApi";
import { PageHeader } from "../../../../../components/layout/PageHeader";
import { UmuravaIngestForm } from "../../../../../components/applicants/UmuravaIngestForm";
import { ExternalUploadForm } from "../../../../../components/applicants/ExternalUploadForm";
import { ApplicantTable } from "../../../../../components/applicants/ApplicantTable";
import { Card } from "../../../../../components/ui/Card";

export default function JobApplicantsPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const { data } = useGetApplicantsQuery({ jobId, page: 1, limit: 50 });
  return (
    <div className="space-y-8">
      <PageHeader title="Applicants" subtitle="Ingest structured Umurava profiles or external CSV / PDF resumes for this job." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">From Umurava Platform</h3>
          <p className="mb-4 text-sm text-slate-600">Structured profiles from your talent marketplace.</p>
          <UmuravaIngestForm jobId={jobId} />
        </Card>
        <Card>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">From External Sources</h3>
          <p className="mb-4 text-sm text-slate-600">Resumes and spreadsheets from outside Umurava.</p>
          <ExternalUploadForm jobId={jobId} />
        </Card>
      </div>
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Applicant list</h3>
        <ApplicantTable
          applicants={data?.applicants ?? []}
          onDelete={() => {}}
          onStatusChange={() => {}}
          onClearFilters={() => {}}
          hasActiveFilters={false}
          onOpenUpload={() => {}}
        />
      </Card>
    </div>
  );
}
