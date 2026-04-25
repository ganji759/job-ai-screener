import { ProgressBar } from "../ui/ProgressBar";

export const ShortlistTable = ({ shortlist }: { shortlist: Array<Record<string, unknown>> }) => (
  <div className="overflow-x-auto rounded-xl border border-brand-100 dark:border-slate-700">
    <table className="w-full min-w-[480px] text-sm">
      <thead>
        <tr className="bg-brand-50 text-left text-xs font-semibold uppercase tracking-wide text-brand-900 dark:bg-slate-800 dark:text-slate-100">
          <th className="px-4 py-3">Rank</th>
          <th className="px-4 py-3">Candidate</th>
          <th className="px-4 py-3">Score</th>
          <th className="px-4 py-3">Confidence</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-100 bg-white text-slate-700 dark:divide-slate-700 dark:bg-slate-900 dark:text-slate-200">
        {shortlist.map((row) => (
          <tr
            key={String(row.candidateId)}
            className="transition-colors hover:bg-brand-50/50 focus-within:bg-brand-50/30 even:bg-slate-50/40 dark:hover:bg-slate-800/80 dark:focus-within:bg-slate-800/60 dark:even:bg-slate-800/30"
          >
            <td className="px-4 py-3 font-medium text-brand-800 dark:text-brand-300">{String(row.rank ?? "—")}</td>
            <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{String(row.candidateId)}</td>
            <td className="px-4 py-3">
              <ProgressBar value={Number(row.totalScore ?? 0)} />
            </td>
            <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">{Number(row.aiConfidenceScore ?? 0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
