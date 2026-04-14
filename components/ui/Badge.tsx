import { cn } from "../../lib/utils";

type Variant = "success" | "warning" | "error" | "info" | "neutral";

export const Badge = ({
  variant = "neutral",
  children,
}: {
  variant?: Variant;
  children: React.ReactNode;
}) => {
  const styles: Record<Variant, string> = {
    success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
    warning: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80",
    error: "bg-red-50 text-red-800 ring-1 ring-red-200/80",
    info: "bg-brand-50 text-brand-800 ring-1 ring-brand-200/80",
    neutral: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[variant])}>{children}</span>;
};
