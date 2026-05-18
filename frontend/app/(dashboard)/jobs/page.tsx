"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Briefcase,
  Filter,
  Grid2X2,
  List,
  MoreHorizontal,
  Plus,
  Rocket,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useGetJobsQuery, useDeleteJobMutation } from "../../../store/api/jobsApi";
import { useGetScreeningsQuery } from "../../../store/api/screeningsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { JobCard } from "../../../components/jobs/JobCard";
import { Pagination } from "../../../components/ui/Pagination";
import { Button } from "../../../components/ui/Button";
import { useDebounce } from "../../../hooks/useDebounce";
import { EmptyState } from "../../../components/ui/EmptyState";
import { cn } from "../../../lib/utils";
import { getRtkQueryErrorMessage } from "../../../lib/rtkError";

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 transition-all"
      style={{
        height: 32,
        padding: "0 14px",
        borderRadius: 999,
        background: active
          ? "linear-gradient(135deg, rgba(99,102,241,.85), rgba(217,70,239,.7))"
          : "rgba(255,255,255,.04)",
        border: `1px solid ${active ? "transparent" : "var(--line)"}`,
        color: active ? "#fff" : "var(--ink-2)",
        fontSize: 12.5,
        fontWeight: 500,
        boxShadow: active ? "0 6px 16px -8px rgba(217,70,239,.5)" : "none",
      }}
    >
      {label}
      <span className="mono text-[10px]" style={{ opacity: 0.85 }}>
        {count}
      </span>
    </button>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
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
  const { data: screeningsData } = useGetScreeningsQuery();

  const jobsAll = data?.jobs ?? [];

  const counts = useMemo(() => {
    return {
      all: jobsAll.length,
      active: jobsAll.filter((j) => j.status === "active").length,
      draft: jobsAll.filter((j) => j.status === "draft").length,
      closed: jobsAll.filter((j) => j.status === "closed").length,
    };
  }, [jobsAll]);

  /** Aggregate per-job screening counts so the JobCard metrics show real numbers. */
  const screeningAgg = useMemo(() => {
    const map = new Map<string, { screened: number; shortlisted: number }>();
    for (const s of screeningsData?.screenings ?? []) {
      const prev = map.get(s.jobId) ?? { screened: 0, shortlisted: 0 };
      prev.screened += Number(s.totalAnalyzed ?? 0);
      prev.shortlisted += Number(s.shortlistedCount ?? 0);
      map.set(s.jobId, prev);
    }
    return map;
  }, [screeningsData?.screenings]);

  const emptyMessage = status ? `No ${status} jobs` : "No jobs yet";
  const emptyDescription = status
    ? `No ${status} jobs match your current filter.`
    : "Post your first job and let AI find the best candidates for you.";

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
    if (confirmDeleteId !== jobId) {
      setConfirmDeleteId(jobId);
      return;
    }
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
        <PageHeader
          eyebrow="Workspace · Hiring"
          title="My Jobs."
          subtitle="Create, monitor and run AI screenings."
        />
        <div className="panel panel-lg" style={{ borderColor: "rgba(244,63,94,.32)" }}>
          <p className="font-semibold" style={{ color: "#fda4af" }}>
            We couldn&apos;t load your jobs
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
            {error ? getRtkQueryErrorMessage(error) : "Check your connection and try again."}
          </p>
          <Button type="button" className="mt-4" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-[10px]">Workspace · Hiring</div>
          <h1 className="display m-0" style={{ fontSize: 32 }}>
            My <span className="gradient-text-warm">Jobs</span>.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)", margin: "8px 0 0", maxWidth: 720 }}>
            Create, monitor and run AI screenings across your open roles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <button type="button" className="btn btn-ghost">
            <Upload className="h-3 w-3" /> Import
          </button>
          <Link href="/jobs/new" className="btn btn-primary">
            <Plus className="h-3 w-3" /> New Job
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="panel mb-5 flex flex-wrap items-center gap-3"
        style={{ padding: 14 }}
      >
        <div className="relative" style={{ flex: "1 1 280px", minWidth: 240 }}>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: "var(--ink-4)" }}
          />
          <input
            className="input"
            placeholder="Search jobs by title or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterTab label="All" count={counts.all} active={status === ""} onClick={() => setStatus("")} />
          <FilterTab label="Active" count={counts.active} active={status === "active"} onClick={() => setStatus("active")} />
          <FilterTab label="Draft" count={counts.draft} active={status === "draft"} onClick={() => setStatus("draft")} />
          <FilterTab label="Closed" count={counts.closed} active={status === "closed"} onClick={() => setStatus("closed")} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn btn-ghost" style={{ height: 34 }}>
            <Filter className="h-3 w-3" /> Filters
          </button>
          <div
            className="flex"
            style={{
              borderRadius: 10,
              padding: 3,
              background: "rgba(255,255,255,.04)",
              border: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: view === "grid" ? "linear-gradient(135deg, #6366f1, #d946ef)" : "transparent",
                color: view === "grid" ? "#fff" : "var(--ink-3)",
                border: 0,
              }}
            >
              <Grid2X2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: view === "list" ? "linear-gradient(135deg, #6366f1, #d946ef)" : "transparent",
                color: view === "list" ? "#fff" : "var(--ink-3)",
                border: 0,
              }}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          className="panel panel-lg flex flex-col items-center justify-center gap-3 py-16"
          style={{ color: "var(--ink-3)" }}
        >
          <div
            className="h-10 w-10 animate-spin rounded-full"
            style={{
              borderColor: "rgba(99,102,241,0.25)",
              borderTopColor: "#818cf8",
              borderWidth: 2,
              borderStyle: "solid",
            }}
            aria-hidden
          />
          <p className="text-sm font-medium">Loading jobs…</p>
        </div>
      ) : jobsAll.length === 0 ? (
        <EmptyState
          title={emptyMessage}
          description={emptyDescription}
          actionLabel={status ? "Create Job" : "Create your first job"}
          action={() => window.location.assign("/jobs/new")}
          icon={<Rocket className="h-10 w-10" />}
        />
      ) : view === "grid" ? (
        <div
          className="grid gap-[18px]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
        >
          {jobsAll.map((job) => {
            const agg = screeningAgg.get(job._id);
            return (
              <JobCard
                key={job._id}
                job={job}
                screened={agg?.screened ?? 0}
                shortlisted={agg?.shortlisted ?? 0}
              />
            );
          })}
        </div>
      ) : (
        <div className="panel overflow-x-auto" style={{ padding: 0 }}>
          <table className="tbl min-w-[860px]">
            <thead>
              <tr>
                <th>Job</th>
                <th>Dept</th>
                <th>Location</th>
                <th>Applied</th>
                <th>Screened</th>
                <th>Shortlist</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobsAll.map((job) => {
                const agg = screeningAgg.get(job._id);
                const screened = agg?.screened ?? 0;
                const shortlisted = agg?.shortlisted ?? 0;
                const statusPill =
                  job.status === "active"
                    ? "pill pill-mint"
                    : job.status === "draft"
                      ? "pill pill-amber"
                      : "pill";
                const shortId = job._id.slice(-6).toUpperCase();
                return (
                  <tr key={job._id} onClick={() => router.push(`/jobs/${job._id}`)} style={{ cursor: "pointer" }}>
                    <td>
                      <div className="flex items-center gap-[10px]">
                        <span
                          className="flex items-center justify-center"
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: "linear-gradient(135deg, rgba(99,102,241,.25), rgba(217,70,239,.15))",
                            border: "1px solid rgba(99,102,241,.3)",
                            color: "#c7d2fe",
                          }}
                        >
                          <Briefcase className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <div className="font-medium" style={{ color: "#fff" }}>{job.title}</div>
                          <div className="mono text-[10.5px]" style={{ color: "var(--ink-4)" }}>{shortId}</div>
                        </div>
                      </div>
                    </td>
                    <td>{job.requirements.domain || "—"}</td>
                    <td>{job.location || "—"}</td>
                    <td><span className="mono" style={{ color: "#fff" }}>{job.applicantCount ?? 0}</span></td>
                    <td><span className="mono" style={{ color: "#22d3ee" }}>{screened}</span></td>
                    <td><span className="mono" style={{ color: "#34d399" }}>{shortlisted}</span></td>
                    <td><span className={statusPill}>{job.status}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                              {deleting ? "…" : "Confirm"}
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
                          <>
                            <button
                              type="button"
                              onClick={() => void handleDeleteJob(job._id, job.title)}
                              className="btn-icon"
                              style={{ width: 28, height: 28, color: "#fb7185" }}
                              title="Delete job"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ width: 28, height: 28 }}
                              title="More"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-7 flex items-center justify-center gap-2">
        <Pagination page={data?.page ?? page} totalPages={data?.totalPages ?? 1} onPage={setPage} />
      </div>
    </div>
  );
}
