import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const map = {
  active: "bg-emerald-50 text-emerald-700",
  draft: "bg-slate-100 text-slate-700",
  closed: "bg-slate-200 text-slate-700",
  queued: "bg-slate-100 text-slate-700",
  running: "bg-brand-50 text-brand-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-slate-100 text-slate-700",
  shortlisted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
} as const;

export const StatusBadge = ({
  status,
}: {
  status: "active" | "draft" | "closed" | "queued" | "running" | "completed" | "failed" | "pending" | "shortlisted" | "rejected";
}) => {
  const icon =
    status === "running" ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : status === "completed" || status === "active" || status === "shortlisted" ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : status === "failed" || status === "rejected" ? (
      <XCircle className="h-3.5 w-3.5" />
    ) : (
      <Clock3 className="h-3.5 w-3.5" />
    );
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize", map[status])}>
      {icon}
      {status}
    </span>
  );
};
