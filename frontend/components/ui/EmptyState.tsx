import { Inbox } from "lucide-react";

export const EmptyState = ({
  title,
  description,
  action,
  actionLabel,
  icon,
}: {
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  icon?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-5 py-12 text-center">
    <span className="mb-3 text-brand-500">{icon ?? <Inbox className="h-6 w-6" />}</span>
    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
    {action && actionLabel ? (
      <button onClick={action} className="mt-4 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white">
        {actionLabel}
      </button>
    ) : null}
  </div>
);
