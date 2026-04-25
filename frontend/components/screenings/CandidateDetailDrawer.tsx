import { Drawer } from "../ui/Drawer";
import { Badge } from "../ui/Badge";
import { ScoreBar } from "../ui/ScoreBar";
import { SkillBadge } from "../ui/SkillBadge";

export const CandidateDetailDrawer = ({ open, onClose, candidate }: { open: boolean; onClose: () => void; candidate: Record<string, unknown> | null }) => (
  <Drawer open={open} onClose={onClose}>
    <h3 className="text-lg font-semibold text-slate-900">Candidate Details</h3>
    {candidate ? (
      <div className="mt-4 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-700">Candidate ID: {String(candidate.candidateId ?? candidate.id ?? "-")}</p>
          <Badge variant="info">Score {Number(candidate.totalScore ?? 0)}</Badge>
        </div>
        <div className="grid gap-2">
          <ScoreBar label="Skills Match" value={Number((candidate.breakdown as { skillsMatch?: number } | undefined)?.skillsMatch ?? 0)} />
          <ScoreBar label="Experience Match" value={Number((candidate.breakdown as { experienceMatch?: number } | undefined)?.experienceMatch ?? 0)} color="bg-violet-600" />
          <ScoreBar label="Education Match" value={Number((candidate.breakdown as { educationMatch?: number } | undefined)?.educationMatch ?? 0)} color="bg-emerald-600" />
          <ScoreBar label="Cultural Fit" value={Number((candidate.breakdown as { culturalFit?: number } | undefined)?.culturalFit ?? 0)} color="bg-amber-600" />
        </div>
        <div>
          <p className="mb-2 text-xs uppercase text-slate-500">Skills</p>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(candidate.skills) ? (candidate.skills as string[]).slice(0, 15).map((s) => <SkillBadge key={s} skill={s} />) : <p className="text-slate-500">No skills available.</p>}
          </div>
        </div>
        <div className="space-y-1">
          <p><b>Recommendation:</b> {String(candidate.recommendation ?? "N/A")}</p>
          <p><b>Onboarding Time:</b> {String(candidate.estimatedOnboardingTime ?? "N/A")}</p>
          <p><b>AI Confidence:</b> {Number(candidate.aiConfidenceScore ?? 0)}</p>
        </div>
      </div>
    ) : null}
  </Drawer>
);
