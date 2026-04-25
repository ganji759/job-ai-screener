"use client";

import { useMemo, useState } from "react";
import { Download, FileBarChart2, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGetApplicantsQuery } from "../../../../store/api/applicantsApi";
import { useGetJobsQuery } from "../../../../store/api/jobsApi";
import { useGetDashboardAnalyticsQuery } from "../../../../store/api/screeningsApi";
import { PageHeader } from "../../../../components/layout/PageHeader";

type CandidateStatus = "Shortlisted" | "Rejected" | "Pending";

type CandidateReportRow = {
  id: string;
  name: string;
  jobId: string;
  jobTitle: string;
  matchScore: number;
  status: CandidateStatus;
  date: string;
};

function normalizeStatus(status: string): CandidateStatus {
  if (status === "shortlisted") return "Shortlisted";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: applicantsData } = useGetApplicantsQuery({ jobId: "all", page: 1, limit: 1000 });
  const { data: jobsData } = useGetJobsQuery({ page: 1, limit: 200 });
  const { data: analyticsData } = useGetDashboardAnalyticsQuery();

  const jobs = jobsData?.jobs ?? [];
  const applicants = applicantsData?.applicants ?? [];

  const jobById = useMemo(() => new Map(jobs.map((job) => [job._id, job.title])), [jobs]);

  const candidateRows = useMemo<CandidateReportRow[]>(
    () =>
      applicants.map((applicant) => {
        const name = `${applicant.profile.firstName ?? ""} ${applicant.profile.lastName ?? ""}`.trim() || "Unknown Candidate";
        const matchScore = Number(applicant.totalScore ?? 0);
        return {
          id: applicant._id,
          name,
          jobId: applicant.jobId,
          jobTitle: jobById.get(applicant.jobId) ?? "Unknown Job",
          matchScore,
          status: normalizeStatus(applicant.status),
          date: applicant.createdAt,
        };
      }),
    [applicants, jobById],
  );

  const filteredCandidates = useMemo(() => {
    return candidateRows.filter((row) => {
      const matchesName = row.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
      const matchesJob = jobFilter === "all" || row.jobId === jobFilter;
      const matchesStatus = statusFilter === "all" || row.status.toLowerCase() === statusFilter.toLowerCase();
      const rowDate = new Date(row.date);
      const afterStart = !startDate || rowDate >= new Date(startDate);
      const beforeEnd = !endDate || rowDate <= new Date(`${endDate}T23:59:59`);
      return matchesName && matchesJob && matchesStatus && afterStart && beforeEnd;
    });
  }, [candidateRows, searchTerm, jobFilter, statusFilter, startDate, endDate]);

  const jobReports = useMemo(() => {
    return jobs.map((job) => {
      const rows = candidateRows.filter((row) => row.jobId === job._id);
      const totalApplicants = rows.length;
      const shortlisted = rows.filter((row) => row.status === "Shortlisted").length;
      const avgMatchScore = totalApplicants ? rows.reduce((sum, row) => sum + row.matchScore, 0) / totalApplicants : 0;
      const shortlistRate = totalApplicants ? (shortlisted / totalApplicants) * 100 : 0;
      const topCandidate = rows.sort((a, b) => b.matchScore - a.matchScore)[0];
      return {
        id: job._id,
        title: job.title,
        totalApplicants,
        avgMatchScore,
        shortlistRate,
        topCandidateName: topCandidate?.name ?? "N/A",
      };
    });
  }, [jobs, candidateRows]);

  const scoreDistribution = ((analyticsData?.scoreDistribution as Array<{ range: string; count: number }>) ?? []).map((item) => ({
    scoreRange: item.range,
    count: item.count,
  }));

  const totalScreenings = Number(analyticsData?.totalScreenings ?? 0);
  const averageTimeToScreen = Number(analyticsData?.averageTimeToScreen ?? 0);
  const formattedAvgTime =
    averageTimeToScreen > 0
      ? `${Math.max(1, Math.round(averageTimeToScreen / 60000))} min`
      : "No completed screenings yet";

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const noData = filteredCandidates.length === 0 && candidateRows.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Candidate, job and screening reports with export-ready insights." />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Generate recruiter-ready reports by filtering candidates, job outcomes, and screening trends.
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
          {jobs.map((job) => (
            <option key={job._id} value={job._id}>
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
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-100">No reports yet. Run a screening to generate data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Job Applied</th>
                    <th className="px-4 py-3">Match Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{row.name}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.jobTitle}</td>
                      <td className="px-4 py-3 font-semibold text-brand-600 dark:text-brand-300">{row.matchScore.toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{new Date(row.date).toLocaleDateString()}</td>
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
            {jobReports.map((report) => (
              <article key={report.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{report.title}</h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total Applicants: {report.totalApplicants}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg Match Score: {report.avgMatchScore.toFixed(1)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Top Candidate: {report.topCandidateName}</p>
                <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Shortlist Rate: {report.shortlistRate.toFixed(1)}%</p>
                <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min(100, report.shortlistRate)}%` }} />
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
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
