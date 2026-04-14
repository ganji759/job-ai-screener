import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: Array<string | undefined | false | null>) => twMerge(clsx(inputs));

/** Shared styles for text inputs, textareas, and native selects (hover / focus-visible / disabled / dark). */
export const formControlClassName = cn(
  "w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm transition",
  "placeholder:text-slate-400",
  "hover:border-brand-300 hover:shadow-sm",
  "focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/25 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-70 disabled:shadow-none",
  "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
  "dark:hover:border-slate-500",
  "dark:disabled:border-slate-700 dark:disabled:bg-slate-950 dark:disabled:text-slate-500",
);

export const formLabelClassName = "text-sm font-medium text-slate-700 dark:text-slate-300";

export const formErrorClassName = "text-xs text-red-600 dark:text-red-400";

/** Compact pill-style native selects (filters, toolbars). */
export const compactSelectClassName = cn(
  "rounded-full border border-brand-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm outline-none transition",
  "cursor-pointer hover:border-brand-300 hover:bg-brand-50/60",
  "focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/25",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-700/80",
);

export const humanizeDurationMs = (value: number): string => {
  if (!value) return "0s";
  if (value < 1000) return `${value}ms`;
  return `${Math.round(value / 1000)}s`;
};
