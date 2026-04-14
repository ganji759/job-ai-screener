import { cn } from "../../lib/utils";

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-brand-100/80 bg-white p-5 shadow-brand-sm transition hover:-translate-y-0.5 hover:border-brand-200/90 hover:shadow-brand dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600",
      className,
    )}
    {...props}
  />
);
