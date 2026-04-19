"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Loader2, Search, Sparkles, WandSparkles, XCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useGetJobsQuery } from "../../store/api/jobsApi";
import { useGetScreeningsQuery, useGetScreeningStatusQuery, useRunScreeningMutation } from "../../store/api/screeningsApi";
import { useGetJobStatsQuery } from "../../store/api/jobsApi";
import toast from "react-hot-toast";

const RUNNING_MESSAGES = [
  "Analyzing profiles...",
  "Scoring candidates...",
  "Ranking results...",
  "Generating AI explanations...",
];

const JobOption = ({
  jobId,
  title,
  selected,
  lastScreenedAt,
  onSelect,
}: {
  jobId: string;
  title: string;
  selected: boolean;
  lastScreenedAt?: string;
  onSelect: (jobId: string) => void;
}) => {
  const { data } = useGetJobStatsQuery(jobId, { skip: !jobId });
  const applicantCount = Number(data?.applicantCount ?? 0);
  const disabled = applicantCount === 0;
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(jobId)}
      disabled={disabled}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected ? "border-brand-500 bg-brand-50 shadow-sm" : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
      } ${disabled ? "cursor-not-allowed opacity-60 hover:border-slate-200 hover:bg-white" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{title}</p>
        <span className="text-xs text-slate-500">
          Last screened {lastScreenedAt ? new Date(lastScreenedAt).toLocaleDateString() : "Never"}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600">{applicantCount} applicant{applicantCount === 1 ? "" : "s"}</p>
      {disabled ? <p className="mt-1 text-xs font-medium text-amber-700">Upload applicants first</p> : null}
    </button>
  );
};

export const RunScreeningModal = ({
  open,
  onClose,
  onCreated,
  initialJobId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (screeningId: string) => void;
  /** When set (e.g. re-run), open on step 2 with this job */
  initialJobId?: string;
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [query, setQuery] = useState("");
  const [jobId, setJobId] = useState("");
  const [size, setSize] = useState<10 | 20>(10);
  const [advanced, setAdvanced] = useState(false);
  const [weights, setWeights] = useState({ skills: 50, experience: 30, education: 20 });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [activeScreeningId, setActiveScreeningId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const completionHandled = useRef(false);

  const [runScreening] = useRunScreeningMutation();
  const { data: jobsData } = useGetJobsQuery({ page: 1, limit: 100, status: "active" }, { skip: !open });
  const { data: screeningData } = useGetScreeningsQuery(undefined, { skip: !open });

  const { data: polledScreening } = useGetScreeningStatusQuery(activeScreeningId ?? "_", {
    skip: !activeScreeningId,
    pollingInterval: activeScreeningId ? 2000 : 0,
  });

  const jobs = jobsData?.jobs ?? [];
  const lastByJob = useMemo(
    () =>
      new Map(
        [...(screeningData?.screenings ?? [])]
          .sort((a, b) => +new Date(b.updatedAt ?? b.createdAt) - +new Date(a.updatedAt ?? a.createdAt))
          .map((item) => [item.jobId, item.updatedAt ?? item.createdAt]),
      ),
    [screeningData?.screenings],
  );
  const filteredJobs = useMemo(() => {
    if (!query.trim()) return jobs;
    const q = query.toLowerCase();
    return jobs.filter((job) => job.title.toLowerCase().includes(q));
  }, [jobs, query]);
  const selectedJob = jobs.find((job) => job._id === jobId);
  const totalWeight = weights.skills + weights.experience + weights.education;

  const polling = Boolean(
    activeScreeningId &&
      polledScreening &&
      polledScreening.status !== "completed" &&
      polledScreening.status !== "failed",
  );

  const preventClose = step === 3 && !error && (isStarting || polling);

  useEffect(() => {
    if (!open) {
      completionHandled.current = false;
      setStep(1);
      setQuery("");
      setJobId("");
      setSize(10);
      setAdvanced(false);
      setWeights({ skills: 50, experience: 30, education: 20 });
      setProgress(0);
      setError("");
      setActiveScreeningId(null);
      setIsStarting(false);
      setMsgIdx(0);
      return;
    }
    completionHandled.current = false;
    setQuery("");
    setError("");
    setProgress(0);
    setActiveScreeningId(null);
    setIsStarting(false);
    setMsgIdx(0);
    setSize(10);
    setAdvanced(false);
    setWeights({ skills: 50, experience: 30, education: 20 });
    if (initialJobId) {
      setJobId(initialJobId);
      setStep(2);
    } else {
      setJobId("");
      setStep(1);
    }
  }, [open, initialJobId]);

  useEffect(() => {
    const st = polledScreening?.status;
    if (!st || !activeScreeningId) return;
    if (st === "queued") setProgress(38);
    else if (st === "running") setProgress(74);
    else if (st === "completed") setProgress(100);
  }, [polledScreening?.status, activeScreeningId]);

  useEffect(() => {
    if (!polledScreening || !activeScreeningId || completionHandled.current) return;
    const doc = polledScreening as { _id?: unknown; status?: string; errorMessage?: string };
    if (polledScreening.status === "failed") {
      setError(String((doc as { error?: unknown; errorMessage?: unknown }).error ?? doc.errorMessage ?? "Screening failed."));
      setActiveScreeningId(null);
      setProgress(0);
      return;
    }
    if (polledScreening.status === "completed") {
      completionHandled.current = true;
      const id = String(doc._id ?? activeScreeningId);
      const jobTitle = selectedJob?.title ?? "the selected job";
      setActiveScreeningId(null);
      onClose();
      toast.success(`Screening complete — Top ${size} candidates shortlisted for ${jobTitle}.`);
      onCreated?.(id);
    }
  }, [polledScreening, activeScreeningId, onClose, onCreated, selectedJob?.title, size]);

  const close = () => {
    onClose();
  };

  const isAwaitingUi = step === 3 && !error && (isStarting || polling);

  useEffect(() => {
    if (!isAwaitingUi) return;
    const t = window.setInterval(() => setMsgIdx((i) => (i + 1) % RUNNING_MESSAGES.length), 2500);
    return () => window.clearInterval(t);
  }, [isAwaitingUi]);

  const run = async () => {
    if (!jobId) return;
    if (advanced && totalWeight !== 100) return;
    setError("");
    setStep(3);
    setProgress(12);
    setIsStarting(true);
    try {
      const res = await runScreening({
        jobId,
        shortlistSize: size,
        weights: {
          skills: weights.skills,
          experience: weights.experience,
          education: weights.education,
        },
      }).unwrap();
      setIsStarting(false);
      setActiveScreeningId(String(res.screeningId));
      setProgress(28);
    } catch (err) {
      setIsStarting(false);
      setProgress(0);
      setError((err as { data?: { error?: string } })?.data?.error ?? "Screening failed. Please retry.");
    }
  };

  return (
    <Modal open={open} onClose={close} preventClose={preventClose}>
      {step !== 3 ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{step === 1 ? "Run AI Screening" : "Configure Screening"}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {step === 1 ? "Select a job to screen candidates for" : "Tune shortlist size and scoring settings"}
            </p>
          </div>
          <button type="button" onClick={close} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs..." className="pl-9" />
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {filteredJobs.map((job) => (
              <JobOption
                key={job._id}
                jobId={job._id}
                title={job.title}
                selected={jobId === job._id}
                lastScreenedAt={lastByJob.get(job._id)}
                onSelect={setJobId}
              />
            ))}
          </div>
          <Button className="w-full" disabled={!jobId} onClick={() => setStep(2)}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[10, 20].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSize(v as 10 | 20)}
                className={`rounded-xl border p-3 text-left ${size === v ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}
              >
                <p className="font-semibold text-slate-900">Top {v}</p>
                <p className="text-xs text-slate-600">Shortlist top-ranked candidates</p>
              </button>
            ))}
          </div>

          <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => setAdvanced((v) => !v)}>
            {advanced ? "Hide advanced weights" : "Show advanced scoring weights"}
          </button>

          {advanced ? (
            <div className="space-y-3 rounded-xl border border-slate-200 p-3">
              {(
                [
                  ["skills", "Skills Match weight"],
                  ["experience", "Experience weight"],
                  ["education", "Education weight"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm text-slate-700">
                  <div className="mb-1 flex justify-between">
                    <span>{label}</span>
                    <span>{weights[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[key]}
                    onChange={(e) => setWeights((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-full accent-brand-600"
                  />
                </label>
              ))}
              <p className={`text-xs ${totalWeight === 100 ? "text-emerald-600" : "text-red-600"}`}>Weights total: {totalWeight}% (must be 100%)</p>
            </div>
          ) : null}

          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {size} candidates will be shortlisted for <span className="font-semibold">{selectedJob?.title}</span>.
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="flex-1" onClick={() => void run()} disabled={advanced && totalWeight !== 100}>
              <Sparkles className="h-4 w-4" />
              Start Screening
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5 py-4 text-center">
          {error ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                <XCircle className="h-7 w-7" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900">Screening failed</h4>
              <p className="text-sm text-slate-600">{error}</p>
              <Button className="w-full" onClick={() => setStep(2)}>
                Retry
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                {progress < 100 ? <Brain className="h-7 w-7 animate-pulse" /> : <WandSparkles className="h-7 w-7" />}
              </div>
              <h4 className="text-lg font-semibold text-slate-900">Running AI Screening</h4>
              <p className="text-sm text-slate-600">{RUNNING_MESSAGES[msgIdx % RUNNING_MESSAGES.length]}</p>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs font-semibold text-brand-700">{progress}%</p>
              {progress < 100 ? <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-700" /> : null}
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
};
