"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  Check,
  FileText,
  LayoutGrid,
  Mic,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { LiveCalendar } from "./LiveCalendar";
import { formatScheduledDate } from "./_shared";

type TabId = "dashboard" | "agent" | "jobs" | "screen" | "iv" | "analytics";

const TOUR_TABS: { id: TabId; label: string; icon: ReactNode; color: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutGrid size={16} />, color: "#6366f1" },
  { id: "agent", label: "AI Agent", icon: <Bot size={16} />, color: "#d946ef" },
  { id: "jobs", label: "Jobs", icon: <FileText size={16} />, color: "#22d3ee" },
  { id: "screen", label: "Screenings", icon: <Target size={16} />, color: "#fbbf24" },
  { id: "iv", label: "Interviews", icon: <Calendar size={16} />, color: "#f472b6" },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={16} />, color: "#34d399" },
];

const LABEL_MAP: Record<TabId, string> = {
  dashboard: "dashboard",
  agent: "ai-agent",
  jobs: "jobs",
  screen: "screenings",
  iv: "interviews",
  analytics: "analytics",
};

function HeronLogoMini() {
  return (
    <svg width={26} height={26} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hl-mini-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#hl-mini-grad)" />
      <path
        d="M9 23 C 13 23, 14 19, 14 15 C 14 11, 16 9, 20 9 L 24 9 L 22 12 L 20 12 C 18 12, 17 13, 17 16 C 17 21, 14 24, 10 24 Z"
        fill="#fff"
        opacity=".95"
      />
    </svg>
  );
}

function AppShell({
  active,
  color = "#6366f1",
  children,
}: {
  active: TabId;
  color?: string;
  children: ReactNode;
}) {
  const nav: { id: string; label: string; icon: ReactNode; tabId?: TabId }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutGrid size={14} />, tabId: "dashboard" },
    { id: "agent", label: "AI Assistant", icon: <Sparkles size={14} />, tabId: "agent" },
    { id: "jobs", label: "Jobs", icon: <FileText size={14} />, tabId: "jobs" },
    { id: "apps", label: "Applicants", icon: <LayoutGrid size={14} /> },
    { id: "screen", label: "Screenings", icon: <Target size={14} />, tabId: "screen" },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={14} />, tabId: "analytics" },
    { id: "iv", label: "Interviews", icon: <Calendar size={14} />, tabId: "iv" },
  ];

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(20,20,38,.95), rgba(8,8,18,.95))",
        border: "1px solid var(--hl-line-strong)",
        boxShadow: "0 40px 100px -20px rgba(0,0,0,.7)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid var(--hl-line)",
          background: "rgba(0,0,0,.3)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c940" }} />
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span
            style={{
              fontFamily: "var(--hl-mono)",
              fontSize: 12,
              color: "var(--hl-ink-3)",
              padding: "4px 14px",
              background: "rgba(255,255,255,.04)",
              borderRadius: 6,
              border: "1px solid var(--hl-line)",
            }}
          >
            🔒 app.heron.ai / {LABEL_MAP[active]}
          </span>
        </div>
      </div>
      <div className="hl-tour-body">
        <div
          style={{
            padding: "18px 12px",
            borderRight: "1px solid var(--hl-line)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 8px 16px",
            }}
          >
            <HeronLogoMini />
            <span style={{ fontFamily: "var(--hl-display)", fontWeight: 700, fontSize: 15 }}>
              HERON
            </span>
          </div>
          {nav.map((n) => {
            const isActive = n.tabId === active;
            return (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  background: isActive
                    ? `linear-gradient(135deg, ${color}33, ${color}11)`
                    : "transparent",
                  border: isActive ? `1px solid ${color}55` : "1px solid transparent",
                  color: isActive ? "#fff" : "var(--hl-ink-3)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span style={{ color: isActive ? color : "var(--hl-ink-4)", display: "flex" }}>
                  {n.icon}
                </span>
                {n.label}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "22px 26px", overflow: "hidden" }}>{children}</div>
      </div>
    </div>
  );
}

function TourDashboard() {
  const c = "#6366f1";
  const stats = [
    { n: "12", l: "Total Jobs", s: "8 active", c: "#a78bfa" },
    { n: "247", l: "Applicants", s: "19 pending", c: "#22d3ee" },
    { n: "34", l: "Screenings", s: "29 done", c: "#34d399" },
    { n: "61", l: "Shortlisted", s: "12 rejected", c: "#f472b6" },
  ];
  return (
    <AppShell active="dashboard" color={c}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            background: `linear-gradient(135deg, ${c}33, #d946ef22)`,
            border: `1px solid ${c}55`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            Good morning, Pacifique · AI-powered recruiter analytics
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {stats.map((s) => (
            <div
              key={s.l}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,.03)",
                border: "1px solid var(--hl-line)",
                borderLeft: `3px solid ${s.c}`,
              }}
            >
              <div className="display" style={{ fontSize: 30, fontWeight: 700, color: s.c }}>
                {s.n}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{s.l}</div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--hl-ink-4)",
                  marginTop: 2,
                  fontFamily: "var(--hl-mono)",
                }}
              >
                {s.s}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            { l: "AVG TIME TO SCREEN", v: "4m 12s", p: 35, c: "#6366f1" },
            { l: "AVG MATCH SCORE", v: "72/100", p: 72, c: "#34d399" },
            { l: "SHORTLIST RATE", v: "63%", p: 63, c: "#a78bfa" },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,.03)",
                border: "1px solid var(--hl-line)",
              }}
            >
              <div className="eyebrow" style={{ fontSize: 9 }}>
                {s.l}
              </div>
              <div
                className="display"
                style={{ fontSize: 20, fontWeight: 600, marginTop: 4, color: s.c }}
              >
                {s.v}
              </div>
              <div
                style={{
                  height: 5,
                  marginTop: 8,
                  borderRadius: 3,
                  background: "rgba(255,255,255,.05)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{ width: `${s.p}%`, height: "100%", background: s.c, borderRadius: 3 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 12,
            background: "rgba(255,255,255,.02)",
            border: "1px solid var(--hl-line)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--hl-ink-3)", marginBottom: 10 }}>
            Activity over time
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
            {[28, 42, 58, 40, 72, 55, 68, 82, 60, 48, 75, 90, 65, 72].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  background: `linear-gradient(180deg, ${c}, #d946ef)`,
                  borderRadius: "4px 4px 0 0",
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TourAgent() {
  const c = "#d946ef";
  return (
    <AppShell active="agent" color={c}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: `linear-gradient(135deg, ${c}, #6366f1)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bot size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              AI Hiring Assistant{" "}
              <span style={{ fontSize: 11, color: "var(--hl-ink-4)", fontWeight: 400, marginLeft: 6 }}>
                Powered by Gemini
              </span>
            </div>
          </div>
          <span className="pill" style={{ height: 22, fontSize: 10 }}>
            <span className="dot" />
            Ready
          </span>
        </div>
        <div
          style={{
            padding: "12px 14px",
            background: "rgba(217,70,239,.08)",
            border: "1px solid rgba(217,70,239,.25)",
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          Welcome back! Here&apos;s what I can do — run AI screenings, shortlist candidates, schedule
          interviews, and summarise your pipeline.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              padding: "10px 14px",
              background: `linear-gradient(135deg, ${c}66, #6366f166)`,
              border: `1px solid ${c}88`,
              borderRadius: 12,
              fontSize: 13,
              maxWidth: "70%",
            }}
          >
            Give me a pipeline summary
          </div>
        </div>
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,.03)",
            border: "1px solid var(--hl-line)",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Summarised pipeline</span>
            <Check size={14} />
          </div>
          <div style={{ fontSize: 13, color: "var(--hl-ink-2)", lineHeight: 1.6 }}>
            <strong style={{ color: "#fff" }}>247 applicants</strong> across{" "}
            <strong style={{ color: "#fff" }}>12 jobs</strong> ·{" "}
            <strong style={{ color: "#34d399" }}>61 shortlisted</strong> · avg score{" "}
            <strong style={{ color: "#34d399" }}>72/100</strong>.
          </div>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Top role: Sr. Backend", "Best score: 92", "Hiring risk: low", "3 interviews this week"].map(
              (t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    padding: "4px 9px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid var(--hl-line)",
                    color: "var(--hl-ink-2)",
                    fontFamily: "var(--hl-mono)",
                  }}
                >
                  {t}
                </span>
              ),
            )}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "rgba(255,255,255,.04)",
            border: "1px solid var(--hl-line)",
            borderRadius: 12,
          }}
        >
          <Plus size={14} />
          <span style={{ flex: 1, fontSize: 12.5, color: "var(--hl-ink-3)" }}>
            Ask about your pipeline, candidates, or schedule an interview…
          </span>
          <Mic size={14} />
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${c}, #6366f1)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TourJobs() {
  const c = "#22d3ee";
  const jobs = [
    { t: "Senior Backend Engineer", d: "Engineering", n: 47, st: "active", cc: "#34d399" },
    { t: "Product Designer", d: "Design", n: 23, st: "active", cc: "#34d399" },
    { t: "Data Analyst", d: "Analytics", n: 18, st: "draft", cc: "#fbbf24" },
    { t: "DevOps Engineer", d: "Engineering", n: 34, st: "active", cc: "#34d399" },
    { t: "ML Engineer", d: "Engineering", n: 12, st: "active", cc: "#34d399" },
    { t: "Tech Lead", d: "Leadership", n: 8, st: "draft", cc: "#fbbf24" },
  ];
  return (
    <AppShell active="jobs" color={c}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>My Jobs</div>
            <div style={{ fontSize: 12, color: "var(--hl-ink-3)" }}>
              Create, monitor and run AI screenings.
            </div>
          </div>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${c}, #6366f1)`,
              color: "#fff",
            }}
          >
            + New Job
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["All", "Active", "Draft", "Closed"].map((t, i) => (
            <span
              key={t}
              style={{
                padding: "5px 12px",
                fontSize: 11,
                borderRadius: 999,
                background: i === 1 ? `linear-gradient(135deg, ${c}, #6366f1)` : "rgba(255,255,255,.04)",
                border: i === 1 ? "none" : "1px solid var(--hl-line)",
                color: i === 1 ? "#fff" : "var(--hl-ink-3)",
                fontWeight: i === 1 ? 600 : 400,
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {jobs.map((j) => (
            <div
              key={j.t}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,.03)",
                border: "1px solid var(--hl-line)",
                borderLeft: `3px solid ${j.cc}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{j.t}</div>
                  <div style={{ fontSize: 11, color: "var(--hl-ink-3)" }}>{j.d}</div>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: `color-mix(in oklab, ${j.cc} 20%, transparent)`,
                    color: j.cc,
                    fontFamily: "var(--hl-mono)",
                    textTransform: "uppercase",
                  }}
                >
                  {j.st}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "var(--hl-ink-3)",
                }}
              >
                <LayoutGrid size={12} /> {j.n} applicants
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function TourScreen() {
  const c = "#fbbf24";
  return (
    <AppShell active="screen" color={c}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Screenings</div>
            <div style={{ fontSize: 12, color: "var(--hl-ink-3)" }}>
              AI-powered candidate ranking and shortlisting
            </div>
          </div>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${c}, #f472b6)`,
              color: "#0a0a14",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={12} /> Run Screening
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[
            { l: "Screenings Run", v: "34", c: "#a78bfa" },
            { l: "Candidates", v: "247", c: "#22d3ee" },
            { l: "Avg Score", v: "72/100", c: "#34d399" },
            { l: "Shortlisted", v: "61", c: "#f472b6" },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,.03)",
                border: "1px solid var(--hl-line)",
              }}
            >
              <div className="eyebrow" style={{ fontSize: 9 }}>
                {s.l}
              </div>
              <div
                className="display"
                style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: s.c }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>
        {[
          { t: "Senior Backend Engineer", cand: 47, sh: 14, avg: 78, st: "completed", cc: "#34d399" },
          { t: "Product Designer", cand: 23, sh: 7, avg: 71, st: "completed", cc: "#34d399" },
          { t: "Data Analyst", cand: 18, sh: 4, avg: 65, st: "running", cc: "#fbbf24" },
        ].map((r) => (
          <div
            key={r.t}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(255,255,255,.03)",
              border: "1px solid var(--hl-line)",
              borderLeft: `3px solid ${r.cc}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.t}</div>
              <div style={{ fontFamily: "var(--hl-mono)", fontSize: 11, color: "var(--hl-ink-3)" }}>
                {r.cand} candidates · {r.sh} shortlisted · avg {r.avg}/100
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                padding: "3px 9px",
                borderRadius: 999,
                background: `color-mix(in oklab, ${r.cc} 20%, transparent)`,
                color: r.cc,
                fontFamily: "var(--hl-mono)",
                textTransform: "uppercase",
              }}
            >
              {r.st}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function TourIv() {
  const c = "#f472b6";
  const ivs = [
    {
      n: "Amara Okafor",
      r: "Senior Backend Engineer",
      t: formatScheduledDate(1, 10, 0),
      st: "confirmed",
      cc: "#34d399",
    },
    {
      n: "Diego Restrepo",
      r: "Senior Backend Engineer",
      t: formatScheduledDate(2, 11, 30),
      st: "pending",
      cc: "#fbbf24",
    },
    {
      n: "Priya Subramanian",
      r: "Senior Backend Engineer",
      t: formatScheduledDate(3, 9, 0),
      st: "confirmed",
      cc: "#34d399",
    },
  ];
  return (
    <AppShell active="iv" color={c}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Interviews</div>
            <div style={{ fontSize: 12, color: "var(--hl-ink-3)" }}>
              8 scheduled · 5 confirmed · 3 pending
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["All", "Pending", "Confirmed"].map((t, i) => (
              <span
                key={t}
                style={{
                  padding: "5px 12px",
                  fontSize: 11,
                  borderRadius: 999,
                  background:
                    i === 0 ? `linear-gradient(135deg, ${c}, #6366f1)` : "rgba(255,255,255,.04)",
                  border: i === 0 ? "none" : "1px solid var(--hl-line)",
                  color: i === 0 ? "#fff" : "var(--hl-ink-3)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <LiveCalendar accent={c} secondary="#6366f1" size="md" />
        {ivs.map((iv) => (
          <div
            key={iv.n}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: "rgba(255,255,255,.03)",
              border: "1px solid var(--hl-line)",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${iv.cc}, #6366f1)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#0a0a14",
              }}
            >
              {iv.n
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{iv.n}</div>
              <div style={{ fontSize: 11, color: "var(--hl-ink-3)" }}>
                {iv.r} · {iv.t}
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 999,
                background: `color-mix(in oklab, ${iv.cc} 20%, transparent)`,
                color: iv.cc,
                fontFamily: "var(--hl-mono)",
                textTransform: "uppercase",
              }}
            >
              {iv.st}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function TourAnalytics() {
  const c = "#34d399";
  return (
    <AppShell active="analytics" color={c}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Analytics</div>
          <div style={{ fontSize: 12, color: "var(--hl-ink-3)" }}>
            Pipeline performance · last 30 days
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              background: "rgba(255,255,255,.03)",
              border: "1px solid var(--hl-line)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Applications &amp; shortlist rate</div>
              <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--hl-ink-3)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  Apps
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#a78bfa" }} />
                  Shortlisted
                </span>
              </div>
            </div>
            <svg viewBox="0 0 300 110" width="100%" height="110" aria-hidden="true">
              <defs>
                <linearGradient id="hl-gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={c} stopOpacity=".5" />
                  <stop offset="1" stopColor={c} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,80 L25,70 50,75 75,60 100,55 125,45 150,50 175,35 200,40 225,25 250,30 275,20 300,15 L300,110 0,110 Z"
                fill="url(#hl-gA)"
              />
              <path
                d="M0,80 L25,70 50,75 75,60 100,55 125,45 150,50 175,35 200,40 225,25 250,30 275,20 300,15"
                stroke={c}
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M0,95 L25,92 50,88 75,82 100,80 125,75 150,72 175,68 200,65 225,60 250,55 275,52 300,48"
                stroke="#a78bfa"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="3 2"
              />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${c}22, #6366f122)`,
                border: `1px solid ${c}55`,
              }}
            >
              <div className="eyebrow" style={{ fontSize: 9 }}>
                TIME SAVED
              </div>
              <div className="display" style={{ fontSize: 28, fontWeight: 700, color: c }}>
                184h
              </div>
              <div style={{ fontSize: 11, color: "var(--hl-ink-3)" }}>↑ 32% this month</div>
            </div>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,.03)",
                border: "1px solid var(--hl-line)",
              }}
            >
              <div className="eyebrow" style={{ fontSize: 9 }}>
                COST PER HIRE
              </div>
              <div className="display" style={{ fontSize: 28, fontWeight: 700, color: "#f472b6" }}>
                $640
              </div>
              <div style={{ fontSize: 11, color: "var(--hl-ink-3)" }}>↓ 60% vs industry</div>
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(255,255,255,.03)",
            border: "1px solid var(--hl-line)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            Top skills in your pipeline
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { k: "Python", v: 84, c: "#34d399" },
              { k: "TypeScript", v: 72, c: "#22d3ee" },
              { k: "Go", v: 58, c: "#a78bfa" },
              { k: "Kubernetes", v: 46, c: "#f472b6" },
              { k: "React", v: 39, c: "#fbbf24" },
            ].map((s) => (
              <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 90, fontSize: 12, color: "var(--hl-ink-2)" }}>{s.k}</span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    background: "rgba(255,255,255,.05)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${s.v}%`,
                      height: "100%",
                      background: s.c,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "var(--hl-mono)",
                    fontSize: 11,
                    color: s.c,
                    width: 30,
                    textAlign: "right",
                  }}
                >
                  {s.v}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export function ProductTourSection() {
  const [active, setActive] = useState<TabId>("dashboard");
  const activeColor = TOUR_TABS.find((t) => t.id === active)!.color;

  return (
    <section
      className="section-pad"
      id="product"
      style={{
        background:
          "linear-gradient(180deg, transparent, rgba(217,70,239,.04), transparent)",
      }}
    >
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 48px" }}>
          <div className="eyebrow" style={{ color: "#f472b6" }}>
            PRODUCT TOUR
          </div>
          <h2 className="display" style={{ fontSize: "clamp(40px,5vw,64px)", marginTop: 14 }}>
            Everything you need, <span className="gradient-text">in one workspace.</span>
          </h2>
          <p
            style={{
              color: "var(--hl-ink-2)",
              fontSize: 17,
              marginTop: 18,
              lineHeight: 1.55,
            }}
          >
            From posting jobs and uploading CVs to AI screening, shortlisting, and interview
            scheduling. Click through every screen below.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 36,
            flexWrap: "wrap",
          }}
        >
          {TOUR_TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 999,
                  fontSize: 13.5,
                  fontWeight: 500,
                  background: isActive
                    ? `linear-gradient(135deg, ${t.color}, #6366f1)`
                    : "rgba(255,255,255,.04)",
                  border: isActive ? `1px solid ${t.color}88` : "1px solid var(--hl-line)",
                  color: isActive ? "#fff" : "var(--hl-ink-2)",
                  boxShadow: isActive ? `0 8px 24px -8px ${t.color}88` : "none",
                  transition: "all .2s",
                }}
              >
                <span style={{ color: isActive ? "#fff" : t.color }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        <div key={active} style={{ animation: "hl-fadeUp .4s ease both", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: -30,
              background: `radial-gradient(circle at 50% 30%, ${activeColor}33, transparent 60%)`,
              filter: "blur(50px)",
              zIndex: 0,
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            {active === "dashboard" && <TourDashboard />}
            {active === "agent" && <TourAgent />}
            {active === "jobs" && <TourJobs />}
            {active === "screen" && <TourScreen />}
            {active === "iv" && <TourIv />}
            {active === "analytics" && <TourAnalytics />}
          </div>
        </div>

        <div className="hl-triad" style={{ marginTop: 80 }}>
          {[
            {
              i: <LayoutGrid size={20} />,
              t: "Full pipeline visibility",
              b: "Live stats for every job: applicants, screenings, scores, and funnel in one dashboard.",
              c: "#22d3ee",
            },
            {
              i: <Sparkles size={20} />,
              t: "AI-ranked shortlists",
              b: "The AI Agent scores every candidate in seconds, then explains its reasoning step by step.",
              c: "#d946ef",
            },
            {
              i: <Calendar size={20} />,
              t: "One-click scheduling",
              b: "Book interviews from the shortlist and track confirmed, pending, and completed slots in a calendar.",
              c: "#34d399",
            },
          ].map((x) => (
            <div
              key={x.t}
              style={{
                padding: "22px 24px",
                borderRadius: 18,
                background: "rgba(255,255,255,.02)",
                border: "1px solid var(--hl-line)",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${x.c}, color-mix(in oklab, ${x.c} 50%, #6366f1))`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                {x.i}
              </div>
              <div
                style={{
                  fontFamily: "var(--hl-display)",
                  fontSize: 19,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {x.t}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--hl-ink-2)", lineHeight: 1.6 }}>{x.b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
