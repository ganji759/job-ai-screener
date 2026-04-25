"use client";

import { Target, Wallet, Clock, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";
import { SkillBadge } from "../ui/SkillBadge";
import { ScoreGauge } from "../ui/ScoreGauge";

export type JobBenchmarkShape = {
  poolStrengthScore?: number;
  hardestSkillsToFind?: string[];
  recommendedSalaryRange?: string;
  timeToFillEstimate?: string;
};

export const JobBenchmarkPanel = ({ benchmark }: { benchmark: JobBenchmarkShape }) => {
  const score = Number(benchmark.poolStrengthScore ?? 0);
  const skills = Array.isArray(benchmark.hardestSkillsToFind) ? benchmark.hardestSkillsToFind : [];
  const salary = benchmark.recommendedSalaryRange ?? "—";
  const timeToFill = benchmark.timeToFillEstimate ?? "—";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-brand-100 pb-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Sparkles className="h-5 w-5 text-brand-600" aria-hidden />
            Market benchmark
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">AI estimate for this role based on your job profile and talent pool signals.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600/10 via-white to-violet-600/10 p-6 dark:from-brand-900/30 dark:via-slate-900 dark:to-violet-900/20 lg:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Pool strength</p>
          <div className="mt-3 flex flex-col items-center gap-2">
            <ScoreGauge value={score} />
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">Higher = stronger overall match depth</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
          <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-brand-sm dark:border-slate-700 dark:bg-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Wallet className="h-4 w-4 text-brand-600" aria-hidden />
              Recommended salary
            </div>
            <p className="mt-3 text-2xl font-bold text-brand-800 dark:text-brand-300">{salary}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Indicative range for competitive offers</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-brand-sm dark:border-slate-700 dark:bg-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4 text-violet-600" aria-hidden />
              Time to fill (estimate)
            </div>
            <p className="mt-3 text-2xl font-bold text-violet-800 dark:text-violet-300">{timeToFill}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Based on market velocity for similar roles</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white p-5 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Target className="h-4 w-4 text-amber-600" aria-hidden />
              Hardest skills to source
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Prioritize outreach and assessments on these capabilities.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.length ? (
                skills.map((s) => <SkillBadge key={s} skill={s} variant="neutral" />)
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No benchmark skills returned.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
