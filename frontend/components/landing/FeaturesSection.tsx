"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import {
  BarChart3,
  Bot,
  Calendar,
  FileText,
  Search,
  Target,
} from "lucide-react";

type CardSpec = {
  title: string;
  body: string;
  icon: ReactNode;
  g1: string;
  g2: string;
  glyph?: ReactNode;
  span?: 1 | 2;
};

function ChatGlyph() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0 0" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span
          style={{
            background: "rgba(99,102,241,.18)",
            border: "1px solid rgba(99,102,241,.35)",
            padding: "5px 9px",
            borderRadius: 10,
            fontSize: 11,
            fontFamily: "var(--hl-mono)",
            color: "#c7d2fe",
          }}
        >
          shortlist top 5
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <span
          style={{
            background: "rgba(217,70,239,.14)",
            border: "1px solid rgba(217,70,239,.3)",
            padding: "5px 9px",
            borderRadius: 10,
            fontSize: 11,
            fontFamily: "var(--hl-mono)",
            color: "#f0abfc",
          }}
        >
          ✓ ranked 47 candidates
        </span>
      </div>
    </div>
  );
}

function ScoreGlyph() {
  const dims = [
    { l: "Skills", v: 35, c: "#34d399" },
    { l: "Experience", v: 25, c: "#22d3ee" },
    { l: "Education", v: 15, c: "#a78bfa" },
    { l: "Role fit", v: 15, c: "#f472b6" },
    { l: "Domain", v: 10, c: "#fbbf24" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
      {dims.map((d) => (
        <div key={d.l} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--hl-mono)",
              fontSize: 10,
              color: "var(--hl-ink-4)",
              width: 60,
            }}
          >
            {d.l}
          </span>
          <div
            style={{
              flex: 1,
              height: 6,
              background: "rgba(255,255,255,.05)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${d.v * 2.5}%`,
                height: "100%",
                background: d.c,
                borderRadius: 3,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--hl-mono)",
              fontSize: 10,
              color: "var(--hl-ink-3)",
              width: 24,
              textAlign: "right",
            }}
          >
            {d.v}%
          </span>
        </div>
      ))}
    </div>
  );
}

function CalendarGlyph() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginTop: 10 }}>
      {Array.from({ length: 21 }).map((_, i) => {
        const filled = [3, 8, 11, 14, 16].includes(i);
        const active = i === 14;
        return (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              borderRadius: 5,
              background: active
                ? "linear-gradient(135deg,#22d3ee,#6366f1)"
                : filled
                  ? "rgba(34,211,238,.18)"
                  : "rgba(255,255,255,.04)",
              border:
                filled && !active ? "1px solid rgba(34,211,238,.4)" : "1px solid var(--hl-line)",
            }}
          />
        );
      })}
    </div>
  );
}

function InsightGlyph() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <linearGradient id="hl-ig1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke="url(#hl-ig1)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="201"
          strokeDashoffset="60"
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div>
        <div style={{ fontFamily: "var(--hl-mono)", fontSize: 11, color: "var(--hl-ink-3)" }}>
          SHORTLIST RATE
        </div>
        <div
          className="display"
          style={{
            fontSize: 32,
            fontWeight: 600,
            background: "linear-gradient(135deg,#fbbf24,#f472b6)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          72%
        </div>
      </div>
    </div>
  );
}

function ResumeGlyph() {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      {["#34d399", "#22d3ee", "#a78bfa"].map((c, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            padding: "10px 8px",
            borderRadius: 8,
            background: "rgba(255,255,255,.03)",
            border: "1px solid var(--hl-line)",
          }}
        >
          <div
            style={{
              height: 5,
              width: "80%",
              background: c,
              borderRadius: 3,
              marginBottom: 5,
            }}
          />
          <div
            style={{
              height: 4,
              width: "55%",
              background: "rgba(255,255,255,.1)",
              borderRadius: 3,
              marginBottom: 3,
            }}
          />
          <div
            style={{
              height: 4,
              width: "65%",
              background: "rgba(255,255,255,.1)",
              borderRadius: 3,
            }}
          />
          <div style={{ marginTop: 6, fontSize: 9, fontFamily: "var(--hl-mono)", color: c }}>
            PARSED ✓
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ title, body, icon, g1, g2, glyph, span = 1 }: CardSpec) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    node.style.setProperty("--mx", `${e.clientX - r.left}px`);
    node.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const cssVars = {
    "--hl-g1": g1,
    "--hl-g2": g2,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className="grad-card"
      style={{
        ...cssVars,
        gridColumn: `span ${span}`,
        minHeight: 240,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 180,
          height: 180,
          background: `radial-gradient(circle at 30% 30%, ${g1}55, transparent 70%)`,
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${g1}, ${g2})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 8px 24px -6px ${g1}66`,
          marginBottom: 18,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: "var(--hl-display)",
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <p
        style={{
          color: "var(--hl-ink-2)",
          fontSize: 14,
          lineHeight: 1.6,
          marginTop: 10,
          marginBottom: 0,
        }}
      >
        {body}
      </p>
      {glyph && <div style={{ marginTop: 18 }}>{glyph}</div>}
    </div>
  );
}

const CARDS: CardSpec[] = [
  {
    title: "Conversational AI Agent",
    body: "A Gemini-powered hiring assistant that chains tool calls autonomously — list jobs, ingest resumes, run screenings, and schedule interviews.",
    icon: <Bot size={22} />,
    g1: "#6366f1",
    g2: "#d946ef",
    glyph: <ChatGlyph />,
    span: 2,
  },
  {
    title: "Intelligent Resume Ingestion",
    body: "Paste or upload PDFs and the AI extracts structured profiles in seconds via pdfplumber + Gemini.",
    icon: <FileText size={22} />,
    g1: "#22d3ee",
    g2: "#6366f1",
    glyph: <ResumeGlyph />,
  },
  {
    title: "Weighted AI Scoring",
    body: "Every candidate scored against a 5-dimension rubric — skills, experience, education, role fit, domain.",
    icon: <Target size={22} />,
    g1: "#fbbf24",
    g2: "#f472b6",
    glyph: <ScoreGlyph />,
  },
  {
    title: "Explainable Shortlists",
    body: "Each ranked candidate ships with strengths, gaps, a hiring-risk level, and an estimated onboarding time.",
    icon: <Search size={22} />,
    g1: "#34d399",
    g2: "#22d3ee",
  },
  {
    title: "Automated Interview Scheduling",
    body: "The agent schedules video, phone, or in-person interviews and tracks confirmations from one instruction.",
    icon: <Calendar size={22} />,
    g1: "#22d3ee",
    g2: "#a78bfa",
    glyph: <CalendarGlyph />,
  },
  {
    title: "Pool Insights & Benchmarking",
    body: "After screening, HERON analyses the full pool: score distribution, top skills, gaps, onboarding time, industry benchmarks.",
    icon: <BarChart3 size={22} />,
    g1: "#f472b6",
    g2: "#6366f1",
    glyph: <InsightGlyph />,
    span: 2,
  },
];

export function FeaturesSection() {
  return (
    <section className="section-pad" id="features">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ color: "#a78bfa" }}>
            CORE FEATURES
          </div>
          <h2 className="display" style={{ fontSize: "clamp(40px,5vw,64px)", marginTop: 14 }}>
            Everything you need to <span className="gradient-text">hire smarter.</span>
          </h2>
          <p
            style={{
              color: "var(--hl-ink-2)",
              fontSize: 17,
              marginTop: 18,
              lineHeight: 1.55,
            }}
          >
            From AI-driven resume parsing to explainable shortlists, HERON gives your team the tools
            to make faster, better hiring decisions.
          </p>
        </div>

        <div className="hl-features-grid">
          {CARDS.map((c) => (
            <FeatureCard key={c.title} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}
