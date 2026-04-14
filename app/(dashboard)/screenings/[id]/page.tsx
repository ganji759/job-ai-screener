"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGetScreeningQuery,
  useGetScreeningStatusQuery,
  useExportScreeningMutation,
  useExportScreeningExplanationsMutation,
  useCompareApplicantsMutation,
} from "../../../../store/api/screeningsApi";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { ScreeningStatusPoller } from "../../../../components/screenings/ScreeningStatusPoller";
import { PoolInsightsPanel } from "../../../../components/screenings/PoolInsightsPanel";
import { ShortlistTable } from "../../../../components/screenings/ShortlistTable";
import { CandidateDetailDrawer } from "../../../../components/screenings/CandidateDetailDrawer";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import toast from "react-hot-toast";
import { ScoreDistribution } from "../../../../components/charts/ScoreDistribution";
import { ScoreGauge } from "../../../../components/ui/ScoreGauge";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import Link from "next/link";

export default function ScreeningDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useGetScreeningQuery(params.id);
  const { data: statusData } = useGetScreeningStatusQuery(params.id, { pollingInterval: 3000 });
  const [exportScreening] = useExportScreeningMutation();
  const [exportExplanations] = useExportScreeningExplanationsMutation();
  const [compareApplicants] = useCompareApplicantsMutation();
  const [open, setOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Record<string, unknown> | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const screening = data as {
    results?: {
      shortlist?: Array<Record<string, unknown>>;
      scoreDistribution?: Array<{ range: string; count: number }>;
      averageScore?: number;
      totalAnalyzed?: number;
      shortlistSize?: number;
      topSkillsFound?: string[];
      skillGapsInPool?: string[];
    };
  };

  const download = async () => {
    try {
      const blob = await exportScreening(params.id).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shortlist-${params.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Downloading shortlist report...");
    } catch {
      toast.error("Export failed.");
    }
  };

  const downloadJudgePdf = async () => {
    try {
      const blob = await exportExplanations(params.id).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screening-explanations-${params.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Downloading judge-ready explanation report...");
    } catch {
      toast.error("Explanations export failed.");
    }
  };

  const onCompare = async () => {
    if (selectedIds.length < 2 || selectedIds.length > 5) {
      toast.error("Select between 2 and 5 candidates first.");
      return;
    }
    try {
      const comparison = await compareApplicants({ id: params.id, candidateIds: selectedIds }).unwrap();
      sessionStorage.setItem(`compare:${params.id}`, JSON.stringify(comparison));
      router.push(`/screenings/${params.id}/compare`);
    } catch {
      toast.error("Compare failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Screening Results" subtitle="Shortlist, exports, and pool distribution." />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onCompare}>
            Compare Candidates
          </Button>
          <Button variant="secondary" onClick={downloadJudgePdf}>
            Export Explanations PDF
          </Button>
          <Button onClick={download}>Export PDF</Button>
        </div>
      </div>
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-violet-600 p-5 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/90">Screening #{params.id}</p>
            <p className="mt-1 text-xl font-bold">Summary Banner</p>
            <p className="text-sm text-white/90">{Number(screening.results?.totalAnalyzed ?? 0)} analyzed · {Number(screening.results?.shortlistSize ?? 0)} shortlisted</p>
          </div>
          <div className="flex items-center gap-4">
            <ScoreGauge value={Number(screening.results?.averageScore ?? 0)} />
            <div className="space-y-1">
              <StatusBadge status={String((statusData as { status?: string } | undefined)?.status ?? "queued") as "queued" | "running" | "completed" | "failed"} />
              <p className="text-xs text-white/90">Avg Score</p>
            </div>
          </div>
        </div>
      </div>
      <ScreeningStatusPoller status={String((statusData as { status?: string } | undefined)?.status ?? "queued")} />
      <PoolInsightsPanel distribution={screening.results?.scoreDistribution ?? []} recommendation="AI recommendation available in report." />
      <Card>
        <h3 className="mb-2 font-semibold text-slate-900">Candidate Score Distribution</h3>
        <ScoreDistribution data={screening.results?.scoreDistribution ?? []} />
      </Card>
      <Card>
        <h3 className="mb-4 font-semibold text-slate-900">Shortlist</h3>
        <div className="space-y-2">
          {(screening.results?.shortlist ?? []).map((candidate) => {
            const id = String(candidate.candidateId);
            const selected = selectedIds.includes(id);
            return (
              <div key={id} className="rounded-xl border border-brand-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked ? [...prev, id] : prev.filter((x) => x !== id),
                        )
                      }
                    />
                    <span className="text-sm font-semibold text-slate-800">#{String(candidate.rank)} · {id}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setOpen(true);
                    }}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <ShortlistTable shortlist={screening.results?.shortlist ?? []} />
        </div>
        <Button className="mt-4" variant="secondary" onClick={() => setOpen(true)}>
          Open Candidate Drawer
        </Button>
      </Card>
      <div className="grid gap-2 rounded-xl border border-brand-100 bg-brand-50/20 p-3 text-sm">
        <p className="font-semibold text-slate-800">Pool Insights</p>
        <p><b>Top skills:</b> {(screening.results?.topSkillsFound ?? []).join(", ") || "N/A"}</p>
        <p><b>Skill gaps:</b> {(screening.results?.skillGapsInPool ?? []).join(", ") || "N/A"}</p>
        <Link href={`/screenings/${params.id}/compare`} className="text-brand-700 underline">Open head-to-head compare view</Link>
      </div>
      <CandidateDetailDrawer open={open} onClose={() => setOpen(false)} candidate={selectedCandidate ?? screening.results?.shortlist?.[0] ?? null} />
    </div>
  );
}
