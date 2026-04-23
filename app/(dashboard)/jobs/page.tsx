"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CalendarDays, Grid2X2, List, Plus, Rocket, Users } from "lucide-react";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { JobCard } from "../../../components/jobs/JobCard";
import { Input } from "../../../components/ui/Input";
import { Pagination } from "../../../components/ui/Pagination";
import { Button } from "../../../components/ui/Button";
import { useDebounce } from "../../../hooks/useDebounce";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { EmptyState } from "../../../components/ui/EmptyState";
import { cn, compactSelectClassName } from "../../../lib/utils";
import { getRtkQueryErrorMessage } from "../../../lib/rtkError";

export default function JobsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, isError, error, refetch } = useGetJobsQuery({
    page,
    limit: 9,
    search: debouncedSearch,
    status: status || undefined,
  });
  const sortedJobs = [...(data?.jobs ?? [])].sort((a, b) => {
    if (sortBy === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (sortBy === "applicants") return (b.applicantCount ?? 0) - (a.applicantCount ?? 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const emptyMessage = status
    ? `No ${status} jobs`
    : "No jobs yet";
  const emptyDescription = status
    ? `No ${status} jobs match your current filter.`
    : "Post your first job and let AI find the best candidates for you";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openNew") === "1") {
      router.replace("/jobs/new");
    }
  }, [router]);

  useEffect(() => {
    if (!isError || !error) return;
    toast.error(`Unable to load jobs: ${getRtkQueryErrorMessage(error)}`);
  }, [isError, error]);

  if (isError) {
    return (
      <div className="space-y-4">
        <PageHeader title="My Jobs" subtitle="Create, monitor and run AI screenings." />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <p className="font-semibold">We couldn&apos;t load your jobs</p>
          <p className="mt-1 text-sm opacity-90">{error ? getRtkQueryErrorMessage(error) : "Check your connection and try again."}</p>
          <Button type="button" className="mt-4" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="My Jobs" subtitle="Create, monitor and run AI screenings." />
        <Link href="/jobs/new" className="shrink-0">
          <Button className={cn("w-full sm:w-auto", sortedJobs.length === 0 ? "animate-pulse" : "")}>
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Input placeholder="Search jobs…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 lg:col-span-3 lg:justify-end">
          {["", "active", "draft", "closed"].map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/40",
                status === s ? "bg-brand-600 text-white shadow-brand-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
              )}
            >
              {s || "all"}
            </button>
          ))}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={compactSelectClassName} aria-label="Sort jobs">
            <option value="newest">Newest</option>
            <option value="applicants">Most Applicants</option>
            <option value="updated">Last Updated</option>
          </select>
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            className={cn(
              "rounded-full p-2 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/40",
              view === "grid" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
            )}
          >
            <Grid2X2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={cn(
              "rounded-full p-2 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/40",
              view === "list" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand-100 bg-white py-16 text-slate-500 shadow-brand-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" aria-hidden />
          <p className="text-sm font-medium">Loading jobs…</p>
        </div>
      ) : sortedJobs.length === 0 ? (
        <EmptyState
          title={emptyMessage}
          description={emptyDescription}
          actionLabel={status ? "Create Job" : "Create your first job"}
          action={() => window.location.assign("/jobs/new")}
          icon={status ? <Rocket className="h-10 w-10" /> : <Rocket className="h-10 w-10" />}
        />
      ) : (
        <>
          {view === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedJobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white dark:border-slate-700 dark:bg-slate-900">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-brand-50 text-left text-xs uppercase text-brand-900 dark:bg-slate-800 dark:text-slate-100">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Applicants</th>
                    <th className="px-4 py-3">Date Posted</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100 dark:divide-slate-700">
                  {sortedJobs.map((job) => (
                    <tr
                      key={job._id}
                      className="transition-colors hover:bg-brand-50/50 even:bg-slate-50/30 dark:hover:bg-slate-800/80 dark:even:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{job.title}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{job.requirements.domain || "N/A"}</td>
                      <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                      <td className="px-4 py-3 tabular-nums text-slate-800 dark:text-slate-200">
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{job.applicantCount ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(job.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(job.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/jobs/${job._id}`} className="rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-700">
                            View
                          </Link>
                          <Link href={`/jobs/${job._id}`} className="rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-700">
                            Edit
                          </Link>
                          <Link href={`/jobs/${job._id}/screenings`} className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">
                            Run Screening
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <Pagination page={data?.page ?? page} totalPages={data?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}
