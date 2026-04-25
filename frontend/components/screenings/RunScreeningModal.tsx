"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Database, FileSpreadsheet, FileText, Link2, Loader2, Upload, WandSparkles, XCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useGetJobsQuery } from "../../store/api/jobsApi";
import {
  useRunPlatformScreeningMutation,
  useRunExternalScreeningMutation,
} from "../../store/api/screeningsApi";
import { useExternalIngestApplicantsMutation, useGetApplicantsQuery, useUploadFilesMutation } from "../../store/api/applicantsApi";
import type { Job } from "../../types";
import toast from "react-hot-toast";
import { getRtkQueryErrorMessage } from "../../lib/rtkError";

type Step = 1 | 2 | 3 | 4;
type Scenario = "umurava" | "external" | null;

const formatJobLabel = (job: Job) => {
  const domain = job.requirements?.domain?.trim() || "—";
  const loc = job.location?.trim() || "—";
  return `${job.title} — ${domain} — ${loc}`;
};

/** Prefer API `message`, then RTK helper; handle quota / timeout status codes. */
function screeningErrorMessage(err: unknown): string {
  const e = err as { status?: number; data?: { error?: string; message?: string } };
  if (typeof e?.data?.message === "string" && e.data.message.trim()) return e.data.message;
  if (typeof e?.data?.error === "string" && e.data.error.trim()) return e.data.error;
  const base = getRtkQueryErrorMessage(err, "");
  const text = base || "Screening failed. Please try again.";
  if (e?.status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(text)) {
    return "Gemini quota exceeded. Please wait a few minutes and try again.";
  }
  if (e?.status === 504 || e?.status === 408 || /timed out|timeout/i.test(text)) {
    return "Request timed out. Try Top 10 instead of Top 20, or retry in a moment.";
  }
  return text;
}

export const RunScreeningModal = ({
  open,
  onClose,
  onCreated,
  initialJobId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (screeningId: string) => void;
  initialJobId?: string;
}) => {
  const [step, setStep] = useState<Step>(1);
  const [jobId, setJobId] = useState("");
  const [scenario, setScenario] = useState<Scenario>(null);
  const [topN, setTopN] = useState<10 | 20>(10);
  const [error, setError] = useState("");

  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [resumeLinksText, setResumeLinksText] = useState("");
  const [analyzeCandidateCount, setAnalyzeCandidateCount] = useState(0);

  const { data: jobsData, isLoading: jobsLoading, isError: jobsError } = useGetJobsQuery(
    { page: 1, limit: 200 },
    { skip: !open },
  );
  const [runPlatform, { isLoading: platformLoading }] = useRunPlatformScreeningMutation();
  const [runExternal, { isLoading: externalRunLoading }] = useRunExternalScreeningMutation();
  const [uploadFile] = useUploadFilesMutation();
  const [externalIngest] = useExternalIngestApplicantsMutation();

  const { data: pendingUmurava, isFetching: pendingUmuravaLoading } = useGetApplicantsQuery(
    { jobId, limit: 500, page: 1, status: "pending", source: "umurava_platform" },
    { skip: !open || !jobId },
  );
  const pendingPlatformCount = pendingUmurava?.total ?? pendingUmurava?.applicants?.length ?? 0;

  const jobs = jobsData?.jobs ?? [];
  const selectedJob = jobs.find((j) => j._id === jobId);

  const resetForm = useCallback(() => {
    setStep(1);
    setJobId("");
    setScenario(null);
    setTopN(10);
    setError("");
    setPdfFiles([]);
    setCsvFile(null);
    setExcelFile(null);
    setResumeLinksText("");
    setAnalyzeCandidateCount(0);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    setError("");
    if (initialJobId) {
      setJobId(initialJobId);
      setStep(2);
    } else {
      setJobId("");
      setStep(1);
      setScenario(null);
    }
  }, [open, initialJobId, resetForm]);

  const uploadOne = async (file: File, fileType: "pdf" | "csv" | "excel") => {
    const fd = new FormData();
    fd.append("jobId", jobId);
    fd.append("fileType", fileType);
    fd.append("file", file);
    await uploadFile({ jobId, formData: fd }).unwrap();
  };

  const handlePlatformRun = async () => {
    if (!jobId) return;
    setError("");
    setAnalyzeCandidateCount(pendingPlatformCount);
    setStep(4);
    try {
      const res = await runPlatform({ jobId, topN }).unwrap();
      const id = res.screeningId;
      if (!id) throw new Error("Missing screening id");
      toast.success("Screening complete.");
      onCreated?.(id);
      onClose();
    } catch (err) {
      setStep(3);
      const msg = screeningErrorMessage(err);
      setError(msg);
      toast.error(msg);
    }
  };

  const handleExternalRun = async () => {
    if (!jobId) return;
    setError("");

    const links = resumeLinksText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const hasInputs = pdfFiles.length > 0 || csvFile || excelFile || links.length > 0;
    if (!hasInputs) {
      const msg = "Add at least one PDF, spreadsheet, or resume link.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setStep(4);
    try {
      for (const file of pdfFiles) {
        await uploadOne(file, "pdf");
      }
      if (csvFile) await uploadOne(csvFile, "csv");
      if (excelFile) await uploadOne(excelFile, "excel");

      if (links.length) {
        await externalIngest({ jobId, resumeLinks: links }).unwrap();
      }

      const res = await runExternal({ jobId, topN }).unwrap();
      const id = res.screeningId;
      if (!id) throw new Error("Missing screening id");
      toast.success("Screening complete.");
      onCreated?.(id);
      onClose();
    } catch (err) {
      setStep(3);
      const msg = screeningErrorMessage(err);
      setError(msg);
      toast.error(msg);
    }
  };

  const busy = platformLoading || externalRunLoading || step === 4;
  const preventClose = busy;

  const close = () => {
    if (preventClose) return;
    onClose();
  };

  const goScenario = (s: Scenario) => {
    setScenario(s);
    setStep(3);
    setError("");
  };

  const pdfInputId = "run-screening-pdfs";
  const csvInputId = "run-screening-csv";
  const excelInputId = "run-screening-excel";

  const isExternalStep = step === 3 && scenario === "external";

  return (
    <Modal open={open} onClose={close} preventClose={preventClose} size={isExternalStep ? "sm" : "md"}>
      {step !== 4 ? (
        <div className={`flex items-start justify-between gap-3 ${isExternalStep ? "mb-2.5" : "mb-4"}`}>
          <div>
            <h3 className={`font-semibold text-slate-900 ${isExternalStep ? "text-base" : "text-lg"}`}>
              {step === 1 && "Run AI Screening"}
              {step === 2 && "Choose scenario"}
              {step === 3 && (scenario === "umurava" ? "Umurava platform screening" : "External sources")}
            </h3>
            <p className={`text-slate-600 ${isExternalStep ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>
              {step === 1 && "Select the job you want to screen candidates for."}
              {step === 2 && "Pick how candidates are sourced for this run."}
              {step === 3 && scenario === "umurava" && "Confirm shortlist size and run using Umurava talent profiles."}
              {step === 3 && scenario === "external" && "Upload files and/or paste resume links."}
            </p>
          </div>
          <button type="button" onClick={close} disabled={preventClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40">
            <XCircle className={isExternalStep ? "h-4 w-4" : "h-5 w-5"} />
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="job-select">
            Job
          </label>
          <div className="relative">
            <select
              id="job-select"
              value={jobId}
              disabled={jobsLoading || jobsError}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
            >
              <option value="">
                {jobsLoading ? "Loading jobs…" : jobsError ? "Could not load jobs" : "Select a job…"}
              </option>
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {formatJobLabel(job)}
                </option>
              ))}
            </select>
            {jobsLoading ? (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            ) : null}
          </div>
          {jobsError ? <p className="text-sm text-red-600">Check your connection and try again.</p> : null}
          <Button className="w-full" disabled={!jobId || jobsLoading} onClick={() => setStep(2)}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => goScenario("umurava")}
              className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <Database className="mb-2 h-8 w-8 text-brand-600" />
              <p className="font-semibold text-slate-900">Screen from Umurava Platform</p>
              <p className="mt-1 text-xs text-slate-600">Use structured talent profiles from the Umurava database (pending applicants for this job).</p>
            </button>
            <button
              type="button"
              onClick={() => goScenario("external")}
              className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <Upload className="mb-2 h-8 w-8 text-brand-600" />
              <p className="font-semibold text-slate-900">Screen from External Sources</p>
              <p className="mt-1 text-xs text-slate-600">Upload PDFs, CSV/Excel, or paste resume links — then score uploaded candidates.</p>
            </button>
          </div>
          <Button variant="secondary" className="w-full" type="button" onClick={() => setStep(1)}>
            Back
          </Button>
        </div>
      ) : null}

      {step === 3 && scenario === "umurava" ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            Job: <span className="font-semibold">{selectedJob ? formatJobLabel(selectedJob) : jobId}</span>
          </p>
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2 text-sm text-brand-900">
            {pendingUmuravaLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Counting pending applicants…
              </span>
            ) : (
              <>
                <span className="font-semibold">{pendingPlatformCount}</span> Umurava candidate
                {pendingPlatformCount === 1 ? "" : "s"} with status <span className="font-medium">pending</span> will be sent to the AI
                scorer (Gemini).
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([10, 20] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTopN(v)}
                className={`rounded-xl border p-3 text-left ${topN === v ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}
              >
                <p className="font-semibold text-slate-900">Top {v}</p>
                <p className="text-xs text-slate-600">Shortlist size</p>
              </button>
            ))}
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              className="flex-1"
              type="button"
              disabled={platformLoading || pendingPlatformCount === 0 || pendingUmuravaLoading}
              onClick={() => void handlePlatformRun()}
            >
              <WandSparkles className="h-4 w-4" />
              Run AI Screening
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 && scenario === "external" ? (
        <div className="space-y-2.5">
          <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
            Job: <span className="font-semibold">{selectedJob ? formatJobLabel(selectedJob) : jobId}</span>
          </p>

          <div className="grid grid-cols-2 gap-2">
            {([10, 20] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTopN(v)}
                className={`rounded-lg border px-2.5 py-1.5 text-left ${topN === v ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}
              >
                <p className="text-sm font-semibold text-slate-900">Top {v}</p>
                <p className="text-[11px] text-slate-600">Shortlist size</p>
              </button>
            ))}
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-800">
              <FileText className="h-3.5 w-3.5 text-brand-600" />
              PDF resumes
            </p>
            <label
              htmlFor={pdfInputId}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-3 py-3 text-center text-xs text-slate-600 hover:bg-slate-50"
            >
              <Upload className="mb-1 h-4 w-4 text-brand-600" />
              Drag & drop PDFs or click to browse
              <input
                id={pdfInputId}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : [];
                  setPdfFiles(list);
                }}
              />
            </label>
            {pdfFiles.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                {pdfFiles.map((f) => (
                  <li key={f.name + f.size}>{f.name}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-800">
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand-600" />
                CSV
              </p>
              <label htmlFor={csvInputId} className="block cursor-pointer truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-brand-700 hover:bg-slate-50">
                {csvFile ? csvFile.name : "Choose CSV…"}
                <input
                  id={csvInputId}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-800">
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand-600" />
                Excel
              </p>
              <label htmlFor={excelInputId} className="block cursor-pointer truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-brand-700 hover:bg-slate-50">
                {excelFile ? excelFile.name : "Choose Excel…"}
                <input
                  id={excelInputId}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-800">
              <Link2 className="h-3.5 w-3.5 text-brand-600" />
              Resume links (one URL per line)
            </p>
            <textarea
              value={resumeLinksText}
              onChange={(e) => setResumeLinksText(e.target.value)}
              placeholder={"https://example.com/resume.pdf"}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button className="flex-1" type="button" disabled={externalRunLoading} onClick={() => void handleExternalRun()}>
              <WandSparkles className="h-4 w-4" />
              Run Screening
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-5 py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Brain className="h-7 w-7 animate-pulse" />
          </div>
          <h4 className="text-lg font-semibold text-slate-900">AI is screening candidates…</h4>
          <p className="text-sm text-slate-600">
            {scenario === "umurava" && analyzeCandidateCount > 0
              ? `AI is analyzing ${analyzeCandidateCount} candidate${analyzeCandidateCount === 1 ? "" : "s"}…`
              : "This may take a minute while profiles are scored and ranked."}
          </p>
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-700" />
        </div>
      ) : null}
    </Modal>
  );
};
