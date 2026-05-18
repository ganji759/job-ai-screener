"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CalendarDays, Grid2X2, List, Plus, Rocket, Trash2, Users } from "lucide-react";
import { useGetJobsQuery, useDeleteJobMutation } from "../../../store/api/jobsApi";
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteJob, { isLoading: deleting }] = useDeleteJobMutation();
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

  const handleDeleteJob = async (jobId: string, jobTitle: string) => {
    if (confirmDeleteId !== jobId) { setConfirmDeleteId(jobId); return; }
    try {
      const result = await deleteJob(jobId).unwrap();
      const { applicants, screenings, interviews } = result.deleted;
      const parts = [
        applicants > 0 && `${applicants} applicant${applicants !== 1 ? "s" : ""}`,
        screenings > 0 && `${screenings} screening${screenings !== 1 ? "s" : ""}`,
        interviews > 0 && `${interviews} interview${interviews !== 1 ? "s" : ""}`,
      ].filter(Boolean);
      const detail = parts.length > 0 ? ` (+ ${parts.join(", ")})` : "";
      toast.success(`"${jobTitle}" deleted${detail}.`);
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
      setConfirmDeleteId(null);
    }
  };

  if (isError) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Workspace · Pipeline" title="My Jobs" subtitle="Create, monitor and run AI screenings." />
        <div className="panel panel-lg" style={{ borderColor: "rgba(244,63,94,.32)" }}>
          <p className="font-semibold" style={{ color: "#fda4af" }}>We couldn&apos;t load your jobs</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>{error ? getRtkQueryErrorMessage(error) : "Check your connection and try again."}</p>
          <Button type="button" className="mt-4" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const statusFilters: Array<{ value: string; label: string }> = [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "closed", label: "Closed" },
  ];

  return (
    <div className="fade-up space-y-6">
      <PageHeader
        eyebrow="Workspace · Pipeline"
        title="My Jobs"
        subtitle="Create, monitor and run AI screenings."
        right={
          <Link href="/jobs/new">
            <Button className={sortedJobs.length === 0 ? "animate-pulse" : ""}>
              <Plus className="h-4 w-4" />
              New Job
            </Button>
          </Link>
        }
      />
      <div className="grid gap-3 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Input placeholder="Search jobs…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
          {statusFilters.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn("btn", status === f.value ? "btn-primary" : "btn-ghost")}
              style={{ height: 34, fontSize: 12 }}
            >
              {f.label}
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
            className={cn("btn-icon", view === "grid" && "active")}
            style={view === "grid" ? { background: "rgba(99,102,241,0.18)", color: "#fff", borderColor: "rgba(99,102,241,0.4)" } : undefined}
          >
            <Grid2X2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className="btn-icon"
            style={view === "list" ? { background: "rgba(99,102,241,0.18)", color: "#fff", borderColor: "rgba(99,102,241,0.4)" } : undefined}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="panel panel-lg flex flex-col items-center justify-center gap-3 py-16" style={{ color: "var(--ink-3)" }}>
          <div className="h-10 w-10 animate-spin rounded-full" style={{ borderColor: "rgba(99,102,241,0.25)", borderTopColor: "#818cf8", borderWidth: 2, borderStyle: "solid" }} aria-hidden />
          <p className="text-sm font-medium">Loading jobs…</p>
        </div>
      ) : sortedJobs.length === 0 ? (
        <EmptyState
          title={emptyMessage}
          description={emptyDescription}
          actionLabel={status ? "Create Job" : "Create your first job"}
          action={() => window.location.assign("/jobs/new")}
          icon={<Rocket className="h-10 w-10" />}
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
            <div className="panel overflow-x-auto">
              <table className="tbl min-w-[760px]">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Domain</th>
                    <th>Status</th>
                    <th>Applicants</th>
                    <th>Date Posted</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.map((job) => (
                    <tr key={job._id}>
                      <td className="font-semibold" style={{ color: "#fff" }}>{job.title}</td>
                      <td>{job.requirements.domain || "—"}</td>
                      <td><StatusBadge status={job.status} /></td>
                      <td className="tabular-nums">
                        <span className="mono inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" style={{ color: "var(--ink-3)" }} />
                          {job.applicantCount ?? 0}
                        </span>
                      </td>
                      <td style={{ color: "var(--ink-3)" }}>
                        <span className="mono inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="mono" style={{ color: "var(--ink-3)" }}>{new Date(job.updatedAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link href={`/jobs/${job._id}`} className="btn btn-ghost" style={{ height: 28, fontSize: 11 }}>View</Link>
                          <Link href={`/jobs/${job._id}/screenings`} className="btn btn-primary" style={{ height: 28, fontSize: 11 }}>Screen</Link>
                          {confirmDeleteId === job._id ? (
                            <>
                              <button
                                type="button"
                                disabled={deleting}
                                onClick={() => void handleDeleteJob(job._id, job.title)}
                                className="btn"
                                style={{
                                  height: 28,
                                  fontSize: 11,
                                  background: "linear-gradient(135deg, #f43f5e, #be123c)",
                                  color: "#fff",
                                }}
                              >
                                {deleting ? "Deleting…" : "Confirm"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="btn btn-ghost"
                                style={{ height: 28, fontSize: 11 }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleDeleteJob(job._id, job.title)}
                              className="btn-icon"
                              style={{ width: 28, height: 28, color: "#fb7185" }}
                              title="Delete job"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
