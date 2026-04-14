import { cn } from "../../lib/utils";

export const ProgressBar = ({ value }: { value: number }) => {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 80 ? "bg-brand-600" : v >= 50 ? "bg-brand-400" : "bg-slate-400";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${v}%` }} />
    </div>
  );
};
