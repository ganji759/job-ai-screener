"use client";

// Shared building blocks for the HERON auth pages (login + register).
// Mirrors the dark dynamic landing aesthetic.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

// ----------------- HERON logo -----------------
export function HeronLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="heron-auth-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#heron-auth-grad)" />
      <path
        d="M9 23 C 13 23, 14 19, 14 15 C 14 11, 16 9, 20 9 L 24 9 L 22 12 L 20 12 C 18 12, 17 13, 17 16 C 17 21, 14 24, 10 24 Z"
        fill="#fff"
        opacity=".95"
      />
      <circle cx="22.2" cy="10.5" r="1" fill="#0a0a14" />
    </svg>
  );
}

// ----------------- Rotating context pill -----------------
const PILL_LINES = [
  "47 candidates being screened right now",
  "Avg shortlist time · 4 min 12 s",
  "94% placement accuracy across 2026",
  "Recruiters in 38 countries trust HERON",
];

export function RotatingPill() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIdx((i) => (i + 1) % PILL_LINES.length), 3200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="pill" style={{ marginBottom: 28 }}>
      <span className="dot" />
      <span style={{ color: "#fff" }}>HERON Recruiter</span>
      <span style={{ color: "var(--hl-ink-4)" }}>·</span>
      <span
        key={idx}
        style={{
          color: "var(--hl-ink-2)",
          animation: "hl-fadeUp .5s ease both",
          display: "inline-block",
        }}
      >
        {PILL_LINES[idx]}
      </span>
    </div>
  );
}

// ----------------- Live activity feed -----------------
type FeedEvent = {
  kind: "score" | "shortlist" | "schedule" | "parse" | "agent";
  name: string;
  meta: string;
  val: string;
  tone: string;
};

const FEED_EVENTS: FeedEvent[] = [
  { kind: "score", name: "Amara Okafor", meta: "Sr. Backend · Lagos", val: "92", tone: "#34d399" },
  { kind: "shortlist", name: "5 candidates", meta: "Senior Backend · #SR-024", val: "+5", tone: "#22d3ee" },
  { kind: "schedule", name: "Diego Restrepo", meta: "Interview · Thu 11:00", val: "✓", tone: "#a78bfa" },
  { kind: "score", name: "Priya Subramanian", meta: "Sr. Backend · Bangalore", val: "81", tone: "#fbbf24" },
  { kind: "parse", name: "47 resumes parsed", meta: "pdfplumber · 0 errors", val: "47", tone: "#f472b6" },
  { kind: "score", name: "Léa Moreau", meta: "Backend · Paris", val: "74", tone: "#fbbf24" },
  { kind: "shortlist", name: "Top 3 ranked", meta: "Avg score 87 · accepted", val: "✓", tone: "#34d399" },
  { kind: "agent", name: "Agent run complete", meta: "4m 12s · 3 interviews scheduled", val: "●", tone: "#d946ef" },
];

const FEED_LABELS: Record<FeedEvent["kind"], string> = {
  score: "SCORED",
  shortlist: "SHORTLIST",
  schedule: "SCHEDULED",
  parse: "INGEST",
  agent: "AGENT",
};

function FeedRow({ e, idx }: { e: FeedEvent; idx: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "8px 10px",
        borderRadius: 10,
        background: idx === 0 ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.015)",
        border: "1px solid " + (idx === 0 ? "rgba(255,255,255,.08)" : "transparent"),
        animation: idx === 0 ? "hl-fadeUp .5s cubic-bezier(.2,.7,.2,1) both" : "none",
        transition: "background .3s ease",
      }}
    >
      <span
        style={{
          fontFamily: "var(--hl-mono)",
          fontSize: 9.5,
          letterSpacing: ".14em",
          color: e.tone,
          padding: "3px 6px",
          borderRadius: 4,
          background: `color-mix(in oklab, ${e.tone} 14%, transparent)`,
          border: `1px solid color-mix(in oklab, ${e.tone} 35%, transparent)`,
          whiteSpace: "nowrap",
        }}
      >
        {FEED_LABELS[e.kind]}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "#fff",
          }}
        >
          {e.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--hl-ink-3)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {e.meta}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--hl-mono)",
          fontSize: 13,
          fontWeight: 600,
          color: e.tone,
          minWidth: 28,
          textAlign: "right",
        }}
      >
        {e.val}
        {e.kind === "score" && (
          <span style={{ fontSize: 9, color: "var(--hl-ink-4)", fontWeight: 400 }}>/100</span>
        )}
      </div>
    </div>
  );
}

export function LiveFeed() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1800);
    return () => window.clearInterval(id);
  }, []);

  const visible = useMemo(() => {
    const out: FeedEvent[] = [];
    for (let i = 0; i < 4; i++) {
      out.push(FEED_EVENTS[(tick + i) % FEED_EVENTS.length]);
    }
    return out;
  }, [tick]);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(20,20,38,.65), rgba(10,10,22,.65))",
        border: "1px solid var(--hl-line)",
        padding: "16px 18px",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#34d399",
              boxShadow: "0 0 10px #34d399",
              animation: "hl-blink 1.2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "var(--hl-mono)",
              fontSize: 11,
              color: "var(--hl-ink-2)",
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Live · Agent activity
          </span>
        </div>
        <span style={{ fontFamily: "var(--hl-mono)", fontSize: 10, color: "var(--hl-ink-4)" }}>
          Last 60s
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 232 }}>
        {visible.map((e, i) => (
          <FeedRow key={`${tick}-${i}`} e={e} idx={i} />
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px dashed var(--hl-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          fontFamily: "var(--hl-mono)",
          color: "var(--hl-ink-3)",
        }}
      >
        <span>3,247 candidates ranked this week</span>
        <span style={{ color: "#34d399" }}>+184 today</span>
      </div>
    </div>
  );
}

// ----------------- Animated input field -----------------
export function Field({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  rightSlot,
  hint,
  autoFocus,
  inputMode,
  inputStyle,
  error,
  registerRef,
  registerOnBlur,
  registerOnChange,
  registerName,
}: {
  id?: string;
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rightSlot?: ReactNode;
  hint?: ReactNode;
  autoFocus?: boolean;
  inputMode?: "numeric" | "text";
  inputStyle?: React.CSSProperties;
  error?: string;
  registerRef?: React.Ref<HTMLInputElement>;
  registerOnBlur?: React.FocusEventHandler<HTMLInputElement>;
  registerOnChange?: React.ChangeEventHandler<HTMLInputElement>;
  registerName?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <label
          htmlFor={id}
          style={{
            fontFamily: "var(--hl-mono)",
            fontSize: 10.5,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: focused ? "#c7d2fe" : "var(--hl-ink-3)",
            transition: "color .2s ease",
          }}
        >
          {label}
        </label>
        {rightSlot}
      </div>
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          padding: 1,
          background: focused
            ? "linear-gradient(135deg, #6366f1, #d946ef)"
            : "var(--hl-line-strong)",
          transition: "background .25s ease",
          boxShadow: focused
            ? "0 0 0 4px rgba(99,102,241,.12), 0 10px 30px -10px rgba(99,102,241,.3)"
            : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#0c0c1a",
            borderRadius: 11,
            height: 50,
            padding: "0 16px",
          }}
        >
          <input
            id={id}
            name={registerName}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange?.(e);
              registerOnChange?.(e);
            }}
            ref={registerRef}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false);
              registerOnBlur?.(e);
            }}
            autoFocus={autoFocus}
            inputMode={inputMode}
            style={{
              flex: 1,
              height: "100%",
              background: "transparent",
              border: 0,
              outline: "none",
              color: "#fff",
              fontSize: 15,
              fontFamily: "var(--hl-body)",
              ...inputStyle,
            }}
          />
        </div>
      </div>
      {hint && <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--hl-ink-3)" }}>{hint}</div>}
      {error && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: "#fda4af" }}>{error}</div>
      )}
    </div>
  );
}

// ----------------- Submit button (gradient + spinner) -----------------
export function SubmitButton({
  loading,
  disabled,
  loadingLabel,
  label,
  onClick,
  type = "submit",
}: {
  loading: boolean;
  disabled?: boolean;
  loadingLabel: string;
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      className="btn btn-primary"
      style={{
        width: "100%",
        height: 52,
        fontSize: 15,
        marginTop: 6,
        justifyContent: "center",
        borderRadius: 12,
        opacity: loading || disabled ? 0.85 : 1,
        cursor: loading ? "wait" : disabled ? "not-allowed" : "pointer",
      }}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,.35)",
              borderTopColor: "#fff",
              animation: "hl-spin .8s linear infinite",
              display: "inline-block",
            }}
          />
          {loadingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight size={14} />
        </>
      )}
    </button>
  );
}
