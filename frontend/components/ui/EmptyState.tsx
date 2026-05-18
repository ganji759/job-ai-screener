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
  <div
    className="flex flex-col items-center justify-center rounded-2xl px-5 py-12 text-center"
    style={{
      border: "1px dashed var(--line-strong)",
      background: "rgba(255,255,255,.02)",
    }}
  >
    <span className="mb-3" style={{ color: "var(--indigo-2)" }}>
      {icon ?? <Inbox className="h-6 w-6" />}
    </span>
    <h3 className="text-sm font-semibold" style={{ color: "#fff" }}>
      {title}
    </h3>
    <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
      {description}
    </p>
    {action && actionLabel ? (
      <button onClick={action} className="btn btn-primary mt-4">
        {actionLabel}
      </button>
    ) : null}
  </div>
);
