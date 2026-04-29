"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  Database,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  Upload,
  WandSparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useGetJobsQuery } from "../../store/api/jobsApi";
import {
  useRunPlatformScreeningMutation,
  useRunExternalScreeningMutation,
} from "../../store/api/screeningsApi";
import {
  useExternalIngestApplicantsMutation,
  useGetApplicantsQuery,
  useUploadFilesMutation,
} from "../../store/api/applicantsApi";
import type { Job } from "../../types";
import toast from "react-hot-toast";
import { getRtkQueryErrorMessage } from "../../lib/rtkError";

type Step = 1 | 2 | 3 | 4;
type Scenario = "umurava" | "external" | "direct" | null;

const formatJobLabel = (job: Job) => {
  const domain = job.requirements?.domain?.trim() || "—";
  const loc = job.location?.trim() || "—";
  return `${job.title} — ${domain} — ${loc}`;
};

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

  const handleDirectRun = async () => {
    if (!jobId) return;
    setError("");
    setStep(4);
    try {
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

  const stepTitle =
    step === 1
      ? "Run AI Screening"
      : step === 2
        ? "How would you like to run it?"
        : step === 3 && scenario === "umurava"
          ? "Umurava platform screening"
          : step === 3 && scenario === "external"
            ? "Add files & run"
            : step === 3 && scenario === "direct"
              ? "Run screening now"
              : "";

  const stepSubtitle =
    step === 1
      ? "Select the job you want to screen candidates for."
      : step === 2
        ? "Pick an action below — you can upload new files or run directly."
        : step === 3 && scenario === "umurava"
          ? "Confirm shortlist size and run using Umurava talent profiles."
          : step === 3 && scenario === "external"
            ? "Upload files and/or paste resume links, then run."
            : step === 3 && scenario === "direct"
              ? "Run the AI scorer on all candidates already ingested for this job."
              : "";

  return (
    <Modal open={open} onClose={close} preventClose={preventClose} size={isExternalStep ? "sm" : "md"}>
      <style>{`
        @keyframes screening-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>

      {step !== 4 ? (
        <div className={`flex items-start justify-between gap-3 ${isExternalStep ? "mb-2.5" : "mb-4"}`}>
          <div>
            <h3 className={`font-semibold text-slate-900 ${isExternalStep ? "text-base" : "text-lg"}`}>
              {stepTitle}
            </h3>
            <p className={`text-slate-600 ${isExternalStep ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>
              {stepSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={preventClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
          >
            <XCircle className={isExternalStep ? "h-4 w-4" : "h-5 w-5"} />
          </button>
        </div>
      ) : null}

      {/* ── Step 1: Job selection ── */}
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

      {/* ── Step 2: Action choice (3 options) ── */}
      {step === 2 ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => goScenario("umurava")}
            className="flex w-full items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/50"
          >
            <Database className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" />
            <div>
              <p className="font-semibold text-slate-900">Run from Umurava Platform</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Score pending talent profiles already in the Umurava database for this job.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => goScenario("external")}
            className="flex w-full items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/50"
          >
            <Upload className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" />
            <div>
              <p className="font-semibold text-slate-900">Add more PDF / CSV / Excel</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Upload new files or paste resume links — they get ingested and added to the applicants list, then screened.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => goScenario("direct")}
            className="flex w-full items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/50"
          >
            <Zap className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" />
            <div>
              <p className="font-semibold text-slate-900">Run screening directly</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Run the AI scorer now on all candidates already in the system for this job — no upload needed.
              </p>
            </div>
          </button>

          <Button variant="secondary" className="w-full" type="button" onClick={() => setStep(1)}>
            Back
          </Button>
        </div>
      ) : null}

      {/* ── Step 3a: Umurava confirm ── */}
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
                {pendingPlatformCount === 1 ? "" : "s"} with status{" "}
                <span className="font-medium">pending</span> will be sent to the AI scorer.
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

      {/* ── Step 3b: External upload + run ── */}
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
              <label
                htmlFor={csvInputId}
                className="block cursor-pointer truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-brand-700 hover:bg-slate-50"
              >
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
              <label
                htmlFor={excelInputId}
                className="block cursor-pointer truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-brand-700 hover:bg-slate-50"
              >
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
            <Button
              className="flex-1"
              type="button"
              disabled={externalRunLoading}
              onClick={() => void handleExternalRun()}
            >
              <WandSparkles className="h-4 w-4" />
              Upload & Run
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── Step 3c: Direct run (no upload) ── */}
      {step === 3 && scenario === "direct" ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            Job: <span className="font-semibold">{selectedJob ? formatJobLabel(selectedJob) : jobId}</span>
          </p>
          <p className="rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2 text-sm text-brand-900">
            The AI will score all candidates already ingested for this job — no new files needed.
          </p>
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
              disabled={externalRunLoading}
              onClick={() => void handleDirectRun()}
            >
              <Zap className="h-4 w-4" />
              Run Screening
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── Step 4: Progress / loading ── */}
      {step === 4 ? (
        <div className="space-y-6 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Brain className="h-7 w-7 animate-pulse" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-slate-900">AI is screening candidates…</h4>
            <p className="mt-1 text-sm text-slate-500">
              {scenario === "umurava" && analyzeCandidateCount > 0
                ? `Analyzing ${analyzeCandidateCount} candidate${analyzeCandidateCount === 1 ? "" : "s"} — this takes about a minute.`
                : "Scoring and ranking candidates — this takes about a minute."}
            </p>
          </div>
          <div className="mx-auto w-full max-w-xs overflow-hidden rounded-full bg-slate-100" style={{ height: "6px" }}>
            <div
              className="h-full rounded-full bg-brand-500"
              style={{
                width: "40%",
                animation: "screening-bar 1.8s ease-in-out infinite",
              }}
            />
          </div>
          <p className="text-xs text-slate-400">Please keep this window open</p>
        </div>
      ) : null}
    </Modal>
  );
};
