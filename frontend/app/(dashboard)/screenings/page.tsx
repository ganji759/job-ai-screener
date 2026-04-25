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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Screenings" subtitle="AI-powered candidate ranking and shortlisting results" />
        <Button
          className="shrink-0"
          onClick={() => {
            setRerunJobId(undefined);
            setOpenRunModal(true);
          }}
        >
          <Sparkles className="h-4 w-4" />
          Run New Screening
        </Button>
      </div>

      {allScreenings.length === 0 ? (
        <Card className="py-14 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <BrainCircuit className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">No screenings run yet</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-slate-500">Total Screenings run</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Candidates Screened</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.candidates}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Average Match Score</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.avgScore}/100</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Total Shortlisted candidates</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.shortlisted}</p>
            </Card>
          </div>

          <Card className="space-y-3">
            <div className="grid gap-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search screenings by job title..." className="pl-9" />
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border border-slate-200 px-3">
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="running">Running</option>
                <option value="failed">Failed</option>
              </select>
              <select value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-lg border border-slate-200 px-3">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 rounded-lg border border-slate-200 px-3">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Score</option>
              </select>
            </div>
          </Card>

          <div className="space-y-3">
            {screenings.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm text-slate-600">No screenings match your filters — try adjusting your search.</p>
              </Card>
            ) : (
              screenings.map((screening) => {
                const statusValue = screening.displayStatus;
                const statusClass =
                  statusValue === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : statusValue === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700";
                const borderClass = statusValue === "completed" ? "border-l-emerald-500" : statusValue === "failed" ? "border-l-red-500" : "border-l-blue-500";
                const dateText = new Date(screening.createdAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
                return (
                  <Card key={screening._id} className={`border-l-4 ${borderClass} hover:-translate-y-[1px] hover:shadow-md`}>
                    <div className="grid gap-3 lg:grid-cols-[2fr_1.6fr_1fr] lg:items-center">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{screening.jobTitle}</p>
                        <p className="text-sm text-slate-500">{screening.jobDomain}</p>
                        <p className="mt-1 text-xs text-slate-500">Screening run on {dateText}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{screening.totalAnalyzed} candidates</span>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{screening.shortlistedCount} shortlisted</span>
                        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">Avg {Math.round(screening.averageScore)}/100</span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{statusValue === "running" ? "Running" : statusValue === "failed" ? "Failed" : "Completed"}</span>
                        <Link href={`/screenings/${screening._id}`} className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                          View Results
                        </Link>
                        <div className="relative">
                          <button type="button" className="rounded-full p-2 hover:bg-slate-100" onClick={() => setMenuId((prev) => (prev === screening._id ? "" : screening._id))}>
                            <MoreVertical className="h-4 w-4 text-slate-600" />
                          </button>
                          {menuId === screening._id ? (
                            <div className="absolute right-0 top-10 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                              <button
                                type="button"
                                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
                                onClick={() => {
                                  setRerunJobId(screening.jobId);
                                  setOpenRunModal(true);
                                  setMenuId("");
                                }}
                              >
                                Re-run Screening
                              </button>
                              <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100" onClick={() => void onExportCsv(screening._id)}>
                                Export Results (CSV)
                              </button>
                              <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => void onDelete(String(screening._id))}>
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
