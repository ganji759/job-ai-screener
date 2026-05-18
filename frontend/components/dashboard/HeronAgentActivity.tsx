"use client";

import Link from "next/link";
import type { ActivityKind } from "./ActivityFeed";

type ActivityItem = {
  kind: ActivityKind;
  title: string;
  subtitle: string;
  timeAgo: string;
};

const KIND_META: Record<ActivityKind, { tone: string; label: string }> = {
  screening_completed: { tone: "#34d399", label: "SHORTLIST" },
  screening_failed: { tone: "#fb7185", label: "FAILED" },
  screening_running: { tone: "#fbbf24", label: "SCORE" },
  applicant_uploaded: { tone: "#f472b6", label: "INGEST" },
};

export function HeronAgentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <div className="panel panel-lg flex flex-col">
      <div className="mb-[14px] flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <span
            className="blink inline-block"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#34d399",
              boxShadow: "0 0 10px #34d399",
            }}
          />
          <div>
            <div className="eyebrow">Live · Agent activity</div>
            <div className="mt-1 text-base font-semibold" style={{ color: "#fff" }}>
              What HERON did today
            </div>
          </div>
        </div>
        <Link href="/notifications" className="btn btn-ghost" style={{ height: 30, fontSize: 12 }}>
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <div
          className="rounded-[14px] px-4 py-10 text-center"
          style={{ border: "1px dashed var(--line)", color: "var(--ink-3)" }}
        >
          <p className="text-sm">Quiet so far — activity will stream in here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.slice(0, 6).map((e, i) => {
            const meta = KIND_META[e.kind] ?? { tone: "#a78bfa", label: "EVENT" };
            return (
              <div
                key={`${e.timeAgo}-${i}`}
                className="grid items-center gap-3 rounded-[10px]"
                style={{
                  gridTemplateColumns: "auto 1fr auto",
                  padding: "10px 12px",
                  background: i === 0 ? "rgba(255,255,255,.04)" : "transparent",
                  border: `1px solid ${i === 0 ? "rgba(255,255,255,.08)" : "transparent"}`,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: ".14em",
                    color: meta.tone,
                    padding: "3px 6px",
                    borderRadius: 4,
                    background: `color-mix(in oklab, ${meta.tone} 14%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${meta.tone} 35%, transparent)`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {meta.label}
                </span>
                <div
                  className="overflow-hidden text-[13.5px]"
                  style={{ color: "#fff", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                >
                  <span className="font-medium">{e.title}</span>
                  {e.subtitle ? <span style={{ color: "var(--ink-3)" }}> · {e.subtitle}</span> : null}
                </div>
                <span className="mono text-[11px]" style={{ color: "var(--ink-4)" }}>
                  {e.timeAgo}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
