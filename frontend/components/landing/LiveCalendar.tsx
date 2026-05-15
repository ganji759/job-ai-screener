"use client";

import { useMemo } from "react";

type Cell = {
  d: number;
  dim: boolean;
  today?: boolean;
  trailing?: boolean;
};

export function LiveCalendar({
  accent = "#f472b6",
  secondary = "#6366f1",
  size = "md",
}: {
  accent?: string;
  secondary?: string;
  size?: "sm" | "md";
}) {
  // Recomputed on every mount (real current date).
  const { cells, scheduled, monthName, year, month } = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const name = today.toLocaleString("en-US", { month: "long" });
    const dayIdx = today.getDate();

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();

    const out: Cell[] = [];
    for (let i = 0; i < firstDay; i++) {
      out.push({ d: daysInPrev - firstDay + 1 + i, dim: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ d, dim: false, today: d === dayIdx });
    }
    while (out.length < 42) {
      out.push({ d: out.length - firstDay - daysInMonth + 1, dim: true, trailing: true });
    }

    const sched: number[] = [];
    const c = new Date(y, m, dayIdx);
    while (sched.length < 3) {
      c.setDate(c.getDate() + 1);
      const wd = c.getDay();
      if (wd !== 0 && wd !== 6 && c.getMonth() === m) sched.push(c.getDate());
    }

    return { cells: out, scheduled: sched, monthName: name, year: y, month: m };
  }, []);

  const dense = size === "sm";
  const cellSize = dense ? 28 : 32;
  const fontSize = dense ? 11 : 12;

  return (
    <div
      style={{
        padding: dense ? "12px 14px" : "14px 16px",
        borderRadius: 12,
        background: "rgba(255,255,255,.03)",
        border: "1px solid var(--hl-line)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: dense ? 13 : 14, fontWeight: 600 }}>{monthName}</span>
          <span
            style={{
              fontSize: dense ? 11 : 12,
              color: "var(--hl-ink-3)",
              fontFamily: "var(--hl-mono)",
            }}
          >
            {year}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            fontFamily: "var(--hl-mono)",
            fontSize: 11,
            color: "var(--hl-ink-3)",
          }}
        >
          <button
            type="button"
            aria-label="Previous month"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(255,255,255,.04)",
              border: "1px solid var(--hl-line)",
              color: "var(--hl-ink-3)",
            }}
          >
            ‹
          </button>
          <span style={{ padding: "0 6px" }}>
            {`${String(month + 1).padStart(2, "0")}/${year}`}
          </span>
          <button
            type="button"
            aria-label="Next month"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(255,255,255,.04)",
              border: "1px solid var(--hl-line)",
              color: "var(--hl-ink-3)",
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 4,
          marginBottom: 4,
        }}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "var(--hl-ink-4)",
              fontFamily: "var(--hl-mono)",
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((cell, i) => {
          const isScheduled = !cell.dim && scheduled.includes(cell.d);
          const isToday = cell.today;
          const dow = i % 7;
          const isWeekend = dow === 0 || dow === 6;

          let bg = "transparent";
          let color: string = cell.dim
            ? "var(--hl-ink-4)"
            : isWeekend
              ? "var(--hl-ink-3)"
              : "var(--hl-ink-2)";
          let weight = 400;
          let border = "1px solid transparent";
          let boxShadow = "none";

          if (isScheduled) {
            bg = `linear-gradient(135deg, ${accent}cc, ${secondary}cc)`;
            color = "#fff";
            weight = 600;
            boxShadow = `0 4px 12px -4px ${accent}66`;
          } else if (isToday) {
            bg = "rgba(255,255,255,.04)";
            border = `1px solid ${accent}88`;
            color = "#fff";
            weight = 700;
            boxShadow = `inset 0 0 0 1px ${accent}33, 0 0 12px -2px ${accent}55`;
          }

          return (
            <div
              key={i}
              style={{
                height: cellSize,
                borderRadius: 7,
                fontSize,
                fontWeight: weight,
                fontFamily: "var(--hl-mono)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: bg,
                color,
                border,
                boxShadow,
                position: "relative",
                opacity: cell.dim ? 0.45 : 1,
                transition: "all .25s ease",
              }}
            >
              {cell.d}
              {isToday && !isScheduled && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 3,
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: accent,
                    boxShadow: `0 0 6px ${accent}`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px dashed var(--hl-line)",
          fontSize: 11,
          color: "var(--hl-ink-3)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: "rgba(255,255,255,.04)",
              border: `1px solid ${accent}88`,
            }}
          />
          Today
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${accent}, ${secondary})`,
            }}
          />
          Interview
        </span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--hl-mono)", fontSize: 10 }}>
          {scheduled.length} scheduled
        </span>
      </div>
    </div>
  );
}
