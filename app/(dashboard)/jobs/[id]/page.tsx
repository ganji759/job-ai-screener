"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { useGetJobQuery, useGetJobStatsQuery, useGetJobBenchmarkQuery } from "../../../../store/api/jobsApi";
import { JobStatsPanel, type JobStatsShape } from "../../../../components/jobs/JobStatsPanel";
import { JobBenchmarkPanel, type JobBenchmarkShape } from "../../../../components/jobs/JobBenchmarkPanel";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { SkillBadge } from "../../../../components/ui/SkillBadge";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: job, isLoading: jobLoading } = useGetJobQuery(id);
  const { data: stats, isLoading: statsLoading } = useGetJobStatsQuery(id);
  const { data: benchmark } = useGetJobBenchmarkQuery(id);

  const mustHave = job?.requirements?.mustHaveSkills ?? [];
  const niceHave = job?.requirements?.niceToHaveSkills ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" subtitle="Role summary, pipeline intelligence, and hiring benchmarks." />

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {jobLoading ? "Loading job details…" : (job?.description ?? "No description.")}
            </p>
            {(mustHave.length > 0 || niceHave.length > 0) && (
              <div className="mt-4 space-y-2">
                {mustHave.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Must-have</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {mustHave.map((s) => (
                        <SkillBadge key={s} skill={s} variant="match" />
                      ))}
                    </div>
                  </div>
                ) : null}
                {niceHave.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nice-to-have</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {niceHave.map((s) => (
                        <SkillBadge key={s} skill={s} variant="neutral" />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={`/jobs/${id}/applicants`}>
              <Button variant="secondary" className="w-full sm:w-auto">
                Applicants
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/jobs/${id}/screenings`}>
              <Button className="w-full sm:w-auto">
                Screenings
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-shimmer rounded-2xl" />
          ))}
        </div>
      ) : (
        <JobStatsPanel stats={(stats ?? {}) as JobStatsShape} jobId={id} />
      )}

      <JobBenchmarkPanel benchmark={(benchmark ?? {}) as JobBenchmarkShape} />
    </div>
  );
}
