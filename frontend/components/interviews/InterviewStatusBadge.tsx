import type { InterviewStatus } from "../../store/api/interviewsApi";

const CONFIG: Record<InterviewStatus, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-amber-100  text-amber-800  border border-amber-200"  },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-red-100    text-red-800    border border-red-200"    },
  completed: { label: "Completed", className: "bg-slate-100  text-slate-700  border border-slate-200"  },
};

export const InterviewStatusBadge = ({ status }: { status: InterviewStatus }) => {
  const { label, className } = CONFIG[status] ?? CONFIG.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
};
