"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FileText, Sparkles, Upload, XCircle } from "lucide-react";
import { useGetApplicantsQuery } from "../../../../../store/api/applicantsApi";
import { useGetJobQuery } from "../../../../../store/api/jobsApi";
import {
  useGetJobScreeningsQuery,
  useGetScreeningResultsQuery,
  useRunScreeningForJobMutation,
} from "../../../../../store/api/screeningsApi";
import { PageHeader } from "../../../../../components/layout/PageHeader";
import { AcceptanceOutreachPanel } from "../../../../../components/screenings/AcceptanceOutreachPanel";
import { UmuravaIngestForm } from "../../../../../components/applicants/UmuravaIngestForm";
import { ExternalUploadForm } from "../../../../../components/applicants/ExternalUploadForm";
import { ApplicantTable } from "../../../../../components/applicants/ApplicantTable";
import { Card } from "../../../../../components/ui/Card";
import { Button } from "../../../../../components/ui/Button";
import { Modal } from "../../../../../components/ui/Modal";
import { getRtkQueryErrorMessage } from "../../../../../lib/rtkError";

/** Surface server-side `message` first (e.g. "No pending applicants"), then RTK helper. */
function outreachDecisionsFromMeta(raw: unknown): Record<string, { decision?: string; congratsEmailSentAt?: string }> {
  if (raw == null || typeof raw !== "object") return {};
  const out: Record<string, { decision?: string; congratsEmailSentAt?: string }> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v && typeof v === "object" && "decision" in v) {
      const o = v as Record<string, unknown>;
      out[k] = {
        decision: String(o.decision),
        congratsEmailSentAt: typeof o.congratsEmailSentAt === "string" ? o.congratsEmailSentAt : undefined,
      };
    }
  }
  return out;
}

function runErrorMessage(err: unknown): string {
  const e = err as { status?: number; data?: { error?: string; message?: string } };
  if (typeof e?.data?.message === "string" && e.data.message.trim()) return e.data.message;
  if (typeof e?.data?.error === "string" && e.data.error.trim()) return e.data.error;
  return getRtkQueryErrorMessage(err, "Screening failed. Please try again.");
}

type UploadMode = null | "umurava" | "external";

export default function JobApplicantsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;

  const { data } = useGetApplicantsQuery({ jobId, page: 1, limit: 50 });
  const { data: job } = useGetJobQuery(jobId, { skip: !jobId });
  const { data: jobScreenings } = useGetJobScreeningsQuery(jobId, { skip: !jobId });

  const latestCompletedScreeningId = useMemo(() => {
    const rows = (jobScreenings as Array<{ _id?: string; status?: string; createdAt?: string }> | undefined) ?? [];
    const done = rows.filter((r) => r.status === "completed");
    done.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return done[0]?._id ?? "";
  }, [jobScreenings]);

  const { data: latestScreeningResults } = useGetScreeningResultsQuery(latestCompletedScreeningId, {
    skip: !latestCompletedScreeningId,
  });

  const acceptanceOutreach = useMemo(() => {
    if (!latestScreeningResults?.ranked?.length || !latestCompletedScreeningId) return null;
    const dec = outreachDecisionsFromMeta(latestScreeningResults.meta?.recruiterDecisions);
    const approved = latestScreeningResults.ranked
      .map((r) => {
        const id = String(r.applicant?._id ?? "");
        if (!id || dec[id]?.decision !== "approved") return null;
        return {
          id,
          name: String(r.applicant?.parsed_profile?.name ?? "Candidate"),
          email: String(r.applicant?.parsed_profile?.email ?? ""),
          congratsEmailSentAt: dec[id]?.congratsEmailSentAt,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      email: string;
      congratsEmailSentAt?: string;
    }>;
    if (approved.length === 0) return null;
    return { screeningId: latestCompletedScreeningId, approved };
  }, [latestScreeningResults, latestCompletedScreeningId]);

  const [uploadMode, setUploadMode] = useState<UploadMode>(null);
  const [runForJob, { isLoading: running }] = useRunScreeningForJobMutation();

  const applicants = data?.applicants ?? [];
  const hasApplicants = applicants.length > 0;

  const handleRunScreening = async () => {
    const toastId = toast.loading("Running AI screening on this job's applicants…");
    try {
      const res = await runForJob({ jobId, shortlistSize: 10 }).unwrap();
      const sid = res.screeningId;
      if (!sid) throw new Error("Screening did not return an id.");
      toast.success("Screening complete.", { id: toastId });
      router.push(`/screenings/${sid}`);
    } catch (err) {
      toast.error(runErrorMessage(err), { id: toastId });
    }
  };

  const jobTitleById = useMemo<Record<string, string>>(
    () => (job ? { [job._id]: job.title } : {}),
    [job],
  );

  const subtitle = hasApplicants
    ? `${applicants.length} applicant${applicants.length === 1 ? "" : "s"} for this job. Run AI screening or add more candidates.`
    : "No applicants yet — upload from Umurava or from a PDF / CSV / Excel file to get started.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageHeader title="Applicants" subtitle={subtitle} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => void handleRunScreening()}
            loading={running}
            disabled={!hasApplicants || running}
            title={hasApplicants ? "Run AI screening on this job's applicants" : "Add applicants first"}
          >
            <Sparkles className="h-4 w-4" />
            Run AI Screening
          </Button>
          <Button variant="secondary" onClick={() => setUploadMode("umurava")}>
            <FileText className="h-4 w-4" />
            Upload from Umurava
          </Button>
          <Button variant="secondary" onClick={() => setUploadMode("external")}>
            <Upload className="h-4 w-4" />
            Upload PDF / CSV
          </Button>
        </div>
      </div>

      {latestCompletedScreeningId ? (
        acceptanceOutreach ? (
          <AcceptanceOutreachPanel
            screeningId={acceptanceOutreach.screeningId}
            jobTitle={job?.title}
            approved={acceptanceOutreach.approved}
          />
        ) : (
          <Card className="border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-900/30">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Candidate emails</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Your latest screening for this job is complete. After you{" "}
              <span className="font-medium">Accept</span> shortlisted candidates on the screening page, you can send a
              shared congratulations message to all of them from this job view.
            </p>
            <Link
              href={`/screenings/${latestCompletedScreeningId}`}
              className="mt-3 inline-flex text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Open latest screening →
            </Link>
          </Card>
        )
      ) : null}

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Applicant list</h3>
          {hasApplicants ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {applicants.length} total • pending applicants are eligible for screening
            </span>
          ) : null}
        </div>
        <ApplicantTable
          applicants={applicants}
          onDelete={() => {}}
          onClearFilters={() => {}}
          hasActiveFilters={false}
          onOpenUpload={() => setUploadMode("external")}
          jobTitleById={jobTitleById}
        />
      </Card>

      <UploadModal
        open={uploadMode !== null}
        mode={uploadMode}
        onClose={() => setUploadMode(null)}
        jobId={jobId}
      />
    </div>
  );
}

function UploadModal({
  open,
  mode,
  onClose,
  jobId,
}: {
  open: boolean;
  mode: UploadMode;
  onClose: () => void;
  jobId: string;
}) {
  const isUmurava = mode === "umurava";
  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {isUmurava ? "Upload from Umurava" : "Upload PDF / CSV / Excel"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {isUmurava
              ? "Paste a JSON array of UmuravaProfile objects from the talent marketplace."
              : "Upload resume PDFs or a spreadsheet of applicants."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700"
          aria-label="Close"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>
      {isUmurava ? <UmuravaIngestForm jobId={jobId} /> : null}
      {mode === "external" ? <ExternalUploadForm jobId={jobId} /> : null}
    </Modal>
  );
}
