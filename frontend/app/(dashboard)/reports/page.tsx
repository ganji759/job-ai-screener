"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Briefcase, Download, FileSpreadsheet, Search } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useGetApplicantsQuery } from "../../../store/api/applicantsApi";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { useGetDashboardAnalyticsQuery, useGetScreeningsQuery } from "../../../store/api/screeningsApi";

type CandidateStatus = "shortlisted" | "rejected" | "pending";
type ReportTab = "candidates" | "jobs" | "screenings" | "overview";

interface Candidate {
  rank: number;
  id: string;
  name: string;
  job: string;
  jobId: string;
  score: number;
  status: CandidateStatus;
  date: string;
}

interface JobStat {
  title: string;
  applicants: number;
  avgScore: number;
  shortlistRate: number;
  topCandidate: string;
}

const mockCandidates: Candidate[] = [
  { rank: 1, id: "1", name: "Alice Mutoni", job: "Frontend Engineer", jobId: "frontend-engineer", score: 92, status: "shortlisted", date: "2026-04-20" },
  { rank: 2, id: "2", name: "Bob Nkurunziza", job: "Backend Engineer", jobId: "backend-engineer", score: 78, status: "shortlisted", date: "2026-04-21" },
  { rank: 3, id: "3", name: "Claire Ingabire", job: "AI Engineer", jobId: "ai-engineer", score: 45, status: "rejected", date: "2026-04-22" },
  { rank: 4, id: "4", name: "David Habimana", job: "Frontend Engineer", jobId: "frontend-engineer", score: 65, status: "pending", date: "2026-04-23" },
  { rank: 5, id: "5", name: "Ester Uwase", job: "Backend Engineer", jobId: "backend-engineer", score: 88, status: "shortlisted", date: "2026-04-24" },
];

const mockJobs: JobStat[] = [
  { title: "Frontend Engineer", applicants: 12, avgScore: 74, shortlistRate: 58, topCandidate: "Alice Mutoni" },
  { title: "Backend Engineer", applicants: 8, avgScore: 81, shortlistRate: 75, topCandidate: "Ester Uwase" },
  { title: "AI Engineer", applicants: 5, avgScore: 63, shortlistRate: 40, topCandidate: "Frank Niyonzima" },
  { title: "DevOps Engineer", applicants: 3, avgScore: 55, shortlistRate: 33, topCandidate: "Grace Mukamana" },
];

function statusPill(status: CandidateStatus): string {
  if (status === "shortlisted") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (status === "rejected") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

function scorePill(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (score >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
}

function formatDuration(ms: number): string {
  if (!ms) return "N/A";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("candidates");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const [searchDraft, setSearchDraft] = useState("");
  const [jobDraft, setJobDraft] = useState("all");
  const [statusDraft, setStatusDraft] = useState("all");
  const [yearDraft, setYearDraft] = useState("all");
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    job: "all",
    status: "all",
    year: "all",
    from: "",
    to: "",
  });

  const { data: applicantsData } = useGetApplicantsQuery({ jobId: "all", page: 1, limit: 1000 });
  const { data: jobsData } = useGetJobsQuery({ page: 1, limit: 200 });
  const { data: screeningsData } = useGetScreeningsQuery();
  const { data: analyticsData } = useGetDashboardAnalyticsQuery();

  const jobs = jobsData?.jobs ?? [];
  const jobById = useMemo(() => new Map(jobs.map((j) => [j._id, j.title])), [jobs]);

  const apiCandidates = useMemo<Candidate[]>(() => {
    const rows = applicantsData?.applicants ?? [];
    return rows.map((applicant, idx) => ({
      rank: idx + 1,
      id: applicant._id,
      name: `${applicant.profile.firstName ?? ""} ${applicant.profile.lastName ?? ""}`.trim() || "Unknown Candidate",
      job: jobById.get(applicant.jobId) ?? "Unknown Job",
      jobId: applicant.jobId,
      score: Number(applicant.totalScore ?? 0),
      status: applicant.status === "shortlisted" || applicant.status === "rejected" ? applicant.status : "pending",
      date: applicant.createdAt?.slice(0, 10) ?? "2026-04-20",
    }));
  }, [applicantsData?.applicants, jobById]);

  const candidates = apiCandidates.length > 0 ? apiCandidates : mockCandidates;

  const jobStats = useMemo<JobStat[]>(() => {
    if (candidates.length === 0) return mockJobs;
    const grouped = new Map<string, Candidate[]>();
    candidates.forEach((c) => {
      const key = c.job;
      grouped.set(key, [...(grouped.get(key) ?? []), c]);
    });
    return Array.from(grouped.entries()).map(([title, rows]) => {
      const applicants = rows.length;
      const avgScore = Math.round(rows.reduce((s, c) => s + c.score, 0) / Math.max(1, rows.length));
      const shortlisted = rows.filter((c) => c.status === "shortlisted").length;
      const shortlistRate = Math.round((shortlisted / Math.max(1, rows.length)) * 100);
      const topCandidate = [...rows].sort((a, b) => b.score - a.score)[0]?.name ?? "N/A";
      return { title, applicants, avgScore, shortlistRate, topCandidate };
    });
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates
      .filter((c) => c.name.toLowerCase().includes(filters.search.toLowerCase()))
      .filter((c) => filters.job === "all" || c.jobId === filters.job || c.job === filters.job)
      .filter((c) => filters.status === "all" || c.status === filters.status)
      .filter((c) => filters.year === "all" || new Date(c.date).getFullYear() === Number(filters.year))
      .filter((c) => !filters.from || new Date(c.date) >= new Date(filters.from))
      .filter((c) => !filters.to || new Date(c.date) <= new Date(`${filters.to}T23:59:59`))
      .sort((a, b) => b.score - a.score)
      .map((c, i) => ({ ...c, rank: i + 1 }));
  }, [candidates, filters]);

  const chartData = useMemo(
    () => [
      { range: "0-20", count: filteredCandidates.filter((c) => c.score <= 20).length },
      { range: "21-40", count: filteredCandidates.filter((c) => c.score >= 21 && c.score <= 40).length },
      { range: "41-60", count: filteredCandidates.filter((c) => c.score >= 41 && c.score <= 60).length },
      { range: "61-80", count: filteredCandidates.filter((c) => c.score >= 61 && c.score <= 80).length },
      { range: "81-100", count: filteredCandidates.filter((c) => c.score >= 81).length },
    ],
    [filteredCandidates],
  );

  const screeningTotal = screeningsData?.screenings?.length ?? Number(analyticsData?.totalScreenings ?? 0);
  const averageTime = Number(analyticsData?.averageTimeToScreen ?? 0);
  const completionRate = screeningTotal ? Math.round((Number(analyticsData?.completedScreenings ?? 0) / screeningTotal) * 100) : 0;

  const bestJob = [...jobStats].sort((a, b) => b.shortlistRate - a.shortlistRate)[0];
  const worstJob = [...jobStats].sort((a, b) => a.avgScore - b.avgScore)[0];

  const monthlyRows = useMemo(() => {
    const map = new Map<string, number>();
    filteredCandidates.forEach((c) => {
      const key = c.date.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([month, count]) => ({ month, count }));
  }, [filteredCandidates]);

  const exportToPDF = async () => {
    setIsExportingPdf(true);
    try {
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const margin = 14;

      pdf.setFillColor(88, 28, 235);
      pdf.rect(0, 0, 210, 80, "F");

      // Simple vector logo resembling Umurava brand mark
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(2.2);
      pdf.circle(margin + 6, 20, 5);
      pdf.circle(margin + 16, 20, 5);
      pdf.line(margin + 9.5, 17.5, margin + 12.5, 22.5);
      pdf.line(margin + 9.5, 22.5, margin + 12.5, 17.5);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text("Umurava AI HR", margin + 26, 30);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "normal");
      pdf.text("AI-Powered Talent Screening Platform", margin + 26, 42);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("CANDIDATE SCREENING REPORT", margin, 60);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
        margin,
        70,
      );

      let y = 95;
      pdf.setFillColor(245, 243, 255);
      pdf.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, "F");
      pdf.setDrawColor(196, 181, 253);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, "S");
      pdf.setTextColor(88, 28, 235);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("EXECUTIVE SUMMARY", margin + 5, y + 8);

      const summaryStats = [
        { label: "Total Candidates", value: String(filteredCandidates.length) },
        { label: "Shortlisted", value: String(filteredCandidates.filter((c) => c.status === "shortlisted").length) },
        { label: "Rejected", value: String(filteredCandidates.filter((c) => c.status === "rejected").length) },
        { label: "Pending", value: String(filteredCandidates.filter((c) => c.status === "pending").length) },
        {
          label: "Avg Match Score",
          value: filteredCandidates.length > 0
            ? `${Math.round(filteredCandidates.reduce((s, c) => s + c.score, 0) / filteredCandidates.length)}/100`
            : "N/A",
        },
      ];

      summaryStats.forEach((s, i) => {
        const x = margin + 5 + i * 36;
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(88, 28, 235);
        pdf.text(s.value, x, y + 22);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        pdf.text(s.label, x, y + 29);
      });

      pdf.addPage();
      const element = document.getElementById("report-content");
      if (element) {
        const canvas = await html2canvas(element, { scale: 1.2, backgroundColor: "#ffffff" });
        const img = canvas.toDataURL("image/jpeg", 0.86);
        pdf.addImage(img, "JPEG", margin, 12, 182, 260);
      }

      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i += 1) {
        pdf.setPage(i);
        pdf.setFillColor(243, 244, 246);
        pdf.rect(0, 285, 210, 12, "F");
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text("Umurava AI HR — Confidential Screening Report", margin, 291);
        pdf.text(`Page ${i} of ${total}`, 195, 291, { align: "right" });
        pdf.text("ai-hr-pi.vercel.app", 105, 291, { align: "center" });
      }

      pdf.save(`umurava-report-${new Date().toISOString().split("T")[0]}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportToExcel = async () => {
    setIsExportingExcel(true);
    try {
      const XLSX = (await import("xlsx")).default;
      const wb = XLSX.utils.book_new();

      const candidateData = [
        ["UMURAVA AI HR — CANDIDATE SCREENING REPORT"],
        ["Generated:", new Date().toLocaleDateString()],
        [],
        ["RANK", "CANDIDATE NAME", "JOB APPLIED", "MATCH SCORE", "STATUS", "SCREENING DATE"],
        ...filteredCandidates.map((c) => [c.rank, c.name, c.job, `${c.score}/100`, c.status.toUpperCase(), c.date]),
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(candidateData);
      ws1["!cols"] = [{ wch: 8 }, { wch: 25 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws1, "Candidates");

      const ws2 = XLSX.utils.aoa_to_sheet([
        ["SHORTLISTED CANDIDATES"],
        [],
        ["RANK", "NAME", "JOB", "SCORE", "DATE"],
        ...filteredCandidates.filter((c) => c.status === "shortlisted").map((c, i) => [i + 1, c.name, c.job, c.score, c.date]),
      ]);
      ws2["!cols"] = [{ wch: 8 }, { wch: 25 }, { wch: 22 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Shortlisted");

      const ws3 = XLSX.utils.aoa_to_sheet([
        ["JOB PERFORMANCE REPORT"],
        [],
        ["JOB TITLE", "TOTAL APPLICANTS", "AVG MATCH SCORE", "SHORTLIST RATE", "TOP CANDIDATE"],
        ...jobStats.map((j) => [j.title, j.applicants, `${j.avgScore}/100`, `${j.shortlistRate}%`, j.topCandidate]),
      ]);
      ws3["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 15 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws3, "Jobs");

      const ws4 = XLSX.utils.aoa_to_sheet([
        ["REJECTED CANDIDATES"],
        [],
        ["NAME", "JOB", "SCORE", "DATE"],
        ...filteredCandidates.filter((c) => c.status === "rejected").map((c) => [c.name, c.job, c.score, c.date]),
      ]);
      ws4["!cols"] = [{ wch: 25 }, { wch: 22 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws4, "Rejected");

      XLSX.writeFile(wb, `umurava-report-${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Candidate, job and screening reports — export-ready insights" />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300">Candidate, job and screening reports — export-ready insights</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportToPDF}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            disabled={isExportingPdf}
          >
            <Download className="h-4 w-4" />
            {isExportingPdf ? "Exporting..." : "Export as PDF"}
          </button>
          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            disabled={isExportingExcel}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isExportingExcel ? "Exporting..." : "Export as Excel"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-7 dark:border-slate-700 dark:bg-slate-900">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Search candidate name..." className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        </label>
        <select value={jobDraft} onChange={(e) => setJobDraft(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
          <option value="all">All Jobs</option>
          {jobs.map((job) => (
            <option key={job._id} value={job._id}>{job.title}</option>
          ))}
        </select>
        <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
          <option value="all">All Statuses</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
        </select>
        <select value={yearDraft} onChange={(e) => setYearDraft(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
          <option value="all">Year</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
        <input type="date" value={fromDraft} onChange={(e) => setFromDraft(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        <input type="date" value={toDraft} onChange={(e) => setToDraft(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        <button
          type="button"
          onClick={() => setFilters({ search: searchDraft, job: jobDraft, status: statusDraft, year: yearDraft, from: fromDraft, to: toDraft })}
          className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 md:col-span-7 md:justify-self-end"
        >
          Apply Filters
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["candidates", "jobs", "screenings", "overview"] as ReportTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div id="report-content" className="space-y-6">
        {tab === "candidates" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Candidates Report</h2>
            {filteredCandidates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-600">
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-100">No candidates yet. Run a screening to generate data.</p>
                <Link href="/screenings" className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                  Go to Screenings
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      <th className="px-4 py-3">Rank</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Job Applied</th>
                      <th className="px-4 py-3">Match Score</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Screening Date</th><th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((c) => (
                      <tr key={c.id} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">#{c.rank}</td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{c.name}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.job}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${scorePill(c.score)}`}>{c.score}/100</span></td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusPill(c.status)}`}>{c.status}</span></td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{new Date(c.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><Link href={`/applicants?highlightApplicant=${c.id}`} className="text-xs font-semibold text-brand-600 hover:underline">View Profile</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {tab === "jobs" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Jobs Report</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(jobStats.length ? jobStats : mockJobs).map((job) => (
                <article key={job.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-brand-100 p-2 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300"><Briefcase className="h-4 w-4" /></span>
                    <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{job.title}</h3>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total Applicants: {job.applicants}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Top Candidate: {job.topCandidate}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Avg Match Score: {job.avgScore}/100</p>
                  <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.min(100, job.avgScore)}%` }} /></div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-brand-300 text-xs font-bold text-brand-700 dark:border-brand-700 dark:text-brand-300">{job.shortlistRate}%</span>
                    <button type="button" className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">View Candidates</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "screenings" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Screenings Report</h2>
            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Total Screenings Run</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{screeningTotal}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Avg Time to Screen</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatDuration(averageTime)}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Completion Rate</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{completionRate}%</p></div>
            </div>
            <div className="h-[250px] rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : null}

        {tab === "overview" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Total candidates screened</p><p className="mt-1 text-2xl font-bold">{filteredCandidates.length}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Total jobs with applicants</p><p className="mt-1 text-2xl font-bold">{jobStats.length}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Best performing job</p><p className="mt-1 text-sm font-semibold">{bestJob?.title ?? "N/A"} ({bestJob?.shortlistRate ?? 0}%)</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Worst match score job</p><p className="mt-1 text-sm font-semibold">{worstJob?.title ?? "N/A"} ({worstJob?.avgScore ?? 0}/100)</p></div>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="px-4 py-2">Month</th><th className="px-4 py-2">Candidates</th></tr></thead>
                <tbody>
                  {monthlyRows.length ? monthlyRows.map((m) => (
                    <tr key={m.month} className="border-t border-slate-200 dark:border-slate-700"><td className="px-4 py-2">{m.month}</td><td className="px-4 py-2">{m.count}</td></tr>
                  )) : <tr><td className="px-4 py-4 text-slate-500" colSpan={2}>No monthly data yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
