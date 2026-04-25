"use client";

import { Lock } from "lucide-react";
import { cn } from "../../lib/utils";

export const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
  </div>
);

export const Divider = () => <div className="my-8 h-px w-full bg-slate-200 dark:bg-slate-700" />;

export const fieldClass =
  "h-11 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

export const SwitchToggle = ({
  checked,
  onChange,
  disabled,
  locked,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  locked?: boolean;
  id?: string;
}) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled || locked}
    onClick={() => !locked && onChange(!checked)}
    className={cn(
      "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200",
      locked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
      checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600",
    )}
  >
    <span
      className={cn(
        "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-2 ring-white transition-transform duration-200",
        checked ? "translate-x-6 border border-brand-500" : "translate-x-1 border border-slate-300",
      )}
    />
  </button>
);

export const LockHint = () => (
  <span className="inline-flex items-center text-slate-400" title="Required for security">
    <Lock className="h-3.5 w-3.5" />
  </span>
);
