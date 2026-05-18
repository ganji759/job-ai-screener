"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Filter, Loader2, Mail, Search, Sparkles, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { useDeleteApplicantMutation, useGetApplicantsQuery, useIngestProfilesMutation, useUploadFilesMutation } from "../../../store/api/applicantsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { ApplicantTable } from "../../../components/applicants/ApplicantTable";
import { Modal } from "../../../components/ui/Modal";
import { cn, compactSelectClassName } from "../../../lib/utils";
import { getRtkQueryErrorMessage } from "../../../lib/rtkError";
import type { UmuravaProfile } from "../../../types";

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-colors"
      style={{
        height: 28,
        padding: "0 12px",
        borderRadius: 999,
        background: active ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.04)",
        border: `1px solid ${active ? "rgba(99,102,241,.45)" : "var(--line)"}`,
        color: active ? "#fff" : "var(--ink-2)",
        fontSize: 11.5,
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}

const FULL_LIST_LIMIT = 10000;
const CSV_MAX_BYTES = 10 * 1024 * 1024;
const PDF_MAX_BYTES = 5 * 1024 * 1024;
const PDF_MAX_FILES = 10;

export default function ApplicantsPage() {
  const [openUpload, setOpenUpload] = useState(false);
  const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
  const [tab, setTab] = useState<"umurava" | "csv" | "pdf">("umurava");
  const [modalError, setModalError] = useState("");
  const { data: jobsData, isLoading: jobsLoading } = useGetJobsQuery({ page: 1, limit: 100 });
  const [uploadFiles, { isLoading: isUploadingFiles }] = useUploadFilesMutation();
  const [ingestProfiles, { isLoading: isIngestingProfiles }] = useIngestProfilesMutation();
  const [deleteApplicant] = useDeleteApplicantMutation();
  /** Empty string = all jobs (API uses jobId=all). */
  const [jobId, setJobId] = useState("");
  const [modalJobId, setModalJobId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "screened" | "shortlisted" | "rejected">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "umurava_platform" | "pdf_upload" | "csv_upload" | "excel_upload">("all");
  const [scoreFilter, setScoreFilter] = useState<"all" | "0-40" | "40-70" | "70-100">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [jsonPayload, setJsonPayload] = useState("");
  const [showFormat, setShowFormat] = useState(false);
  const [jsonFileName, setJsonFileName] = useState("");
  const [csvExcelFile, setCsvExcelFile] = useState<File | null>(null);
  const [csvFileError, setCsvFileError] = useState("");
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfSkipped, setPdfSkipped] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((i) => prev.has(i));
      const next = new Set(prev);
      if (allSelected) ids.forEach((i) => next.delete(i));
      else ids.forEach((i) => next.add(i));
      return next;
    });
  }, []);

  const jobs = jobsData?.jobs ?? [];
  const jobTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const j of jobs) map[j._id] = j.title;
    return map;
  }, [jobs]);

  const openUploadModal = useCallback(() => {
    const firstJobId = jobs[0]?._id ?? "";
    setModalJobId(firstJobId);
    setModalError("");
    setOpenUpload(true);
  }, [jobs]);

  const { data: applicantsData, isFetching: isLoadingApplicants } = useGetApplicantsQuery({
    jobId: jobId || "all",
    page: 1,
    limit: FULL_LIST_LIMIT,
  });

  const rawApplicants = applicantsData?.applicants ?? [];

  const stats = useMemo(() => {
    const rows = rawApplicants;
    return {
      total: rows.length,
      pending: rows.filter((a) => a.status === "pending").length,
      shortlisted: rows.filter((a) => a.status === "shortlisted").length,
      rejected: rows.filter((a) => a.status === "rejected").length,
    };
  }, [rawApplicants]);

  // Status is driven entirely by the backend / screening result — no optimistic UI overrides.
  const allApplicants = rawApplicants;

  const filteredApplicants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allApplicants.filter((applicant) => {
      const byStatus = statusFilter === "all" ? true : applicant.status === statusFilter;
      const fileName = applicant.originalFileName?.toLowerCase() ?? "";
      const isExcelUpload = applicant.source === "csv_upload" && fileName.endsWith(".xlsx");
      const bySource =
        sourceFilter === "all"
          ? true
          : sourceFilter === "excel_upload"
            ? isExcelUpload
            : sourceFilter === "csv_upload"
              ? applicant.source === "csv_upload" && !fileName.endsWith(".xlsx")
              : applicant.source === sourceFilter;
      const bySearch = !q
        ? true
        : `${applicant.profile.firstName} ${applicant.profile.lastName}`.toLowerCase().includes(q) ||
          applicant.profile.title.toLowerCase().includes(q) ||
          (applicant.profile.skills ?? []).some((skill) => skill.toLowerCase().includes(q));
      const rawScore = applicant.totalScore;
      const scoreNum = rawScore != null && !Number.isNaN(Number(rawScore)) ? Number(rawScore) : null;
      const byScore =
        scoreFilter === "all"
          ? true
          : scoreNum === null
            ? false
            : scoreFilter === "0-40"
              ? scoreNum <= 40
              : scoreFilter === "40-70"
                ? scoreNum > 40 && scoreNum < 70
                : scoreNum >= 70;
      return byStatus && bySource && bySearch && byScore;
    });
  }, [allApplicants, statusFilter, sourceFilter, search, scoreFilter]);

  const PAGE_SIZE = 10;
  const totalFiltered = filteredApplicants.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pagedApplicants = filteredApplicants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    Boolean(search) || statusFilter !== "all" || sourceFilter !== "all" || scoreFilter !== "all";

  const jsonParsed = useMemo(() => {
    if (!jsonPayload.trim()) return { valid: false, count: 0, data: [] as UmuravaProfile[] };
    try {
      const parsed = JSON.parse(jsonPayload);
      if (!Array.isArray(parsed)) return { valid: false, count: 0, data: [] as UmuravaProfile[] };
      return { valid: true, count: parsed.length, data: parsed as UmuravaProfile[] };
    } catch {
      return { valid: false, count: 0, data: [] as UmuravaProfile[] };
    }
  }, [jsonPayload]);

  const isProcessing = isUploadingFiles || isIngestingProfiles;
  const uploadEnabled =
    Boolean(modalJobId) &&
    ((tab === "umurava" && jsonParsed.valid && jsonParsed.count > 0) ||
      (tab === "csv" && Boolean(csvExcelFile) && !csvFileError) ||
      (tab === "pdf" && pdfFiles.length > 0));

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setScoreFilter("all");
    setPage(1);
  };

  const handleDeleteApplicant = async (applicantId: string) => {
    try {
      await deleteApplicant(applicantId).unwrap();
      toast.success("Applicant deleted");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  const resetUploadForm = () => {
    setJsonPayload("");
    setJsonFileName("");
    setCsvExcelFile(null);
    setCsvFileError("");
    setPdfFiles([]);
    setPdfSkipped(0);
    setModalError("");
  };

  const handleUploadIngest = async () => {
    if (!uploadEnabled || !modalJobId) return;
    setModalError("");
    try {
      let insertedCount = 0;
      if (tab === "umurava") {
        const result = await ingestProfiles({ jobId: modalJobId, profiles: jsonParsed.data }).unwrap();
        insertedCount = result.inserted;
        if (result.failed > 0 && result.errors?.length) {
          setModalError(result.errors.map((e) => `Row ${e.index + 1}: ${e.message}`).join(" · "));
          if (result.inserted === 0) return;
        }
      } else if (tab === "csv" && csvExcelFile) {
        const formData = new FormData();
        formData.append("jobId", modalJobId);
        const ft = csvExcelFile.name.toLowerCase().endsWith(".xlsx") ? "excel" : "csv";
        formData.append("fileType", ft);
        formData.append("file", csvExcelFile);
        const result = await uploadFiles({ jobId: modalJobId, formData }).unwrap();
        insertedCount = result.inserted;
      } else if (tab === "pdf") {
        for (const file of pdfFiles) {
          const formData = new FormData();
          formData.append("jobId", modalJobId);
          formData.append("fileType", "pdf");
          formData.append("file", file);
          const result = await uploadFiles({ jobId: modalJobId, formData }).unwrap();
          insertedCount += result.inserted;
        }
      }
      setOpenUpload(false);
      resetUploadForm();
      toast.success(`${insertedCount} candidates successfully ingested`);
    } catch (err) {
      setModalError(getRtkQueryErrorMessage(err));
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openUpload") === "1") {
      openUploadModal();
    }
  }, [openUploadModal]);

  if (jobsLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Applicants" subtitle="Manage applicants and ingestion workflows from all sources." />
        <p className="mt-4 text-sm text-slate-500">Loading jobs…</p>
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Applicants" subtitle="Manage applicants and ingestion workflows from all sources." />
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold text-slate-900">No jobs found. Please create a job first.</p>
        </Card>
      </div>
    );
  }

  const statTiles: Array<{
    label: string;
    value: number;
    color: string;
    delta?: string;
  }> = [
    { label: "Total applicants", value: stats.total, color: "#6366f1", delta: stats.total > 0 ? `${stats.total} total` : undefined },
    { label: "Awaiting screening", value: stats.pending, color: "#fbbf24", delta: stats.pending > 0 ? `+${stats.pending}` : "0 pending" },
    { label: "Shortlisted", value: stats.shortlisted, color: "#34d399", delta: stats.shortlisted > 0 ? `+${stats.shortlisted}` : "0" },
    { label: "Rejected", value: stats.rejected, color: "#fb7185", delta: stats.rejected > 0 ? `${stats.rejected}` : "0" },
  ];

  const filterChips: Array<{ value: typeof statusFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "screened", label: "Screening" },
    { value: "pending", label: "Review" },
    { value: "shortlisted", label: "Shortlisted" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-[10px]">Workspace · Candidates</div>
          <h1 className="display m-0" style={{ fontSize: 32 }}>
            Applicants.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)", margin: "8px 0 0", maxWidth: 720 }}>
            Every candidate across your pipeline — ranked, scored, and ready to act on.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <button type="button" onClick={openUploadModal} className="btn btn-ghost">
            <Upload className="h-3 w-3" /> Upload resumes
          </button>
          <button type="button" className="btn btn-primary">
            <Sparkles className="h-3 w-3" /> Re-score all
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            className="panel panel-tight"
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div className="eyebrow">{tile.label}</div>
            <div className="flex items-end justify-between">
              <div className="display" style={{ fontSize: 30, lineHeight: 1, color: tile.color }}>
                {tile.value}
              </div>
              {tile.delta ? (
                <div className="mono text-[11px]" style={{ color: "#34d399" }}>
                  {tile.delta}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="panel mb-[18px] flex flex-wrap items-center gap-3" style={{ padding: 14 }}>
        <div className="relative" style={{ flex: "1 1 260px", minWidth: 220 }}>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: "var(--ink-4)" }}
          />
          <input
            className="input"
            placeholder="Search applicants by name, title, or skill…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ paddingLeft: 38 }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filterChips.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={statusFilter === f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
            />
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setPage(1);
            }}
            className={compactSelectClassName}
            aria-label="Filter by job"
          >
            <option value="">All Jobs</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
            className={compactSelectClassName}
            aria-label="Filter by source"
          >
            <option value="all">All Sources</option>
            <option value="umurava_platform">Umurava</option>
            <option value="pdf_upload">PDF</option>
            <option value="csv_upload">CSV</option>
            <option value="excel_upload">Excel</option>
          </select>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as typeof scoreFilter)}
            className={compactSelectClassName}
            aria-label="Filter by score"
          >
            <option value="all">All scores</option>
            <option value="0-40">0–40</option>
            <option value="40-70">40–70</option>
            <option value="70-100">70–100</option>
          </select>
          {hasActiveFilters ? (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ height: 34 }}
              onClick={clearFilters}
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 34 }}
            onClick={() => setOpenFilterDrawer(true)}
          >
            <Filter className="h-3 w-3" /> Sort: Score
          </button>
        </div>
      </div>

      {selectedIds.size > 0 ? (
        <div
          className="panel mb-[14px] flex items-center gap-[10px]"
          style={{
            padding: "10px 16px",
            background: "linear-gradient(135deg, rgba(99,102,241,.16), rgba(217,70,239,.12))",
            border: "1px solid rgba(99,102,241,.35)",
          }}
        >
          <span className="text-[13px] font-medium" style={{ color: "#fff" }}>
            {selectedIds.size} selected
          </span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <button type="button" className="btn btn-ghost" style={{ height: 28, fontSize: 12 }}>
            <Sparkles className="h-3 w-3" /> Run screening
          </button>
          <button type="button" className="btn btn-ghost" style={{ height: 28, fontSize: 12 }}>
            <Mail className="h-3 w-3" /> Email
          </button>
          <button type="button" className="btn btn-ghost" style={{ height: 28, fontSize: 12 }}>
            <Calendar className="h-3 w-3" /> Schedule
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 28, fontSize: 12, color: "#fb7185" }}
          >
            <X className="h-3 w-3" /> Reject
          </button>
          <button
            type="button"
            className="btn-icon ml-auto"
            style={{ width: 28, height: 28 }}
            onClick={() => setSelectedIds(new Set())}
            aria-label="Clear selection"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {isLoadingApplicants ? (
        <p className="py-8 text-center text-sm" style={{ color: "var(--ink-3)" }}>Loading applicants…</p>
      ) : (
        <ApplicantTable
          applicants={pagedApplicants}
          onDelete={handleDeleteApplicant}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          onOpenUpload={openUploadModal}
          jobTitleById={jobTitleById}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onToggleAll={toggleAll}
        />
      )}

      <div className="mt-5 flex items-center justify-between text-[12.5px]" style={{ color: "var(--ink-3)" }}>
        <span>
          Showing <b style={{ color: "#fff" }}>{totalFiltered === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</b>
          {totalFiltered > 0 ? `-${Math.min(page * PAGE_SIZE, totalFiltered)}` : ""} of {totalFiltered} applicants
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn btn-ghost"
            style={{ height: 30, fontSize: 12 }}
          >
            ← Prev
          </button>
          <span className="mono" style={{ padding: "0 10px" }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="btn btn-ghost"
            style={{ height: 30, fontSize: 12 }}
          >
            Next →
          </button>
        </div>
      </div>

      <Modal open={openUpload} onClose={() => setOpenUpload(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Upload Applicants</h3>
            <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={() => setOpenUpload(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Select Job to link applicants to</label>
            <select
              value={modalJobId}
              onChange={(e) => setModalJobId(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
            >
              <option value="">Choose a job...</option>
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title}
                  {job.status !== "active" ? ` (${job.status})` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Applicants will be linked to this job for AI screening</p>
            {jobs.length === 0 ? (
              <p className="mt-2 text-sm font-medium text-amber-800">Please create a job first before uploading applicants</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("umurava")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/40",
                tab === "umurava"
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
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
          <Card className="space-y-3">
            {tab === "umurava" ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Paste Umurava Profile JSON</label>
                <textarea
                  rows={8}
                  value={jsonPayload}
                  onChange={(e) => setJsonPayload(e.target.value)}
                  placeholder='[{"firstName":"Aline","lastName":"Uwase", ...}]'
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                />
                <div className="flex items-center justify-between">
                  <button type="button" className="text-xs font-semibold text-brand-700" onClick={() => setShowFormat((s) => !s)}>
                    {showFormat ? "Hide expected format" : "View expected format"}
                  </button>
                  <label className="cursor-pointer text-xs font-semibold text-brand-700 underline">
                    Upload JSON file
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setJsonFileName(file.name);
                        const text = await file.text();
                        setJsonPayload(text);
                      }}
                    />
                  </label>
                </div>
                {jsonFileName ? <p className="text-xs text-slate-500">Loaded file: {jsonFileName}</p> : null}
                {showFormat ? (
                  <pre className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{`[
  {
    "firstName": "Aline",
    "lastName": "Uwase",
    "email": "aline@example.com",
    "title": "Frontend Developer",
    "skills": ["React", "TypeScript"],
    "location": "Kigali"
  }
]`}</pre>
                ) : null}
                {!jsonPayload.trim() ? null : jsonParsed.valid ? (
                  <p className="text-sm font-medium text-emerald-600">{jsonParsed.count} profiles detected</p>
                ) : (
                  <p className="text-sm text-red-500">Invalid JSON — please paste a valid array of profile objects</p>
                )}
              </div>
            ) : tab === "csv" ? (
              <div className="space-y-3">
                <label
                  htmlFor="csv-file"
                  className="block cursor-pointer rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/30 px-4 py-8 text-center"
                >
                  <p className="font-semibold text-slate-800">Drag & drop your CSV or Excel file here</p>
                  <p className="mt-1 text-sm text-slate-500">Supported formats: .csv, .xlsx — Max size: 10MB</p>
                </label>
                <input
                  id="csv-file"
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCsvExcelFile(file);
                    if (file && file.size > CSV_MAX_BYTES) {
                      setCsvFileError("File exceeds 10MB limit.");
                    } else {
                      setCsvFileError("");
                    }
                  }}
                />
                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent("firstName,lastName,email,title,skills,experienceYears\nJohn,Doe,john@example.com,Backend Developer,Node.js|MongoDB,4")}`}
                  download="applicants-template.csv"
                  className="text-xs font-semibold text-brand-700 underline"
                >
                  Download template
                </a>
                {csvFileError ? <p className="text-sm text-red-500">{csvFileError}</p> : null}
                {csvExcelFile ? (
                  <div className="rounded-lg border border-brand-100 p-3 text-sm">
                    <p className="font-medium text-slate-800">{csvExcelFile.name}</p>
                    <p className="text-xs text-slate-500">{(csvExcelFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p className="text-xs text-emerald-600">Rows detected: preview available after ingestion</p>
                    <button type="button" className="mt-2 text-xs text-red-600" onClick={() => { setCsvExcelFile(null); setCsvFileError(""); }}>
                      Remove file
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  htmlFor="pdf-files"
                  className="block cursor-pointer rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/30 px-4 py-8 text-center"
                >
                  <p className="font-semibold text-slate-800">Drag & drop PDF resumes here</p>
                  <p className="mt-1 text-sm text-slate-500">You can upload multiple PDFs at once — Max 10 files, 5MB each</p>
                </label>
                <input
                  id="pdf-files"
                  type="file"
                  className="hidden"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    const ok: File[] = [];
                    let skipped = 0;
                    for (const f of picked.slice(0, PDF_MAX_FILES + 20)) {
                      if (ok.length >= PDF_MAX_FILES) break;
                      if (f.size > PDF_MAX_BYTES) {
                        skipped += 1;
                        continue;
                      }
                      ok.push(f);
                    }
                    setPdfSkipped(skipped);
                    setPdfFiles(ok);
                  }}
                />
                {pdfSkipped > 0 ? (
                  <p className="text-sm text-amber-700">{pdfSkipped} file(s) skipped — each must be 5MB or less</p>
                ) : null}
                <div className="space-y-2">
                  {pdfFiles.map((file) => (
                    <div key={file.name} className="flex items-center justify-between rounded-lg border border-brand-100 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <button type="button" className="text-red-500" onClick={() => setPdfFiles((prev) => prev.filter((f) => f.name !== file.name))}>
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {modalError ? <p className="text-sm text-red-500">{modalError}</p> : null}
            <button
              type="button"
              disabled={!uploadEnabled || isProcessing || !modalJobId}
              onClick={() => void handleUploadIngest()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing candidates...
                </>
              ) : (
                "Upload & Ingest Candidates"
              )}
            </button>
          </Card>
        </div>
      </Modal>

      <Modal open={openFilterDrawer} onClose={() => setOpenFilterDrawer(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Filter Applicants</h3>
            <button type="button" onClick={() => setOpenFilterDrawer(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <label className="block text-sm font-medium text-slate-700">Source</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
            className="h-11 w-full rounded-lg border border-slate-200 px-3"
          >
            <option value="all">All Sources</option>
            <option value="umurava_platform">Umurava Platform</option>
            <option value="pdf_upload">PDF</option>
            <option value="csv_upload">CSV</option>
            <option value="excel_upload">Excel</option>
          </select>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-11 w-full rounded-lg border border-slate-200 px-3"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="screened">Screened</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
          </select>
          <label className="block text-sm font-medium text-slate-700">Score Range</label>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as typeof scoreFilter)}
            className="h-11 w-full rounded-lg border border-slate-200 px-3"
          >
            <option value="all">All</option>
            <option value="0-40">0-40</option>
            <option value="40-70">40-70</option>
            <option value="70-100">70-100</option>
          </select>
          <button type="button" onClick={clearFilters} className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Clear filters
          </button>
        </div>
      </Modal>
    </div>
  );
}
