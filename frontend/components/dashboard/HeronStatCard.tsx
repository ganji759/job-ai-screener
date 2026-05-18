"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Accent = "indigo" | "fuchsia" | "mint" | "cyan" | "amber" | "rose";

const TONES: Record<Accent, [string, string]> = {
  indigo: ["#6366f1", "#818cf8"],
  fuchsia: ["#d946ef", "#f0abfc"],
  mint: ["#10b981", "#34d399"],
  cyan: ["#22d3ee", "#67e8f9"],
  amber: ["#fbbf24", "#fde68a"],
  rose: ["#f43f5e", "#fb7185"],
};

export function HeronStatCard({
  label,
  value,
  sub,
  icon,
  accent = "indigo",
  delta,
  deltaDir = "up",
  spark,
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: Accent;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
  href?: string;
}) {
  const [c1, c2] = TONES[accent] ?? TONES.indigo;
  const gradientId = `spark-${label.replace(/\s+/g, "")}`;

  const path =
    spark && spark.length > 1
      ? (() => {
          const max = Math.max(...spark, 1);
          const min = Math.min(...spark, 0);
          const range = Math.max(max - min, 1);
          const scaled = spark.map((y) => ((y - min) / range) * 24 + 2);
          const points = scaled.map((y, i) => `${(i * 100) / (scaled.length - 1)},${28 - y}`);
          return {
            line: `M${points[0]} ` + points.slice(1).map((p) => `L${p}`).join(" "),
            area: `M0,${28 - scaled[0]} ` + scaled.map((y, i) => `L${(i * 100) / (scaled.length - 1)},${28 - y}`).join(" ") + " L100,28 L0,28 Z",
          };
        })()
      : null;

  const content = (
    <div className="panel panel-tight lift relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${c1}55, transparent)`,
          filter: "blur(8px)",
        }}
      />
      <div className="relative mb-[14px] flex items-center justify-between">
        {icon ? (
          <div
            className="flex items-center justify-center"
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: `linear-gradient(135deg, ${c1}33, ${c2}1a)`,
              border: `1px solid ${c1}55`,
              color: c2,
            }}
          >
            {icon}
          </div>
        ) : (
          <span />
        )}
        {delta ? (
          <span
            className="mono inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: deltaDir === "up" ? "#34d399" : "#fb7185" }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ transform: deltaDir === "up" ? "none" : "rotate(180deg)" }}
            >
              <path d="M12 4l8 10h-5v6h-6v-6H4z" />
            </svg>
            {delta}
          </span>
        ) : null}
      </div>
      <div className="eyebrow mb-[6px]">{label}</div>
      <div className="display mb-1" style={{ fontSize: 36, lineHeight: 1 }}>
        {value}
      </div>
      {sub ? (
        <div className="text-[12px]" style={{ color: "var(--ink-3)" }}>
          {sub}
        </div>
      ) : null}

      {path ? (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-[14px]" style={{ width: "100%", height: 30 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c1} stopOpacity=".4" />
              <stop offset="100%" stopColor={c1} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={path.area} fill={`url(#${gradientId})`} />
          <path
            d={path.line}
            fill="none"
            stroke={c2}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
