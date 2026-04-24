import { Card } from "../ui/Card";

export type ActivityKind =
  | "screening_completed"
  | "screening_failed"
  | "screening_running"
  | "applicant_uploaded";

type ActivityItem = {
  kind: ActivityKind;
  title: string;
  subtitle: string;
  timeAgo: string;
};

const dotColorByKind: Record<ActivityKind, string> = {
  screening_completed: "bg-emerald-500",
  screening_failed: "bg-red-500",
  screening_running: "bg-amber-500",
  applicant_uploaded: "bg-sky-500",
};

export const ActivityFeed = ({ items }: { items: ActivityItem[] }) => (
  <Card>
    <h3 className="mb-1 text-lg font-semibold text-[#1a1a2e]">Recent Activity</h3>
    <p className="mb-4 text-sm text-slate-600">Latest screening events and candidate uploads.</p>
    <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-4 py-8 text-center text-slate-500">
          <p className="text-2xl">📭</p>
          <p className="mt-2 font-medium">No activity yet — start by posting a job</p>
        </div>
      ) : (
        items.map((item, index) => (
          <div
            key={`${item.timeAgo}-${index}`}
            className="flex items-start gap-3 rounded-xl border border-brand-100/80 bg-brand-50/30 px-3 py-2.5"
          >
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotColorByKind[item.kind]}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-brand-900">{item.title}</p>
              <p className="truncate text-xs text-slate-600">{item.subtitle}</p>
              <p className="text-[11px] text-slate-400">{item.timeAgo}</p>
            </div>
          </div>
        ))
      )}
    </div>
  </Card>
);
