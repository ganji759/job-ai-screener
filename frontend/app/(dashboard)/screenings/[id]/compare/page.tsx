"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "../../../../../components/layout/PageHeader";
import { Card } from "../../../../../components/ui/Card";
import { ScoreBar } from "../../../../../components/ui/ScoreBar";
import { useMemo } from "react";

export default function ComparePage() {
  const params = useParams<{ id: string }>();
  const data = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(`compare:${params.id}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [params.id]);

  const rows = useMemo(
    () =>
      (Array.isArray((data as { comparisons?: unknown[] } | null)?.comparisons)
        ? ((data as { comparisons: Array<{ candidateId: string; totalScore: number; breakdown?: Record<string, number>; estimatedOnboardingTime?: string; aiConfidenceScore?: number; recommendation?: string }> }).comparisons)
        : []),
    [data],
  );

  const best = rows.reduce<{ candidateId: string; totalScore: number } | null>((acc, row) => {
    if (!acc || row.totalScore > acc.totalScore) return { candidateId: row.candidateId, totalScore: row.totalScore };
    return acc;
  }, null);

  return (
    <div className="space-y-4">
      <PageHeader title={`Compare Candidates - Screening ${params.id}`} />
      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">No comparison data. Select candidates from screening page first.</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto rounded-xl border border-transparent dark:border-slate-700">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-brand-50 text-left text-xs uppercase text-brand-900 dark:bg-slate-800 dark:text-slate-100">
                  <th className="px-4 py-3">Criteria</th>
                  {rows.map((row) => (
                    <th key={row.candidateId} className={`px-4 py-3 ${best?.candidateId === row.candidateId ? "text-emerald-700 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"}`}>
                      {row.candidateId}
                      {best?.candidateId === row.candidateId ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          RECOMMENDED HIRE
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {["Skills", "Experience", "Education", "Cultural Fit", "Total Score", "Onboarding Time", "Confidence"].map((criterion) => (
                  <tr key={criterion} className="transition-colors hover:bg-brand-50/40 even:bg-slate-50/30 dark:hover:bg-slate-800/60 dark:even:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{criterion}</td>
                    {rows.map((row) => {
                      const breakdown = row.breakdown ?? {};
                      const value =
                        criterion === "Skills" ? Number(breakdown.skillsMatch ?? 0) :
                        criterion === "Experience" ? Number(breakdown.experienceMatch ?? 0) :
                        criterion === "Education" ? Number(breakdown.educationMatch ?? 0) :
                        criterion === "Cultural Fit" ? Number(breakdown.culturalFit ?? 0) :
                        criterion === "Total Score" ? Number(row.totalScore ?? 0) :
                        criterion === "Confidence" ? Number(row.aiConfidenceScore ?? 0) : 0;
                      return (
                        <td key={`${row.candidateId}-${criterion}`} className="px-4 py-3 text-slate-800 dark:text-slate-200">
                          {criterion === "Onboarding Time" ? (
                            <span className="tabular-nums">{row.estimatedOnboardingTime ?? "N/A"}</span>
                          ) : (
                            <div className="min-w-[140px]">
                              <ScoreBar label="" value={value} />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-brand-50/30 dark:bg-slate-800/50">
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">AI Recommendation</td>
                  {rows.map((row) => (
                    <td key={`${row.candidateId}-rec`} className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {row.recommendation ?? "N/A"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
