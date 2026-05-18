"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, MoreVertical, PlayCircle, Search, Sparkles } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { RunScreeningModal } from "../../../components/screenings/RunScreeningModal";
import { useDeleteScreeningMutation, useExportScreeningMutation, useGetScreeningsQuery } from "../../../store/api/screeningsApi";
import toast from "react-hot-toast";

export default function ScreeningsHomePage() {
  const router = useRouter();
  const [openRunModal, setOpenRunModal] = useState(false);
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [menuId, setMenuId] = useState("");
  const [rerunJobId, setRerunJobId] = useState<string | undefined>(undefined);
  const [deleteScreening] = useDeleteScreeningMutation();
  const [exportScreening] = useExportScreeningMutation();

  const { data } = useGetScreeningsQuery();
  const allScreenings = data?.screenings ?? [];
  const screenings = useMemo(() => {
    const now = Date.now();
    const filtered = allScreenings.filter((item) => {
      if (status !== "all" && item.displayStatus !== status) return false;
      if (date === "7d" && now - +new Date(item.createdAt) > 7 * 24 * 60 * 60 * 1000) return false;
      if (date === "30d" && now - +new Date(item.createdAt) > 30 * 24 * 60 * 60 * 1000) return false;
      if (search.trim() && !item.jobTitle.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
    if (sort === "oldest") return filtered.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    if (sort === "highest") return filtered.sort((a, b) => Number(b.averageScore ?? 0) - Number(a.averageScore ?? 0));
    return filtered.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [allScreenings, date, search, sort, status]);

  const stats = useMemo(() => {
    const total = screenings.length;
    const candidates = screenings.reduce((sum, item) => sum + Number(item.totalAnalyzed ?? 0), 0);
    const shortlisted = screenings.reduce((sum, item) => sum + Number(item.shortlistedCount ?? 0), 0);
    const avgScore = total ? Math.round(screenings.reduce((sum, item) => sum + Number(item.averageScore ?? 0), 0) / total) : 0;
    return { total, candidates, shortlisted, avgScore };
  }, [screenings]);

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this screening? This cannot be undone.")) return;
    try {
      await deleteScreening(id).unwrap();
      toast.success("Screening deleted.");
      setMenuId("");
    } catch (error) {
      toast.error((error as { data?: { error?: string } })?.data?.error ?? "Failed to delete screening.");
    }
  };

  const onExportCsv = async (id: string) => {
    try {
      const blob = await exportScreening({ id, format: "csv" }).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shortlist-${id}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Results exported as CSV.");
      setMenuId("");
    } catch (error) {
      toast.error((error as { data?: { error?: string } })?.data?.error ?? "Could not export CSV.");
    }
  };

  return (
    <div className="fade-up space-y-6">
      <PageHeader
        eyebrow="Workspace · Intelligence"
        title="Screenings"
        subtitle="AI screening runs — ingested, scored, summarized."
        right={
          <Button
            onClick={() => {
              setRerunJobId(undefined);
              setOpenRunModal(true);
            }}
          >
            <Sparkles className="h-4 w-4" />
            Run New Screening
          </Button>
        }
      />

      {allScreenings.length === 0 ? (
        <Card className="py-14 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,.18), rgba(217,70,239,.14))",
              border: "1px solid rgba(99,102,241,.32)",
              color: "#c7d2fe",
            }}
          >
            <BrainCircuit className="h-8 w-8" />
          </div>
          <h3 className="display" style={{ fontSize: 24, color: "#fff" }}>No screenings run yet</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm" style={{ color: "var(--ink-3)" }}>
            Select a job and run AI screening to instantly rank and shortlist your best candidates.
          </p>
          <Button
            className="mt-5"
            onClick={() => {
              setRerunJobId(undefined);
              setOpenRunModal(true);
            }}
          >
            <PlayCircle className="h-4 w-4" />
            Run Your First Screening
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Screenings run", value: stats.total, accent: "#6366f1" },
              { label: "Candidates Screened", value: stats.candidates, accent: "#22d3ee" },
              { label: "Average Match Score", value: `${stats.avgScore}/100`, accent: "#d946ef" },
              { label: "Shortlisted candidates", value: stats.shortlisted, accent: "#34d399" },
            ].map((tile) => (
              <div key={tile.label} className="panel panel-tight lift relative overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute"
                  style={{
                    top: -30,
                    right: -30,
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: `radial-gradient(closest-side, ${tile.accent}55, transparent)`,
                    filter: "blur(8px)",
                  }}
                />
                <p className="eyebrow">{tile.label}</p>
                <p className="display mt-2" style={{ fontSize: 30, lineHeight: 1, color: "#fff" }}>
                  {tile.value}
                </p>
              </div>
            ))}
          </div>

          <Card className="space-y-3">
            <div className="grid gap-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--ink-4)" }} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search screenings by job title..." className="pl-9" />
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="running">Running</option>
                <option value="failed">Failed</option>
              </select>
              <select value={date} onChange={(e) => setDate(e.target.value)} className="input">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="input">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Score</option>
              </select>
            </div>
          </Card>

          <div className="space-y-3">
            {screenings.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm" style={{ color: "var(--ink-3)" }}>No screenings match your filters — try adjusting your search.</p>
              </Card>
            ) : (
              screenings.map((screening) => {
                const statusValue = screening.displayStatus;
                const pillClass =
                  statusValue === "completed"
                    ? "pill pill-mint"
                    : statusValue === "failed"
                      ? "pill pill-rose"
                      : "pill pill-indigo";
                const accentColor =
                  statusValue === "completed" ? "#34d399" : statusValue === "failed" ? "#fb7185" : "#818cf8";
                const dateText = new Date(screening.createdAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
                return (
                  <Card
                    key={screening._id}
                    className="lift"
                    style={{ borderLeft: `3px solid ${accentColor}` }}
                  >
                    <div className="grid gap-3 lg:grid-cols-[2fr_1.6fr_1fr] lg:items-center">
                      <div>
                        <p className="text-lg font-bold" style={{ color: "#fff" }}>{screening.jobTitle}</p>
                        <p className="text-sm" style={{ color: "var(--ink-3)" }}>{screening.jobDomain}</p>
                        <p className="mono mt-1 text-xs" style={{ color: "var(--ink-4)" }}>Run on {dateText}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="pill">{screening.totalAnalyzed} candidates</span>
                        <span className="pill pill-mint">{screening.shortlistedCount} shortlisted</span>
                        <span className="pill pill-fuchsia">Avg {Math.round(screening.averageScore)}/100</span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span className={pillClass}>
                          {statusValue === "running" ? "Running" : statusValue === "failed" ? "Failed" : "Completed"}
                        </span>
                        <Link href={`/screenings/${screening._id}`} className="btn btn-primary">
                          View Results
                        </Link>
                        <div className="relative">
                          <button type="button" className="btn-icon" onClick={() => setMenuId((prev) => (prev === screening._id ? "" : screening._id))}>
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuId === screening._id ? (
                            <div className="panel absolute right-0 top-10 z-10 w-48 p-1">
                              <button
                                type="button"
                                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                                style={{ color: "var(--ink-2)" }}
                                onClick={() => {
                                  setRerunJobId(screening.jobId);
                                  setOpenRunModal(true);
                                  setMenuId("");
                                }}
                              >
                                Re-run Screening
                              </button>
                              <button
                                type="button"
                                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                                style={{ color: "var(--ink-2)" }}
                                onClick={() => void onExportCsv(screening._id)}
                              >
                                Export Results (CSV)
                              </button>
                              <button
                                type="button"
                                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-rose-500/10"
                                style={{ color: "#fb7185" }}
                                onClick={() => void onDelete(String(screening._id))}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}
      <RunScreeningModal
        open={openRunModal}
        initialJobId={rerunJobId}
        onClose={() => {
          setOpenRunModal(false);
          setRerunJobId(undefined);
        }}
        onCreated={(id) => router.push(`/screenings/${id}`)}
      />
    </div>
  );
}
