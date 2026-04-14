"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { useGetApplicantsQuery } from "../../../store/api/applicantsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { ApplicantTable } from "../../../components/applicants/ApplicantTable";
import { ExternalUploadForm } from "../../../components/applicants/ExternalUploadForm";
import { UmuravaIngestForm } from "../../../components/applicants/UmuravaIngestForm";
import { Modal } from "../../../components/ui/Modal";
import { cn, compactSelectClassName } from "../../../lib/utils";

export default function ApplicantsPage() {
  const [openUpload, setOpenUpload] = useState(false);
  const [tab, setTab] = useState<"umurava" | "csv" | "pdf">("umurava");
  const { data: jobsData } = useGetJobsQuery({ page: 1, limit: 50 });
  const [jobId, setJobId] = useState("");

  const selectedJob = useMemo(() => {
    const first = jobsData?.jobs[0]?._id ?? "";
    return jobId || first;
  }, [jobId, jobsData?.jobs]);

  const { data: applicantsData } = useGetApplicantsQuery(
    { jobId: selectedJob, page: 1, limit: 100 },
    { skip: !selectedJob },
  );

  const applicants = applicantsData?.applicants ?? [];
  const stats = {
    total: applicants.length,
    pending: applicants.filter((a) => a.status === "pending").length,
    shortlisted: applicants.filter((a) => a.status === "shortlisted").length,
    rejected: applicants.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Applicants" subtitle="Manage applicants and ingestion workflows from all sources." />
        <div className="flex gap-2">
          <select
            value={selectedJob}
            onChange={(e) => setJobId(e.target.value)}
            className={cn(compactSelectClassName, "px-4 py-2 text-sm")}
            aria-label="Select job for applicants"
          >
            {(jobsData?.jobs ?? []).map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOpenUpload(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white outline-none transition hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {Object.entries(stats).map(([k, v]) => (
          <Card key={k}>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</p>
            <p className="mt-2 text-2xl font-bold text-brand-700">{v}</p>
          </Card>
        ))}
      </div>
      <Card>
        <ApplicantTable applicants={applicants} />
      </Card>

           <Modal open={openUpload} onClose={() => setOpenUpload(false)}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upload Applicants</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("umurava")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/40",
                tab === "umurava" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
              )}
            >
              Umurava Profiles
            </button>
            <button
              type="button"
              onClick={() => setTab("csv")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/40",
                tab === "csv" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
              )}
            >
              Upload CSV
            </button>
            <button
              type="button"
              onClick={() => setTab("pdf")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/40",
                tab === "pdf" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
              )}
            >
              Upload PDF
            </button>
          </div>
          <Card>
            {tab === "umurava" ? (
              <UmuravaIngestForm jobId={selectedJob} />
            ) : (
              <ExternalUploadForm key={tab} jobId={selectedJob} initialFileType={tab === "csv" ? "csv" : "pdf"} />
            )}
          </Card>
        </div>
      </Modal>
    </div>
  );
}
