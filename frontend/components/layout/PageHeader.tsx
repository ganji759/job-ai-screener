import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
};

export const PageHeader = ({ title, subtitle, eyebrow, right }: PageHeaderProps) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
    <div className="min-w-0">
      {eyebrow ? <div className="eyebrow mb-[10px]">{eyebrow}</div> : null}
      <h1 className="display m-0" style={{ fontSize: 32 }}>
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-[720px]" style={{ color: "var(--ink-3)", fontSize: 14.5, margin: "8px 0 0" }}>
          {subtitle}
        </p>
      ) : null}
    </div>
    {right ? <div className="flex flex-wrap items-center gap-[10px]">{right}</div> : null}
  </div>
);
