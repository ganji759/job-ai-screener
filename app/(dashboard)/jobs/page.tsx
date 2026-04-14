"use client";

import Link from "next/link";
import { useState } from "react";
import { Grid2X2, List, Plus } from "lucide-react";
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

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = useGetJobsQuery({ page, limit: 9, search: debouncedSearch, status: status || undefined });
  const sortedJobs = [...(data?.jobs ?? [])].sort((a, b) => {
    if (sortBy === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (sortBy === "applicants") return (b.applicantCount ?? 0) - (a.applicantCount ?? 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="My Jobs" subtitle="Create, monitor and run AI screenings." />
        <Link href="/jobs/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
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
        <EmptyState title="No jobs yet" description="Create your first job to start receiving applicants." actionLabel="Create Job" action={() => window.location.assign("/jobs/new")} />
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
                    <th className="px-4 py-3">Skills</th>
                    <th className="px-4 py-3">Applicants</th>
                    <th className="px-4 py-3">Status</th>
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
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{job.requirements.mustHaveSkills.slice(0, 3).join(", ") || "N/A"}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-800 dark:text-slate-200">{job.applicantCount ?? 0}</td>
                      <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(job.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Link href={`/jobs/${job._id}`} className="font-medium text-brand-700 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-brand-400">
                          View
                        </Link>
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
