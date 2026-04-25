"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { useGetJobQuery } from "../../../../store/api/jobsApi";
import { JobSubNav } from "../../../../components/jobs/JobSubNav";
import { StatusBadge } from "../../../../components/ui/StatusBadge";

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: job, isLoading } = useGetJobQuery(id);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-r from-white via-brand-50/40 to-white p-5 shadow-brand-sm dark:border-slate-700 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/15 blur-3xl dark:bg-brand-500/10" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand-sm">
              <Briefcase className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">Job workspace</p>
              <h1 className="mt-0.5 truncate text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
                {isLoading ? "Loading…" : (job?.title ?? "Job")}
              </h1>
              <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">ID · {id}</p>
              {job?.status ? (
                <div className="mt-2">
                  <StatusBadge status={job.status} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <JobSubNav jobId={id} />
      </motion.div>
      {children}
    </div>
  );
}
