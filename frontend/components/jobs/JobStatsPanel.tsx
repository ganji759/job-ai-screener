"use client";

import Link from "next/link";
import { Users, BarChart3, ListChecks, TrendingUp, AlertTriangle } from "lucide-react";
import { Card } from "../ui/Card";
import { SkillBadge } from "../ui/SkillBadge";
import { StatusBadge } from "../ui/StatusBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { EmptyState } from "../ui/EmptyState";

export type JobStatsShape = {
  applicantCount?: number;
  statusBreakdown?: Record<string, number>;
  averageScore?: number;
  topSkillsInPool?: string[];
  skillGapsVsRequirements?: string[];
  screeningHistory?: Array<Record<string, unknown>>;
};

export const JobStatsPanel = ({ stats, jobId }: { stats: JobStatsShape; jobId: string }) => {
  const applicants = Number(stats.applicantCount ?? 0);
  const avgScore = Number(stats.averageScore ?? 0);
  const history = Array.isArray(stats.screeningHistory) ? stats.screeningHistory : [];
  const breakdown = stats.statusBreakdown ?? {};
  const breakdownEntries = Object.entries(breakdown).filter(([, n]) => Number(n) > 0);
  const totalApplicants = breakdownEntries.reduce((s, [, n]) => s + Number(n), 0) || applicants || 1;
  const topSkills = stats.topSkillsInPool ?? [];
  const gaps = stats.skillGapsVsRequirements ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-brand-500/10 blur-2xl" aria-hidden />
          <div className="relative flex items-start gap-3">
            <span className="rounded-xl bg-brand-100 p-2.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Applicants</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{applicants}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">In this job pipeline</p>
            </div>
          </div>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden />
          <div className="relative flex items-start gap-3">
            <span className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg match score</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{avgScore}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">From latest completed screening</p>
              <div className="mt-3">
                <ProgressBar value={avgScore} />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
              <ListChecks className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Screenings</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{history.length}</p>
              <Link href={`/jobs/${jobId}/screenings`} className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
                View history →
              </Link>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pipeline mix</p>
              {breakdownEntries.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No status breakdown yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {breakdownEntries.map(([status, count]) => (
                    <li key={status} className="flex items-center gap-2 text-sm">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {status.replace(/_/g, " ")}
                      </span>
                      <span className="tabular-nums text-slate-600 dark:text-slate-300">{Number(count)}</span>
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.min(100, (Number(count) / totalApplicants) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Top skills in pool</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Signals from your latest screening runs.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {topSkills.length ? (
              topSkills.map((s) => <SkillBadge key={s} skill={s} variant="match" />)
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Run a screening to see top skills in the pool.</p>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
            Skill gaps vs requirements
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Where the pool is thin — adjust sourcing or JD.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {gaps.length ? (
              gaps.map((s) => <SkillBadge key={s} skill={s} variant="missing" />)
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No critical gaps flagged.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Screening history</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Recent runs for this job.</p>
          </div>
          <Link href={`/jobs/${jobId}/screenings`} className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400">
            Manage screenings
          </Link>
        </div>
        {history.length === 0 ? (
          <EmptyState
            title="No screenings yet"
            description="Start an AI screening to rank candidates for this role."
            actionLabel="Run screening"
            action={() => {
              window.location.href = `/jobs/${jobId}/screenings`;
            }}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-100 dark:border-slate-700">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-brand-50 text-left text-xs font-semibold uppercase tracking-wide text-brand-900 dark:bg-slate-800 dark:text-slate-100">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Shortlist</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100 dark:divide-slate-700">
                {history.map((row) => {
                  const sid = String(row._id ?? "");
                  const st = String(row.status ?? "queued");
                  const shortlistSize = Number(row.shortlistSize ?? 0);
                  const progress = st === "completed" ? 100 : st === "running" ? 55 : st === "failed" ? 0 : 10;
                  return (
                    <tr key={sid} className="bg-white transition-colors hover:bg-brand-50/40 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={st as "queued" | "running" | "completed" | "failed"} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-800 dark:text-slate-200">{shortlistSize}</td>
                      <td className="px-4 py-3">
                        <ProgressBar value={progress} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/screenings/${sid}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
