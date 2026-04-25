"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "../../../../../components/layout/PageHeader";
import { Button } from "../../../../../components/ui/Button";
import { Card } from "../../../../../components/ui/Card";
import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import { ProgressBar } from "../../../../../components/ui/ProgressBar";
import { EmptyState } from "../../../../../components/ui/EmptyState";
import {
  useGetJobScreeningsQuery,
  useRunScreeningForJobMutation,
} from "../../../../../store/api/screeningsApi";
import { getRtkQueryErrorMessage } from "../../../../../lib/rtkError";

/** Surface server-side `message` first (e.g. "No pending applicants"), then RTK helper. */
function runErrorMessage(err: unknown): string {
  const e = err as { status?: number; data?: { error?: string; message?: string } };
  if (typeof e?.data?.message === "string" && e.data.message.trim()) return e.data.message;
  if (typeof e?.data?.error === "string" && e.data.error.trim()) return e.data.error;
  return getRtkQueryErrorMessage(err, "Screening failed. Please try again.");
}

export default function JobScreeningsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;
  const { data, isLoading } = useGetJobScreeningsQuery(jobId);
  const [runForJob, { isLoading: running }] = useRunScreeningForJobMutation();

  const rows = Array.isArray(data) ? data : [];

  const handleRun = async () => {
    const toastId = toast.loading("Running AI screening on this job's applicants…");
    try {
      const res = await runForJob({ jobId, shortlistSize: 10 }).unwrap();
      const sid = res.screeningId;
      if (!sid) throw new Error("Screening did not return an id.");
      toast.success("Screening complete.", { id: toastId });
      router.push(`/screenings/${sid}`);
    } catch (err) {
      toast.error(runErrorMessage(err), { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Screenings" subtitle="One-click AI screening for this job. Past results live below." />
        <Button onClick={() => void handleRun()} loading={running} disabled={running} className="shrink-0">
          <Sparkles className="h-4 w-4" />
          Run AI Screening
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
              description="Click 'Run AI Screening' above to score the pending applicants for this job."
              actionLabel={running ? "Running…" : "Run AI Screening"}
              action={() => void handleRun()}
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
    </div>
  );
}
