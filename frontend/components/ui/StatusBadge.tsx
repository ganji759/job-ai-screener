import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";

type Status =
  | "active"
  | "draft"
  | "closed"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "pending"
  | "shortlisted"
  | "rejected";

const pillByStatus: Record<Status, string> = {
  active: "pill pill-mint",
  draft: "pill pill-amber",
  closed: "pill",
  queued: "pill",
  running: "pill pill-indigo",
  completed: "pill pill-mint",
  failed: "pill pill-rose",
  pending: "pill pill-amber",
  shortlisted: "pill pill-mint",
  rejected: "pill pill-rose",
};

export const StatusBadge = ({ status }: { status: Status }) => {
  const icon =
    status === "running" ? (
      <Loader2 className="h-3 w-3 animate-spin" />
    ) : status === "completed" || status === "active" || status === "shortlisted" ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : status === "failed" || status === "rejected" ? (
      <XCircle className="h-3 w-3" />
    ) : (
      <Clock3 className="h-3 w-3" />
    );
  return (
    <span className={`${pillByStatus[status]} capitalize`}>
      {icon}
      {status}
    </span>
  );
};
