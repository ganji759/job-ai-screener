"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Filter, Loader2, Star, Upload, Users, XCircle, X } from "lucide-react";
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Applicants" subtitle="Manage applicants and ingestion workflows from all sources." />
        <div className="flex gap-2">
          <select
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setPage(1);
            }}
            className={cn(compactSelectClassName, "px-4 py-2 text-sm")}
            aria-label="Select job for applicants"
            disabled={!jobs.length}
          >
            <option value="">All Jobs</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => openUploadModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white outline-none transition hover:bg-brand-700"
          >
            <Upload className="h-4 w-4" />
            Upload Applicants
          </button>
          <button
            type="button"
            onClick={() => setOpenFilterDrawer(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { key: "total", label: "Total", icon: Users, count: stats.total, accent: "text-blue-600", bg: "bg-blue-50", activeBg: "bg-blue-600 text-white" },
          { key: "pending", label: "Pending", icon: Clock3, count: stats.pending, accent: "text-amber-600", bg: "bg-amber-50", activeBg: "bg-amber-500 text-white" },
          { key: "shortlisted", label: "Shortlisted", icon: Star, count: stats.shortlisted, accent: "text-emerald-600", bg: "bg-emerald-50", activeBg: "bg-emerald-600 text-white" },
          { key: "rejected", label: "Rejected", icon: XCircle, count: stats.rejected, accent: "text-red-600", bg: "bg-red-50", activeBg: "bg-red-600 text-white" },
        ].map((item) => {
          const Icon = item.icon;
          const active =
            (item.key === "total" && statusFilter === "all") ||
            (item.key !== "total" && statusFilter === item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setStatusFilter(item.key === "total" ? "all" : (item.key as "pending" | "shortlisted" | "rejected"));
                setPage(1);
              }}
              className={cn("rounded-xl border p-4 text-left transition", active ? item.activeBg : "bg-white")}
            >
              <div className="flex items-center justify-between">
                <p className={cn("text-xs uppercase tracking-wide", active ? "text-white/90" : "text-slate-500")}>{item.label}</p>
                <span className={cn("rounded-lg p-2", active ? "bg-white/20 text-white" : `${item.bg} ${item.accent}`)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className={cn("mt-2 text-2xl font-bold", active ? "text-white" : item.accent)}>{item.count}</p>
            </button>
          );
        })}
      </div>
      <Card className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, title, or skill..."
            className="h-11 flex-1 rounded-lg border border-slate-200 px-3"
          />
          <select
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setPage(1);
            }}
            className={cn(compactSelectClassName, "h-11 rounded-lg px-3 text-sm")}
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
            className={cn(compactSelectClassName, "h-11 rounded-lg px-3 text-sm")}
          >
            <option value="all">All Sources</option>
            <option value="umurava_platform">Umurava Platform</option>
            <option value="pdf_upload">PDF</option>
            <option value="csv_upload">CSV</option>
            <option value="excel_upload">Excel</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={cn(compactSelectClassName, "h-11 rounded-lg px-3 text-sm")}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="screened">Screened</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as typeof scoreFilter)}
            className={cn(compactSelectClassName, "h-11 rounded-lg px-3 text-sm")}
          >
            <option value="all">All scores</option>
            <option value="0-40">0-40</option>
            <option value="40-70">40-70</option>
            <option value="70-100">70-100</option>
          </select>
          <button type="button" className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
        {isLoadingApplicants ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading applicants…</p>
        ) : (
          <ApplicantTable
            applicants={pagedApplicants}
            onDelete={handleDeleteApplicant}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            onOpenUpload={openUploadModal}
            jobTitleById={jobTitleById}
          />
        )}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            {totalFiltered === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalFiltered)} of {totalFiltered} applicants
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Card>

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
