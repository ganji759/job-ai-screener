"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Briefcase, Download, FileBarChart2, RefreshCw, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGetApplicantsQuery } from "../../../../store/api/applicantsApi";
import { useGetJobsQuery } from "../../../../store/api/jobsApi";
import { useGetDashboardAnalyticsQuery, useGetScreeningsQuery } from "../../../../store/api/screeningsApi";
import { PageHeader } from "../../../../components/layout/PageHeader";

type CandidateStatus = "shortlisted" | "rejected" | "pending";

interface CandidateReportRow {
  id: string;
  name: string;
  jobId: string;
  jobTitle: string;
  matchScore: number;
  status: CandidateStatus;
  date: string;
  reason?: string;
}

interface JobReportRow {
  id: string;
  title: string;
  totalApplicants: number;
  avgScore: number;
  shortlistRate: number;
  topCandidate: string;
}

const mockCandidates: CandidateReportRow[] = [
  { id: "1", name: "Alice Mutoni", jobId: "frontend-engineer", jobTitle: "Frontend Engineer", matchScore: 92, status: "shortlisted", date: "2026-04-20" },
  { id: "2", name: "Bob Nkurunziza", jobId: "backend-engineer", jobTitle: "Backend Engineer", matchScore: 78, status: "shortlisted", date: "2026-04-21" },
  { id: "3", name: "Claire Ingabire", jobId: "ai-engineer", jobTitle: "AI Engineer", matchScore: 45, status: "rejected", date: "2026-04-22", reason: "Below threshold" },
  { id: "4", name: "David Habimana", jobId: "frontend-engineer", jobTitle: "Frontend Engineer", matchScore: 65, status: "pending", date: "2026-04-23" },
];

function normalizeStatus(status: string): CandidateStatus {
  if (status === "shortlisted") return "shortlisted";
  if (status === "rejected") return "rejected";
  return "pending";
}

function statusPill(status: CandidateStatus): string {
  if (status === "shortlisted") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (status === "rejected") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

function scoreBadge(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (score >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
}

function prettyStatus(status: CandidateStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const {
    data: applicantsData,
    isLoading: applicantsLoading,
    isError: applicantsError,
    refetch: refetchApplicants,
  } = useGetApplicantsQuery({ jobId: "all", page: 1, limit: 1000 });
  const {
    data: jobsData,
    isLoading: jobsLoading,
    isError: jobsError,
    refetch: refetchJobs,
  } = useGetJobsQuery({ page: 1, limit: 200 });
  const { data: analyticsData } = useGetDashboardAnalyticsQuery();
  const {
    data: screeningsData,
    isLoading: screeningsLoading,
    isError: screeningsError,
    refetch: refetchScreenings,
  } = useGetScreeningsQuery();

  const jobs = jobsData?.jobs ?? [];
  const applicants = applicantsData?.applicants ?? [];
  const screenings = screeningsData?.screenings ?? [];

  const loading = applicantsLoading || jobsLoading || screeningsLoading;
  const hasError = applicantsError || jobsError || screeningsError;

  const jobById = useMemo(() => new Map(jobs.map((job) => [job._id, job.title])), [jobs]);

  const liveCandidates = useMemo<CandidateReportRow[]>(
    () => applicants.map((applicant) => {
      const name = `${applicant.profile.firstName ?? ""} ${applicant.profile.lastName ?? ""}`.trim() || "Unknown Candidate";
      return {
        id: applicant._id,
        name,
        jobId: applicant.jobId,
        jobTitle: jobById.get(applicant.jobId) ?? "Unknown Job",
        matchScore: Number(applicant.totalScore ?? 0),
        status: normalizeStatus(applicant.status),
        date: applicant.createdAt,
      };
    }),
    [applicants, jobById],
  );

  const candidates = liveCandidates.length > 0 ? liveCandidates : mockCandidates;

  const filteredCandidates = useMemo(() => {
    return candidates.filter((row) => {
      const matchesName = row.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
      const matchesJob = jobFilter === "all" || row.jobId === jobFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const rowDate = new Date(row.date);
      const afterStart = !startDate || rowDate >= new Date(startDate);
      const beforeEnd = !endDate || rowDate <= new Date(`${endDate}T23:59:59`);
      return matchesName && matchesJob && matchesStatus && afterStart && beforeEnd;
    });
  }, [candidates, searchTerm, jobFilter, statusFilter, startDate, endDate]);

  const jobStats = useMemo<JobReportRow[]>(() => {
    const sourceJobs = jobs.length
      ? jobs.map((job) => ({ id: job._id, title: job.title }))
      : Array.from(
          new Map(mockCandidates.map((c) => [c.jobId, c.jobTitle])).entries(),
          ([id, title]) => ({ id, title }),
        );
    return sourceJobs.map((job) => {
      const rows = candidates.filter((row) => row.jobId === job.id);
      const totalApplicants = rows.length;
      const shortlisted = rows.filter((row) => row.status === "shortlisted").length;
      const avgMatchScore = totalApplicants ? rows.reduce((sum, row) => sum + row.matchScore, 0) / totalApplicants : 0;
      const shortlistRate = totalApplicants ? (shortlisted / totalApplicants) * 100 : 0;
      const topCandidate = [...rows].sort((a, b) => b.matchScore - a.matchScore)[0];
      return {
        id: job.id,
        title: job.title,
        totalApplicants,
        avgScore: Math.round(avgMatchScore),
        shortlistRate,
        topCandidate: topCandidate?.name ?? "N/A",
      };
    });
  }, [jobs, candidates]);

  const scoreDistribution = useMemo(
    () => [
      { scoreRange: "0-20", count: filteredCandidates.filter((c) => c.matchScore >= 0 && c.matchScore <= 20).length },
      { scoreRange: "21-40", count: filteredCandidates.filter((c) => c.matchScore >= 21 && c.matchScore <= 40).length },
      { scoreRange: "41-60", count: filteredCandidates.filter((c) => c.matchScore >= 41 && c.matchScore <= 60).length },
      { scoreRange: "61-80", count: filteredCandidates.filter((c) => c.matchScore >= 61 && c.matchScore <= 80).length },
      { scoreRange: "81-100", count: filteredCandidates.filter((c) => c.matchScore >= 81 && c.matchScore <= 100).length },
    ],
    [filteredCandidates],
  );

  const totalScreenings = screenings.length || Number(analyticsData?.totalScreenings ?? 0);
  const averageTimeToScreen = Number(analyticsData?.averageTimeToScreen ?? 0);
  const formattedAvgTime =
    averageTimeToScreen > 0
      ? `${Math.max(1, Math.round(averageTimeToScreen / 60000))} min`
      : "No completed screenings yet";

  const exportToPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const html2canvas = (await import("html2canvas")).default;
    const element = document.getElementById("report-content");
    if (!element) return;

    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const margin = 15;

      pdf.setFillColor(88, 28, 235);
      pdf.rect(0, 0, 210, 35, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("Umurava AI HR", margin, 15);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("AI-Powered Talent Screening Platform", margin, 22);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("CANDIDATE SCREENING REPORT", 195, 15, { align: "right" });
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Generated: ${new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        195,
        22,
        { align: "right" },
      );
      pdf.setDrawColor(139, 92, 246);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 37, 195, 37);

      let y = 45;
      pdf.setFillColor(245, 243, 255);
      pdf.roundedRect(margin, y, pageWidth - 2 * margin, 28, 3, 3, "F");
      pdf.setDrawColor(196, 181, 253);
      pdf.roundedRect(margin, y, pageWidth - 2 * margin, 28, 3, 3, "S");
      pdf.setTextColor(88, 28, 235);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("REPORT SUMMARY", margin + 5, y + 7);

      const stats = [
        { label: "Total Candidates", value: String(candidates.length) },
        { label: "Shortlisted", value: String(candidates.filter((c) => c.status === "shortlisted").length) },
        { label: "Rejected", value: String(candidates.filter((c) => c.status === "rejected").length) },
        { label: "Pending", value: String(candidates.filter((c) => c.status === "pending").length) },
        {
          label: "Avg Match Score",
          value: candidates.length > 0 ? `${Math.round(candidates.reduce((s, c) => s + c.matchScore, 0) / candidates.length)}/100` : "N/A",
        },
      ];

      stats.forEach((stat, i) => {
        const x = margin + 5 + i * 36;
        pdf.setTextColor(88, 28, 235);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(stat.value, x, y + 19);
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text(stat.label, x, y + 25);
      });
      y += 36;

      const shortlisted = candidates.filter((c) => c.status === "shortlisted");
      if (shortlisted.length > 0) {
        pdf.setTextColor(88, 28, 235);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Shortlisted Candidates", margin, y + 7);
        y += 12;

        pdf.setFillColor(88, 28, 235);
        pdf.rect(margin, y, pageWidth - 2 * margin, 8, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text("RANK", margin + 3, y + 5.5);
        pdf.text("CANDIDATE NAME", margin + 15, y + 5.5);
        pdf.text("JOB APPLIED", margin + 65, y + 5.5);
        pdf.text("MATCH SCORE", margin + 110, y + 5.5);
        pdf.text("STATUS", margin + 145, y + 5.5);
        pdf.text("DATE", margin + 165, y + 5.5);
        y += 8;

        shortlisted.forEach((candidate, index) => {
          if (y > 270) {
            pdf.addPage();
            y = 20;
          }
          if (index % 2 === 0) {
            pdf.setFillColor(245, 243, 255);
            pdf.rect(margin, y, pageWidth - 2 * margin, 9, "F");
          }
          pdf.setTextColor(31, 41, 55);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "bold");
          pdf.text(`#${index + 1}`, margin + 3, y + 6);
          pdf.setFont("helvetica", "normal");
          pdf.text(candidate.name.substring(0, 25), margin + 15, y + 6);
          pdf.text((candidate.jobTitle || "N/A").substring(0, 22), margin + 65, y + 6);
          pdf.setTextColor(22, 163, 74);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${candidate.matchScore}/100`, margin + 113, y + 6);
          pdf.text("SHORTLISTED", margin + 145, y + 6);
          pdf.setTextColor(107, 114, 128);
          pdf.setFont("helvetica", "normal");
          pdf.text(new Date(candidate.date).toLocaleDateString(), margin + 165, y + 6);
          y += 9;
        });
      }

      if (y > 225) {
        pdf.addPage();
        y = 20;
      } else {
        y += 10;
      }
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Job Performance Reports", margin, y + 7);
      y += 12;
      pdf.setFillColor(17, 24, 39);
      pdf.rect(margin, y, pageWidth - 2 * margin, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("JOB TITLE", margin + 3, y + 5.5);
      pdf.text("APPLICANTS", margin + 80, y + 5.5);
      pdf.text("AVG SCORE", margin + 110, y + 5.5);
      pdf.text("SHORTLIST RATE", margin + 140, y + 5.5);
      pdf.text("TOP CANDIDATE", margin + 165, y + 5.5);
      y += 8;

      jobStats.forEach((job, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin, y, pageWidth - 2 * margin, 9, "F");
        }
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(job.title.substring(0, 30), margin + 3, y + 6);
        pdf.text(String(job.totalApplicants), margin + 85, y + 6);
        pdf.text(`${job.avgScore}/100`, margin + 113, y + 6);
        pdf.setTextColor(88, 28, 235);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${Math.round(job.shortlistRate)}%`, margin + 148, y + 6);
        pdf.setTextColor(31, 41, 55);
        pdf.setFont("helvetica", "normal");
        pdf.text((job.topCandidate || "N/A").substring(0, 15), margin + 165, y + 6);
        y += 9;
      });

      const canvas = await html2canvas(element, {
        scale: 1,
        backgroundColor: "#ffffff",
      });
      const imageData = canvas.toDataURL("image/jpeg", 0.82);
      pdf.addPage();
      pdf.setFontSize(11);
      pdf.setTextColor(17, 24, 39);
      pdf.text("Visual Snapshot", margin, 16);
      pdf.addImage(imageData, "JPEG", 10, 20, 190, 255);

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i += 1) {
        pdf.setPage(i);
        pdf.setFillColor(243, 244, 246);
        pdf.rect(0, 285, 210, 12, "F");
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text("Umurava AI HR — Confidential Screening Report", margin, 291);
        pdf.text(`Page ${i} of ${totalPages}`, 195, 291, { align: "right" });
        pdf.text("ai-hr-pi.vercel.app", 105, 291, { align: "center" });
      }

      pdf.save(`umurava-screening-report-${new Date().toISOString().split("T")[0]}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const noData = filteredCandidates.length === 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Reports" subtitle="Candidate, job and screening reports with export-ready insights." />
        <div className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-5">
        <PageHeader title="Reports" subtitle="Candidate, job and screening reports with export-ready insights." />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-600 dark:text-red-300" />
          <p className="mt-3 text-sm text-red-700 dark:text-red-300">Failed to load reports data. Please retry.</p>
          <button
            type="button"
            onClick={() => {
              void refetchApplicants();
              void refetchJobs();
              void refetchScreenings();
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Candidate, job and screening reports with export-ready insights." />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Candidate, job and screening reports with export-ready insights
        </p>
        <button
          type="button"
          onClick={exportToPDF}
          disabled={isExporting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Export Report as PDF"}
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5 dark:border-slate-700 dark:bg-slate-900">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate name..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="all">All Jobs</option>
          {jobStats.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="all">All Statuses</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div id="report-content" className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <FileBarChart2 className="h-4 w-4 text-brand-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Candidate Reports</h2>
          </div>

          {noData ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-600">
              <FileBarChart2 className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-lg font-semibold text-slate-700 dark:text-slate-100">No reports yet. Run a screening to generate data.</p>
              <Link
                href="/screenings"
                className="mt-4 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Go to Screenings
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Job Applied</th>
                    <th className="px-4 py-3">Match Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredCandidates]
                    .sort((a, b) => b.matchScore - a.matchScore)
                    .map((row, idx) => (
                    <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">#{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{row.name}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.jobTitle}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${scoreBadge(row.matchScore)}`}>
                          {Math.round(row.matchScore)}/100
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusPill(row.status)}`}>{prettyStatus(row.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Link href={`/applicants?highlightApplicant=${row.id}`} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Job Reports</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobStats.map((report) => (
              <article key={report.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-brand-100 p-2 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <Briefcase className="h-4 w-4" />
                  </span>
                  <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{report.title}</h3>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total Applicants: {report.totalApplicants}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Top Candidate: {report.topCandidate}</p>
                <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Shortlist Rate: {report.shortlistRate.toFixed(1)}%</p>
                <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min(100, report.shortlistRate)}%` }} />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Avg Match Score: {report.avgScore}/100</p>
                <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.min(100, report.avgScore)}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Screening Reports</h2>
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total screenings run</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalScreenings}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Avg time to screen</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{formattedAvgTime}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Candidates in report</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{filteredCandidates.length}</p>
            </div>
          </div>
          <div className="h-72 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="scoreRange" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="url(#purpleGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
