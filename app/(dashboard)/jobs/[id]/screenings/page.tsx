"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ExternalLink, Play } from "lucide-react";
import { PageHeader } from "../../../../../components/layout/PageHeader";
import { RunScreeningModal } from "../../../../../components/screenings/RunScreeningModal";
import { Button } from "../../../../../components/ui/Button";
import { Card } from "../../../../../components/ui/Card";
import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import { ProgressBar } from "../../../../../components/ui/ProgressBar";
import { EmptyState } from "../../../../../components/ui/EmptyState";
import { useRunScreeningMutation, useGetJobScreeningsQuery } from "../../../../../store/api/screeningsApi";

export default function JobScreeningsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [runScreening] = useRunScreeningMutation();
  const { data, isLoading } = useGetJobScreeningsQuery(params.id);

  const rows = Array.isArray(data) ? data : [];

  const onRun = async (shortlistSize: 10 | 20) => {
    try {
      const result = await runScreening({ jobId: params.id, shortlistSize }).unwrap();
      toast.success("Screening started successfully.");
      setOpen(false);
      router.push(`/screenings/${result.screeningId}`);
    } catch (error) {
      toast.error((error as { data?: { error?: string } })?.data?.error ?? "Failed to start screening.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Screenings" subtitle="Run AI screenings and open past results for this job." />
        <Button onClick={() => setOpen(true)} className="shrink-0">
          <Play className="h-4 w-4" />
          Run screening
        </Button>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">History</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Each row links to the full screening workspace.</p>

        {isLoading ? (
          <div className="mt-6 h-40 animate-shimmer rounded-xl" />
        ) : rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No screenings yet"
              description="Launch your first AI screening to rank applicants against this job."
              actionLabel="Run screening"
              action={() => setOpen(true)}
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-brand-100 dark:border-slate-700">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="bg-brand-50 text-left text-xs font-semibold uppercase tracking-wide text-brand-900 dark:bg-slate-800 dark:text-slate-100">
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Shortlist size</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100 dark:divide-slate-700">
                {rows.map((row) => {
                  const sid = String((row as { _id?: unknown })._id ?? "");
                  const st = String((row as { status?: string }).status ?? "queued");
                  const shortlistSize = Number((row as { shortlistSize?: number }).shortlistSize ?? 0);
                  const created = (row as { createdAt?: string }).createdAt;
                  const progress = st === "completed" ? 100 : st === "running" ? 60 : st === "failed" ? 0 : 15;
                  return (
                    <tr key={sid} className="bg-white transition-colors hover:bg-brand-50/40 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{created ? new Date(created).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={st as "queued" | "running" | "completed" | "failed"} />
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium text-slate-800 dark:text-slate-200">{shortlistSize}</td>
                      <td className="max-w-[200px] px-4 py-3">
                        <ProgressBar value={progress} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/screenings/${sid}`}
                          className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline dark:text-brand-400"
                        >
                          Workspace
                          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
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
      <RunScreeningModal open={open} onClose={() => setOpen(false)} onRun={onRun} />
    </div>
  );
}
