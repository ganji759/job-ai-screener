"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BarChart3 as BarChartIcon,
  Briefcase,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  Users,
} from "lucide-react";
import { useGetApplicantsQuery } from "../../../store/api/applicantsApi";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { useGetDashboardAnalyticsQuery, useGetScreeningsQuery } from "../../../store/api/screeningsApi";
import { CandidateProfileModal } from "../../../components/reports/CandidateProfileModal";
import type { Applicant } from "../../../types";

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
  if (status === "shortlisted") return "pill pill-mint";
  if (status === "rejected") return "pill pill-rose";
  return "pill pill-amber";
}

function scorePillColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  return "#fb7185";
}

const SAVED_REPORTS: Array<{ name: string; by: string; updated: string; kind: string; shares: number }> = [
  { name: "Quarterly hiring scorecard", by: "James Davidson", updated: "2h ago", kind: "Scorecard", shares: 4 },
  { name: "Source attribution · 90 days", by: "Auto · HERON", updated: "Yesterday", kind: "Attribution", shares: 0 },
  { name: "Diversity & inclusion summary", by: "Aisha M.", updated: "2d ago", kind: "D&I", shares: 12 },
  { name: "Engineering pipeline health", by: "James Davidson", updated: "4d ago", kind: "Pipeline", shares: 2 },
  { name: "Recruiter throughput", by: "Auto · HERON", updated: "1w ago", kind: "Operations", shares: 1 },
];

const TEMPLATES: Array<{
  name: string;
  desc: string;
  color: string;
  icon: typeof FileText;
  tab: ReportTab;
}> = [
  { name: "Weekly recap", desc: "Hiring activity by role", icon: FileText, color: "#6366f1", tab: "overview" },
  { name: "Funnel breakdown", desc: "Stage-by-stage rates", icon: BarChartIcon, color: "#d946ef", tab: "screenings" },
  { name: "Time-to-hire", desc: "Median + p90 cycle time", icon: Clock, color: "#22d3ee", tab: "screenings" },
  { name: "D&I snapshot", desc: "Diversity through stages", icon: Users, color: "#34d399", tab: "candidates" },
];

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
  const [profileApplicantId, setProfileApplicantId] = useState<string | null>(null);

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

  const profileApplicant: Applicant | null = useMemo(
    () => (applicantsData?.applicants ?? []).find((a) => a._id === profileApplicantId) ?? null,
    [applicantsData?.applicants, profileApplicantId],
  );

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
      const pdf = new jsPDF("p", "mm", "a4");
      const W = 210;
      const M = 14;

      // PAGE 1 — COVER
      pdf.setFillColor(88, 28, 235);
      pdf.rect(0, 0, W, 90, "F");

      pdf.setFillColor(224, 216, 255);
      pdf.circle(190, 10, 40, "F");
      pdf.circle(200, 60, 25, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text("HERON", M, 35);

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(196, 181, 253);
      pdf.text("AI-Powered Talent Screening Platform", M, 46);

      pdf.setDrawColor(139, 92, 246);
      pdf.setLineWidth(0.4);
      pdf.line(M, 55, W - M, 55);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("CANDIDATE SCREENING REPORT", M, 67);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(196, 181, 253);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
        M,
        77,
      );

      let y = 100;
      pdf.setFillColor(237, 233, 254);
      pdf.roundedRect(M, y, W - 2 * M, 40, 4, 4, "F");
      pdf.setDrawColor(167, 139, 250);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(M, y, W - 2 * M, 40, 4, 4, "S");
      pdf.setTextColor(88, 28, 235);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("EXECUTIVE SUMMARY", M + 6, y + 9);

      const shortCount = candidates.filter((c) => c.status === "shortlisted").length;
      const rejCount = candidates.filter((c) => c.status === "rejected").length;
      const pendCount = candidates.filter((c) => c.status === "pending").length;
      const avgScore = candidates.length > 0 ? Math.round(candidates.reduce((s, c) => s + c.score, 0) / candidates.length) : 0;
      const summaryStats = [
        { label: "Total", value: String(candidates.length) },
        { label: "Shortlisted", value: String(shortCount) },
        { label: "Rejected", value: String(rejCount) },
        { label: "Pending", value: String(pendCount) },
        { label: "Avg Score", value: `${avgScore}/100` },
      ];

      summaryStats.forEach((s, i) => {
        const x = M + 6 + i * 36;
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(88, 28, 235);
        pdf.text(s.value, x, y + 26);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(109, 40, 217);
        pdf.text(s.label, x, y + 33);
      });

      y = 155;
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Score Distribution", M, y);
      y += 6;
      const barData = [
        { range: "0-20", count: candidates.filter((c) => c.score <= 20).length },
        { range: "21-40", count: candidates.filter((c) => c.score > 20 && c.score <= 40).length },
        { range: "41-60", count: candidates.filter((c) => c.score > 40 && c.score <= 60).length },
        { range: "61-80", count: candidates.filter((c) => c.score > 60 && c.score <= 80).length },
        { range: "81-100", count: candidates.filter((c) => c.score > 80).length },
      ];
      const maxCount = Math.max(...barData.map((d) => d.count), 1);
      const chartH = 35;
      const barW = 22;
      const chartX = M + 10;
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(M, y, W - 2 * M, chartH + 20, 3, 3, "F");
      barData.forEach((d, i) => {
        const bx = chartX + i * (barW + 8);
        const bh = d.count > 0 ? (d.count / maxCount) * chartH : 2;
        const by = y + 5 + chartH - bh;
        if (i === 0) pdf.setFillColor(239, 68, 68);
        else if (i === 1) pdf.setFillColor(249, 115, 22);
        else if (i === 2) pdf.setFillColor(234, 179, 8);
        else if (i === 3) pdf.setFillColor(34, 197, 94);
        else pdf.setFillColor(22, 163, 74);
        pdf.roundedRect(bx, by, barW, bh, 1, 1, "F");
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(String(d.count), bx + barW / 2 - 1.5, by - 2);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        pdf.text(d.range, bx + 2, y + chartH + 14);
      });

      y += chartH + 30;
      pdf.setFillColor(240, 253, 244);
      pdf.roundedRect(M, y, (W - 2 * M) / 2 - 3, 25, 3, 3, "F");
      pdf.setDrawColor(134, 239, 172);
      pdf.roundedRect(M, y, (W - 2 * M) / 2 - 3, 25, 3, 3, "S");
      pdf.setTextColor(22, 163, 74);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(shortCount), M + 5, y + 16);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(21, 128, 61);
      pdf.text("candidates shortlisted", M + 5, y + 22);
      const rx = M + (W - 2 * M) / 2 + 3;
      pdf.setFillColor(254, 242, 242);
      pdf.roundedRect(rx, y, (W - 2 * M) / 2 - 3, 25, 3, 3, "F");
      pdf.setDrawColor(252, 165, 165);
      pdf.roundedRect(rx, y, (W - 2 * M) / 2 - 3, 25, 3, 3, "S");
      pdf.setTextColor(185, 28, 28);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(rejCount), rx + 5, y + 16);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(153, 27, 27);
      pdf.text("candidates rejected", rx + 5, y + 22);

      // PAGE 2 — CANDIDATES
      pdf.addPage();
      pdf.setFillColor(88, 28, 235);
      pdf.rect(0, 0, W, 18, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("SHORTLISTED CANDIDATES", M, 12);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(196, 181, 253);
      pdf.text("HERON — Screening Report", W - M, 12, { align: "right" });
      y = 28;
      pdf.setFillColor(88, 28, 235);
      pdf.roundedRect(M, y, W - 2 * M, 9, 1, 1, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      [
        { label: "RANK", x: M + 3 },
        { label: "CANDIDATE NAME", x: M + 16 },
        { label: "JOB APPLIED", x: M + 63 },
        { label: "SCORE", x: M + 108 },
        { label: "STATUS", x: M + 132 },
        { label: "DATE", x: M + 162 },
      ].forEach((c) => pdf.text(c.label, c.x, y + 6));
      y += 9;
      const shortlisted = candidates.filter((c) => c.status === "shortlisted");
      shortlisted.forEach((c, i) => {
        if (y > 272) { pdf.addPage(); y = 20; }
        if (i % 2 === 0) { pdf.setFillColor(245, 243, 255); pdf.rect(M, y, W - 2 * M, 10, "F"); }
        pdf.setFillColor(88, 28, 235); pdf.circle(M + 7, y + 5, 4, "F");
        pdf.setTextColor(255, 255, 255); pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); pdf.text(String(i + 1), M + 5.5, y + 6.5);
        pdf.setTextColor(17, 24, 39); pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.text(c.name.substring(0, 22), M + 16, y + 6.5);
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(75, 85, 99); pdf.text((c.job || "N/A").substring(0, 20), M + 63, y + 6.5);
        const score = c.score || 0;
        let sr = 254, sg = 226, sb = 226, tr = 185, tg = 28, tb = 28;
        if (score >= 80) { sr = 220; sg = 252; sb = 231; tr = 22; tg = 163; tb = 74; }
        else if (score >= 60) { sr = 254; sg = 249; sb = 195; tr = 161; tg = 98; tb = 7; }
        pdf.setFillColor(sr, sg, sb); pdf.roundedRect(M + 106, y + 1.5, 20, 7, 2, 2, "F");
        pdf.setTextColor(tr, tg, tb); pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.text(`${score}/100`, M + 108, y + 6.5);
        pdf.setFillColor(220, 252, 231); pdf.roundedRect(M + 130, y + 1.5, 25, 7, 2, 2, "F");
        pdf.setTextColor(22, 163, 74); pdf.setFontSize(7); pdf.text("SHORTLISTED", M + 132, y + 6.5);
        pdf.setTextColor(107, 114, 128); pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.text(c.date || "-", M + 162, y + 6.5);
        pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.2); pdf.line(M, y + 10, W - M, y + 10); y += 10;
      });
      if (y > 230) { pdf.addPage(); y = 20; } else y += 8;
      pdf.setFillColor(185, 28, 28); pdf.roundedRect(M, y, W - 2 * M, 9, 1, 1, "F");
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.text("REJECTED CANDIDATES", M + 3, y + 6.5); y += 9;
      pdf.setFillColor(254, 226, 226); pdf.rect(M, y, W - 2 * M, 9, "F");
      pdf.setTextColor(153, 27, 27); pdf.setFontSize(7.5); pdf.text("NAME", M + 3, y + 6); pdf.text("JOB APPLIED", M + 63, y + 6); pdf.text("SCORE", M + 108, y + 6); pdf.text("DATE", M + 162, y + 6); y += 9;
      candidates.filter((c) => c.status === "rejected").forEach((c, i) => {
        if (y > 272) { pdf.addPage(); y = 20; }
        if (i % 2 === 0) { pdf.setFillColor(255, 249, 249); pdf.rect(M, y, W - 2 * M, 10, "F"); }
        pdf.setTextColor(17, 24, 39); pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.text(c.name.substring(0, 22), M + 3, y + 6.5);
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(75, 85, 99); pdf.text((c.job || "N/A").substring(0, 20), M + 63, y + 6.5);
        pdf.setFillColor(254, 226, 226); pdf.roundedRect(M + 106, y + 1.5, 20, 7, 2, 2, "F");
        pdf.setTextColor(185, 28, 28); pdf.setFont("helvetica", "bold"); pdf.text(`${c.score}/100`, M + 108, y + 6.5);
        pdf.setTextColor(107, 114, 128); pdf.setFont("helvetica", "normal"); pdf.text(c.date || "-", M + 162, y + 6.5);
        pdf.setDrawColor(254, 202, 202); pdf.setLineWidth(0.2); pdf.line(M, y + 10, W - M, y + 10); y += 10;
      });

      // PAGE 3 — JOB PERFORMANCE
      pdf.addPage();
      pdf.setFillColor(17, 24, 39); pdf.rect(0, 0, W, 18, "F");
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.text("JOB PERFORMANCE REPORT", M, 12);
      y = 28;
      pdf.setFillColor(31, 41, 55); pdf.roundedRect(M, y, W - 2 * M, 9, 1, 1, "F");
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(7.5);
      pdf.text("JOB TITLE", M + 3, y + 6); pdf.text("APPLICANTS", M + 75, y + 6); pdf.text("AVG SCORE", M + 103, y + 6); pdf.text("SHORTLIST RATE", M + 132, y + 6); pdf.text("TOP CANDIDATE", M + 165, y + 6);
      y += 9;
      mockJobs.forEach((j, i) => {
        if (y > 272) { pdf.addPage(); y = 20; }
        if (i % 2 === 0) { pdf.setFillColor(249, 250, 251); pdf.rect(M, y, W - 2 * M, 14, "F"); }
        pdf.setTextColor(17, 24, 39); pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.text(j.title.substring(0, 26), M + 3, y + 6);
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(75, 85, 99); pdf.text(String(j.applicants), M + 80, y + 6);
        pdf.setTextColor(17, 24, 39); pdf.setFont("helvetica", "bold"); pdf.text(`${j.avgScore}/100`, M + 103, y + 6);
        pdf.setFillColor(229, 231, 235); pdf.roundedRect(M + 103, y + 7, 25, 2.5, 1, 1, "F");
        pdf.setFillColor(88, 28, 235); pdf.roundedRect(M + 103, y + 7, (25 * j.avgScore) / 100, 2.5, 1, 1, "F");
        let fr = 254, fg = 226, fb = 226, tr = 185, tg = 28, tb = 28;
        if (j.shortlistRate >= 70) { fr = 220; fg = 252; fb = 231; tr = 22; tg = 163; tb = 74; }
        else if (j.shortlistRate >= 40) { fr = 254; fg = 249; fb = 195; tr = 161; tg = 98; tb = 7; }
        pdf.setFillColor(fr, fg, fb); pdf.roundedRect(M + 132, y + 1, 22, 8, 2, 2, "F");
        pdf.setTextColor(tr, tg, tb); pdf.setFontSize(8); pdf.setFont("helvetica", "bold"); pdf.text(`${j.shortlistRate}%`, M + 137, y + 6.5);
        pdf.setTextColor(75, 85, 99); pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.text((j.topCandidate || "N/A").substring(0, 14), M + 165, y + 6);
        pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.2); pdf.line(M, y + 14, W - M, y + 14);
        y += 14;
      });

      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p += 1) {
        pdf.setPage(p);
        pdf.setFillColor(243, 244, 246); pdf.rect(0, 285, W, 12, "F");
        pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.2); pdf.line(0, 285, W, 285);
        pdf.setTextColor(107, 114, 128); pdf.setFontSize(7); pdf.setFont("helvetica", "normal");
        pdf.text("HERON — Confidential Screening Report", M, 291);
        pdf.text(`Page ${p} of ${totalPages}`, W - M, 291, { align: "right" });
        pdf.text("ai-hr-pi.vercel.app", W / 2, 291, { align: "center" });
      }

      pdf.save(`umurava-report-${new Date().toISOString().split("T")[0]}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportToExcel = async () => {
    setIsExportingExcel(true);
    try {
      const XLSXModule = await import("xlsx");
      const XLSX = (XLSXModule.default ?? XLSXModule) as typeof import("xlsx");
      const wb = XLSX.utils.book_new();

      const candidateData = [
        ["HERON — CANDIDATE SCREENING REPORT"],
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
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-[10px]">Workspace · Reports</div>
          <h1 className="display m-0" style={{ fontSize: 32 }}>
            Reports.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)", margin: "8px 0 0", maxWidth: 720 }}>
            Custom dashboards and saved reports — for stakeholders, leadership, and audits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <button type="button" onClick={exportToPDF} disabled={isExportingPdf} className="btn btn-ghost">
            <Download className="h-3 w-3" /> {isExportingPdf ? "Exporting…" : "Export PDF"}
          </button>
          <button type="button" onClick={exportToExcel} disabled={isExportingExcel} className="btn btn-ghost">
            <FileSpreadsheet className="h-3 w-3" /> {isExportingExcel ? "Exporting…" : "Export Excel"}
          </button>
          <button type="button" className="btn btn-primary">
            <Plus className="h-3 w-3" /> New report
          </button>
        </div>
      </div>

      {/* Templates */}
      <div className="eyebrow mb-3">Templates</div>
      <div
        className="mb-[26px] grid gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
      >
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.name}
              type="button"
              onClick={() => {
                setTab(t.tab);
                document.getElementById("report-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="panel lift text-left"
              style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${t.color}33, ${t.color}1a)`,
                  border: `1px solid ${t.color}55`,
                  color: t.color,
                }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="text-sm font-semibold" style={{ color: "#fff" }}>
                {t.name}
              </div>
              <div className="text-[12px]" style={{ color: "var(--ink-3)" }}>
                {t.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Saved reports */}
      <div className="eyebrow mb-3">Saved reports</div>
      <div className="panel mb-[26px] overflow-hidden" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Report</th>
              <th>Type</th>
              <th>Last updated</th>
              <th>Owner</th>
              <th>Shared with</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {SAVED_REPORTS.map((r) => (
              <tr key={r.name}>
                <td>
                  <div className="flex items-center gap-[10px]">
                    <span
                      className="flex items-center justify-center"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: "rgba(99,102,241,.12)",
                        border: "1px solid rgba(99,102,241,.28)",
                        color: "#c7d2fe",
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium" style={{ color: "#fff" }}>
                      {r.name}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="pill pill-indigo">{r.kind}</span>
                </td>
                <td className="mono text-[12px]" style={{ color: "var(--ink-3)" }}>
                  {r.updated}
                </td>
                <td>{r.by}</td>
                <td>
                  <span className="mono" style={{ color: "#fff" }}>
                    {r.shares}
                  </span>{" "}
                  <span style={{ color: "var(--ink-3)" }}>recipients</span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="inline-flex gap-1">
                    <button type="button" className="btn-icon" style={{ width: 28, height: 28 }} title="View">
                      <Eye className="h-3 w-3" />
                    </button>
                    <button type="button" className="btn-icon" style={{ width: 28, height: 28 }} title="Share">
                      <Upload className="h-3 w-3" />
                    </button>
                    <button type="button" className="btn-icon" style={{ width: 28, height: 28 }} title="More">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom builder */}
      <div className="eyebrow mb-3">Custom report builder</div>

      <div className="panel mb-[18px] flex flex-wrap items-center gap-3" style={{ padding: 14 }}>
        <div className="relative" style={{ flex: "1 1 240px", minWidth: 220 }}>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: "var(--ink-4)" }}
          />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search candidate name…"
            className="input"
            style={{ paddingLeft: 38 }}
          />
        </div>
        <select value={jobDraft} onChange={(e) => setJobDraft(e.target.value)} className="input" style={{ width: "auto" }}>
          <option value="all">All Jobs</option>
          {jobs.map((job) => (
            <option key={job._id} value={job._id}>
              {job.title}
            </option>
          ))}
        </select>
        <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} className="input" style={{ width: "auto" }}>
          <option value="all">All Statuses</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
        </select>
        <select value={yearDraft} onChange={(e) => setYearDraft(e.target.value)} className="input" style={{ width: "auto" }}>
          <option value="all">Year</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
        <input
          type="date"
          value={fromDraft}
          onChange={(e) => setFromDraft(e.target.value)}
          className="input"
          style={{ width: "auto" }}
        />
        <input
          type="date"
          value={toDraft}
          onChange={(e) => setToDraft(e.target.value)}
          className="input"
          style={{ width: "auto" }}
        />
        <button
          type="button"
          onClick={() =>
            setFilters({
              search: searchDraft,
              job: jobDraft,
              status: statusDraft,
              year: yearDraft,
              from: fromDraft,
              to: toDraft,
            })
          }
          className="btn btn-primary ml-auto"
        >
          <Filter className="h-3 w-3" /> Apply
        </button>
      </div>

      <div className="mb-[18px] flex flex-wrap gap-2">
        {(["candidates", "jobs", "screenings", "overview"] as ReportTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`btn ${tab === t ? "btn-primary" : "btn-ghost"}`}
            style={{ height: 32, fontSize: 12 }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div id="report-content" className="space-y-5">
        {tab === "candidates" ? (
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            {filteredCandidates.length === 0 ? (
              <div
                className="px-4 py-12 text-center"
                style={{ color: "var(--ink-3)" }}
              >
                <p className="display" style={{ fontSize: 18, color: "#fff" }}>
                  No candidates yet
                </p>
                <p className="mt-1 text-sm">Run a screening to generate data.</p>
                <Link href="/screenings" className="btn btn-primary mt-4">
                  Go to Screenings
                </Link>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Job Applied</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c) => (
                    <tr key={c.id}>
                      <td className="mono" style={{ color: "var(--ink-3)" }}>
                        #{c.rank}
                      </td>
                      <td className="font-medium" style={{ color: "#fff" }}>
                        {c.name}
                      </td>
                      <td style={{ color: "var(--ink-2)" }}>{c.job}</td>
                      <td>
                        <span className="mono font-semibold" style={{ color: scorePillColor(c.score) }}>
                          {c.score}/100
                        </span>
                      </td>
                      <td>
                        <span className={statusPill(c.status)}>{c.status}</span>
                      </td>
                      <td className="mono text-[12px]" style={{ color: "var(--ink-3)" }}>
                        {new Date(c.date).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setProfileApplicantId(c.id)}
                          className="btn btn-ghost"
                          style={{ height: 26, fontSize: 11 }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {tab === "jobs" ? (
          <div
            className="grid gap-[14px]"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
          >
            {(jobStats.length ? jobStats : mockJobs).map((job) => (
              <div key={job.title} className="panel panel-tight">
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "rgba(99,102,241,.14)",
                      border: "1px solid rgba(99,102,241,.28)",
                      color: "#c7d2fe",
                    }}
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="truncate text-sm font-semibold" style={{ color: "#fff" }}>
                    {job.title}
                  </h3>
                </div>
                <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
                  Applicants · {job.applicants} · Top {job.topCandidate}
                </p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px]" style={{ color: "var(--ink-3)" }}>
                    <span>Avg match score</span>
                    <span className="mono" style={{ color: "#fff" }}>{job.avgScore}/100</span>
                  </div>
                  <div className="mini-bar">
                    <span style={{ width: `${Math.min(100, job.avgScore)}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="pill pill-mint">
                    <span className="mono">{job.shortlistRate}%</span> shortlist
                  </span>
                  <button type="button" className="btn btn-ghost" style={{ height: 28, fontSize: 11 }}>
                    View Candidates
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "screenings" ? (
          <div className="panel panel-lg">
            <div className="mb-4 grid gap-[14px] sm:grid-cols-3">
              {[
                { label: "Total Screenings", value: String(screeningTotal), color: "#6366f1" },
                { label: "Avg Time to Screen", value: formatDuration(averageTime), color: "#22d3ee" },
                { label: "Completion Rate", value: `${completionRate}%`, color: "#34d399" },
              ].map((tile) => (
                <div
                  key={tile.label}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,.025)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div className="eyebrow">{tile.label}</div>
                  <p className="display mt-1" style={{ fontSize: 24, color: tile.color }}>
                    {tile.value}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="h-[260px]"
              style={{
                background: "rgba(255,255,255,.02)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="range" tick={{ fill: "#8a8aa3", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#8a8aa3", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#818cf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {tab === "overview" ? (
          <div className="panel panel-lg">
            <div className="mb-4 grid gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Candidates screened", value: String(filteredCandidates.length), color: "#6366f1" },
                { label: "Jobs with applicants", value: String(jobStats.length), color: "#d946ef" },
                { label: "Best performing", value: `${bestJob?.title ?? "—"}`, color: "#34d399", sub: `${bestJob?.shortlistRate ?? 0}%` },
                { label: "Weakest match", value: `${worstJob?.title ?? "—"}`, color: "#fbbf24", sub: `${worstJob?.avgScore ?? 0}/100` },
              ].map((tile) => (
                <div
                  key={tile.label}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,.025)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div className="eyebrow">{tile.label}</div>
                  <p
                    className={tile.value.length > 10 ? "text-sm font-semibold" : "display"}
                    style={{ fontSize: tile.value.length > 10 ? 14 : 22, color: tile.color, lineHeight: 1.2, marginTop: 4 }}
                  >
                    {tile.value}
                  </p>
                  {"sub" in tile && tile.sub ? (
                    <p className="mono mt-1 text-[11px]" style={{ color: "var(--ink-3)" }}>
                      {tile.sub}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Candidates</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.length ? (
                    monthlyRows.map((m) => (
                      <tr key={m.month}>
                        <td className="mono" style={{ color: "var(--ink-2)" }}>{m.month}</td>
                        <td className="mono" style={{ color: "#fff" }}>{m.count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-6 text-center" style={{ color: "var(--ink-3)" }}>
                        No monthly data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <CandidateProfileModal
        open={profileApplicantId != null}
        applicant={profileApplicant}
        onClose={() => setProfileApplicantId(null)}
        jobTitle={profileApplicant ? (jobById.get(profileApplicant.jobId) ?? undefined) : undefined}
        rank={filteredCandidates.find((c) => c.id === profileApplicantId)?.rank}
      />
    </div>
  );
}
