import { Badge } from "../ui/Badge";

export const ScreeningStatusPoller = ({ status }: { status: string }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2 shadow-brand-sm">
    <span className="text-sm font-medium text-slate-600">Status</span>
    <Badge variant={status === "completed" ? "success" : status === "failed" ? "error" : "warning"}>{status}</Badge>
  </div>
);
