import { cn } from "../../lib/utils";

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-xl border border-brand-100/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition hover:border-brand-200/90 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600",
      className,
    )}
    {...props}
  />
);
