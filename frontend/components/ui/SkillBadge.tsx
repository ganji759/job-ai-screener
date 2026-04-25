import { cn } from "../../lib/utils";

export const SkillBadge = ({ skill, variant = "default" }: { skill: string; variant?: "default" | "match" | "missing" | "neutral" }) => {
  const styles = {
    default: "border-brand-200 text-brand-700 bg-brand-50",
    match: "border-emerald-200 text-emerald-700 bg-emerald-50",
    missing: "border-red-200 text-red-700 bg-red-50 line-through",
    neutral: "border-slate-200 text-slate-700 bg-slate-50",
  } as const;
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", styles[variant])}>{skill}</span>;
};
