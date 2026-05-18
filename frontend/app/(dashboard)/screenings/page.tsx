"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  Eye,
  Filter,
  MoreHorizontal,
  PlayCircle,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { RunScreeningModal } from "../../../components/screenings/RunScreeningModal";
import {
  type ScreeningListItem,
  useDeleteScreeningMutation,
  useExportScreeningMutation,
  useGetScreeningsQuery,
} from "../../../store/api/screeningsApi";
import { humanizeDurationMs } from "../../../lib/utils";
import toast from "react-hot-toast";

function relativeTime(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function StatusPill({
  status,
  progress,
}: {
  status: "running" | "queued" | "completed" | "failed";
  progress?: number;
}) {
  if (status === "running") {
    return (
      <span className="pill pill-cyan">
        <span
          className="blink inline-block"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22d3ee",
            boxShadow: "0 0 10px #22d3ee",
          }}
        />
        Running{progress != null ? ` · ${progress}%` : ""}
      </span>
    );
  }
  if (status === "queued") return <span className="pill pill-amber">Queued</span>;
  if (status === "failed") return <span className="pill pill-rose">Failed</span>;
  return <span className="pill pill-mint">Completed</span>;
}

function ProgressBar({
  status,
  progress,
}: {
  status: "running" | "queued" | "completed" | "failed";
  progress: number;
}) {
  const c =
    status === "completed" ? "#34d399" : status === "queued" ? "#fbbf24" : status === "failed" ? "#fb7185" : "#22d3ee";
  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.05)" }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: `${Math.min(100, Math.max(0, progress))}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${c}, #d946ef)`,
          borderRadius: 999,
          boxShadow: status === "running" ? `0 0 10px ${c}90` : "none",
          transition: "width .4s ease",
        }}
      >
        {status === "running" ? (
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent)",
              animation: "heron-shimmer 1.6s linear infinite",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function ScreeningRow({
  s,
  onMore,
  onReview,
  onCancel,
  menuOpen,
  onMenuToggle,
  onClose,
  onDelete,
  onExport,
}: {
  s: ScreeningListItem;
  onMore: () => void;
  onReview: () => void;
  onCancel?: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onClose: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const shortJobId = s.jobId ? s.jobId.slice(-6).toUpperCase() : "—";
  const shortRunId = s._id ? s._id.slice(-6).toUpperCase() : "—";
  const status =
    s.status === "completed"
      ? "completed"
      : s.status === "failed"
        ? "failed"
        : s.status === "pending"
          ? "queued"
          : "running";
  const progress =
    status === "completed"
      ? 100
      : status === "queued"
        ? 0
        : status === "failed"
          ? 100
          : Math.min(99, Math.round((s.shortlistedCount / Math.max(s.totalAnalyzed, 1)) * 100));

  return (
    <div
      className="panel lift relative"
      style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr auto", gap: 18 }}
    >
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="mono text-[10.5px]" style={{ color: "var(--ink-4)" }}>
            SCR-{shortRunId}
          </span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <div className="text-[15px] font-medium truncate" style={{ color: "#fff" }}>
            {s.jobTitle || "—"}
          </div>
          <span
            className="mono text-[10.5px]"
            style={{
              color: "var(--ink-4)",
              padding: "2px 7px",
              borderRadius: 5,
              border: "1px solid var(--line)",
            }}
          >
            {shortJobId}
          </span>
          <StatusPill status={status} progress={status === "running" ? progress : undefined} />
        </div>

        <ProgressBar status={status} progress={progress} />

        <div className="flex flex-wrap gap-6 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          <span>
            Candidates ·{" "}
            <b className="mono" style={{ color: "#fff" }}>
              {s.totalAnalyzed}
            </b>
          </span>
          <span>
            Scored ·{" "}
            <b className="mono" style={{ color: "#22d3ee" }}>
              {s.totalAnalyzed}
            </b>
          </span>
          <span>
            Shortlisted ·{" "}
            <b className="mono" style={{ color: "#34d399" }}>
              {s.shortlistedCount}
            </b>
          </span>
          {s.averageScore > 0 ? (
            <span>
              Avg score ·{" "}
              <b className="mono" style={{ color: "#fff" }}>
                {Math.round(s.averageScore)}
              </b>
            </span>
          ) : null}
          <span>
            Started · <b style={{ color: "#fff" }}>{relativeTime(s.createdAt)}</b>
          </span>
          {s.durationMs ? (
            <span>
              Duration · <b style={{ color: "#fff" }}>{humanizeDurationMs(s.durationMs)}</b>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 self-center">
        {status === "running" ? (
          <button type="button" className="btn btn-ghost" style={{ height: 32 }} onClick={onCancel}>
            <X className="h-3 w-3" /> Stop
          </button>
        ) : status === "queued" ? (
          <button type="button" className="btn btn-primary" style={{ height: 32 }}>
            Start now
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" style={{ height: 32 }} onClick={onReview}>
            <Eye className="h-3 w-3" /> Review
          </button>
        )}
        <div className="relative">
          <button type="button" className="btn-icon" onClick={onMenuToggle} aria-label="More">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="panel absolute right-0 top-10 z-10 w-48 p-1">
              <button
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                style={{ color: "var(--ink-2)" }}
                onClick={onMore}
              >
                Re-run Screening
              </button>
              <button
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                style={{ color: "var(--ink-2)" }}
                onClick={onExport}
              >
                Export Results (CSV)
              </button>
              <button
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-rose-500/10"
                style={{ color: "#fb7185" }}
                onClick={onDelete}
              >
                Delete
              </button>
              <button
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                style={{ color: "var(--ink-3)" }}
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LiveScoringStrip({
  screening,
  onCancel,
}: {
  screening: ScreeningListItem;
  onCancel?: () => void;
}) {
  const total = Math.max(screening.totalAnalyzed, 1);
  const done = screening.totalAnalyzed; // backend returns running count snapshot
  const progress = Math.min(99, Math.round((done / total) * 100));
  const shortRunId = screening._id.slice(-6).toUpperCase();
  return (
    <div className="conic-border" style={{ marginBottom: 22 }}>
      <div className="inner" style={{ padding: 22 }}>
        <div className="mb-[14px] flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <span
              className="blink inline-block"
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 12px #34d399",
              }}
            />
            <div>
              <div className="eyebrow" style={{ color: "#c7d2fe" }}>
                Live · Active screening run
              </div>
              <div className="text-base font-semibold mt-0.5" style={{ color: "#fff" }}>
                SCR-{shortRunId} · {screening.jobTitle || "—"}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/screenings/${screening._id}`}
              className="btn btn-ghost"
              style={{ height: 32 }}
            >
              <Eye className="h-3 w-3" /> Watch live
            </Link>
            <button type="button" className="btn btn-ghost" style={{ height: 32 }} onClick={onCancel}>
              <X className="h-3 w-3" /> Pause
            </button>
          </div>
        </div>

        <div className="mb-[18px] grid items-center gap-3" style={{ gridTemplateColumns: "1fr auto" }}>
          <ProgressBar status="running" progress={progress} />
          <span className="mono text-[13px]" style={{ color: "#fff" }}>
            {done} / {total} · running
          </span>
        </div>

        <div className="eyebrow mb-[10px]">Run summary</div>
        <div
          className="grid gap-[10px]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {[
            { label: "Job", value: screening.jobTitle || "—", color: "#fff" },
            { label: "Domain", value: screening.jobDomain || "—", color: "#c7d2fe" },
            {
              label: "Shortlist target",
              value: `${screening.shortlistedCount}`,
              color: "#34d399",
            },
            {
              label: "Avg score",
              value: screening.averageScore > 0 ? `${Math.round(screening.averageScore)}` : "—",
              color: "#fbbf24",
            },
          ].map((row) => (
            <div
              key={row.label}
              className="grid items-center gap-[10px]"
              style={{
                gridTemplateColumns: "auto 1fr",
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,.03)",
                border: "1px solid var(--line)",
              }}
            >
              <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-4)" }}>
                {row.label}
              </span>
              <span
                className="mono truncate text-right text-[13px] font-semibold"
                style={{ color: row.color }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ScreeningsHomePage() {
  const router = useRouter();
  const [openRunModal, setOpenRunModal] = useState(false);
  const [menuId, setMenuId] = useState("");
  const [rerunJobId, setRerunJobId] = useState<string | undefined>(undefined);
  const [deleteScreening] = useDeleteScreeningMutation();
  const [exportScreening] = useExportScreeningMutation();

  const { data } = useGetScreeningsQuery();
  const allScreenings = data?.screenings ?? [];

  const sorted = useMemo(
    () => [...allScreenings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [allScreenings],
  );

  const runningScreening = useMemo(
    () => allScreenings.find((s) => s.status === "running" || s.status === "pending"),
    [allScreenings],
  );

  const stats = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const todayRuns = allScreenings.filter((s) => now - +new Date(s.createdAt) < dayMs).length;
    const currentlyRunning = allScreenings.filter((s) => s.status === "running" || s.status === "pending").length;
    const completed = allScreenings.filter((s) => s.status === "completed" && s.durationMs);
    const avgRunTimeMs =
      completed.length > 0
        ? Math.round(completed.reduce((sum, c) => sum + (c.durationMs ?? 0), 0) / completed.length)
        : 0;
    const scored = allScreenings.filter((s) => s.status === "completed");
    const avgScore =
      scored.length > 0
        ? Math.round(scored.reduce((sum, s) => sum + Number(s.averageScore ?? 0), 0) / scored.length)
        : 0;
    return {
      runsToday: todayRuns,
      currentlyRunning,
      avgRunTime: avgRunTimeMs > 0 ? humanizeDurationMs(avgRunTimeMs) : "—",
      avgScore: avgScore > 0 ? `${avgScore}%` : "—",
    };
  }, [allScreenings]);

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
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-[10px]">Workspace · HERON Brain</div>
          <h1 className="display m-0" style={{ fontSize: 32 }}>
            Screenings.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)", margin: "8px 0 0", maxWidth: 720 }}>
            AI screening runs — ingested, scored, summarized. Watch them work in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <button type="button" className="btn btn-ghost">
            <Filter className="h-3 w-3" /> All runs
          </button>
          <Button
            onClick={() => {
              setRerunJobId(undefined);
              setOpenRunModal(true);
            }}
          >
            <Sparkles className="h-4 w-4" /> New screening
          </Button>
        </div>
      </div>

      <div className="mb-[22px] grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Runs today", value: stats.runsToday, color: "#6366f1" },
          { label: "Currently running", value: stats.currentlyRunning, color: "#22d3ee" },
          { label: "Avg run time", value: stats.avgRunTime, color: "#34d399" },
          { label: "Avg accuracy", value: stats.avgScore, color: "#d946ef" },
        ].map((tile) => (
          <div key={tile.label} className="panel panel-tight">
            <div className="eyebrow">{tile.label}</div>
            <div className="display mt-[6px]" style={{ fontSize: 28, color: tile.color }}>
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {runningScreening ? (
        <LiveScoringStrip
          screening={runningScreening}
          onCancel={() => onDelete(runningScreening._id)}
        />
      ) : null}

      {allScreenings.length === 0 ? (
        <div className="panel panel-lg py-14 text-center">
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
          <h3 className="display" style={{ fontSize: 22, color: "#fff" }}>
            No screenings run yet
          </h3>
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
            <PlayCircle className="h-4 w-4" /> Run Your First Screening
          </Button>
        </div>
      ) : (
        <>
          <div className="eyebrow mb-[14px]">All screenings</div>
          <div className="flex flex-col gap-3">
            {sorted.map((s) => (
              <ScreeningRow
                key={s._id}
                s={s}
                menuOpen={menuId === s._id}
                onMenuToggle={() => setMenuId((prev) => (prev === s._id ? "" : s._id))}
                onClose={() => setMenuId("")}
                onMore={() => {
                  setRerunJobId(s.jobId);
                  setOpenRunModal(true);
                  setMenuId("");
                }}
                onReview={() => router.push(`/screenings/${s._id}`)}
                onCancel={() => void onDelete(s._id)}
                onDelete={() => void onDelete(s._id)}
                onExport={() => void onExportCsv(s._id)}
              />
            ))}
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

      <style>{`
        @keyframes heron-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
}
