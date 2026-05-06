"use client";

import type { ReactNode } from "react";
import { useState } from "react";

// ── Sidebar nav items (mirrors the real Sidebar.tsx primaryLinks) ─────────────
const NAV_ITEMS = [
  { label: "Dashboard",    icon: "▦" },
  { label: "AI Assistant", icon: "✦", highlight: true },
  { label: "Jobs",         icon: "⬡" },
  { label: "Applicants",   icon: "⊞" },
  { label: "Screenings",   icon: "◈" },
  { label: "Analytics",    icon: "⊿" },
  { label: "Interviews",   icon: "⊡" },
];

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = ["Dashboard", "AI Agent", "Jobs", "Screenings", "Interviews", "Analytics"] as const;
type Tab = (typeof TABS)[number];

// ── Mini sidebar ───────────────────────────────────────────────────────────────
function MiniSidebar({ activeScreen }: { activeScreen: string }) {
  return (
    <div className="flex w-[112px] shrink-0 flex-col border-r border-white/10 bg-[#0d1117]/90 py-3">
      {/* Logo */}
      <div className="mb-4 flex items-center gap-1.5 px-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] text-white">
          ✦
        </span>
        <span className="text-[11px] font-bold text-white/90">HERON</span>
      </div>
      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 px-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === activeScreen || (item.label === "AI Assistant" && activeScreen === "AI Agent");
          return (
            <div
              key={item.label}
              className={[
                "flex items-center gap-1.5 rounded-[7px] px-2 py-1.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "border-l-2 border-indigo-400 bg-indigo-950/60 pl-[6px] text-indigo-300"
                  : item.highlight
                    ? "text-indigo-400"
                    : "text-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              <span className="shrink-0 text-[11px]">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

// ── Browser chrome wrapper ─────────────────────────────────────────────────────
function BrowserFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] shadow-2xl shadow-black/40">
      {/* Title bar */}
      <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-[#1a1f2e] px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="mx-2 flex flex-1 items-center gap-1.5 rounded-md bg-white/5 px-2 py-1">
          <span className="text-[9px] text-slate-500">🔒</span>
          <span className="text-[10px] text-slate-500">app.heron.ai / {title.toLowerCase().replace(" ", "-")}</span>
        </div>
      </div>
      {/* App shell */}
      <div className="flex" style={{ height: 340 }}>
        <MiniSidebar activeScreen={title} />
        <div className="min-w-0 flex-1 overflow-hidden bg-slate-50/[0.03] p-3">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function MockCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={["rounded-lg border border-white/[0.07] bg-white/[0.04] p-2.5", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
      <span className={["text-base font-bold leading-tight", color].join(" ")}>{value}</span>
    </div>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={["h-full rounded-full", color].join(" ")} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Screen mocks ───────────────────────────────────────────────────────────────
function DashboardScreen() {
  return (
    <div className="flex h-full flex-col gap-2">
      {/* Header banner */}
      <div className="rounded-lg px-3 py-2 text-[10px] font-semibold text-white/90"
        style={{ background: "linear-gradient(135deg,#1e1b4b,#4338ca)" }}>
        Good morning, Pacifique · AI-powered recruiter analytics
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Total Jobs", value: "12", hint: "8 active", accent: "border-l-indigo-500", bg: "bg-indigo-50/10" },
          { label: "Applicants", value: "247", hint: "19 pending", accent: "border-l-sky-500", bg: "bg-sky-50/10" },
          { label: "Screenings", value: "34", hint: "29 done", accent: "border-l-violet-500", bg: "bg-violet-50/10" },
          { label: "Shortlisted", value: "61", hint: "12 rejected", accent: "border-l-emerald-500", bg: "bg-emerald-50/10" },
        ].map((s) => (
          <div key={s.label} className={["rounded-md border-l-2 p-2 text-left", s.accent, s.bg].join(" ")}>
            <p className="text-xs font-bold text-white/90">{s.value}</p>
            <p className="text-[9px] text-slate-400">{s.label}</p>
            <p className="text-[8px] text-slate-500">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Avg Time to Screen", value: "4m 12s", color: "text-indigo-400", pct: 35, bar: "bg-indigo-500" },
          { label: "Avg Match Score", value: "72 / 100", color: "text-emerald-400", pct: 72, bar: "bg-emerald-500" },
          { label: "Shortlist Rate", value: "63%", color: "text-violet-400", pct: 63, bar: "bg-violet-500" },
        ].map((k) => (
          <MockCard key={k.label}>
            <p className="mb-0.5 text-[8px] font-semibold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className={["text-xs font-bold", k.color].join(" ")}>{k.value}</p>
            <div className="mt-1">
              <MiniBar pct={k.pct} color={k.bar} />
            </div>
          </MockCard>
        ))}
      </div>

      {/* Activity over time placeholder chart */}
      <MockCard className="flex-1">
        <p className="mb-1.5 text-[9px] font-semibold text-slate-400">Activity Over Time</p>
        <div className="flex h-14 items-end gap-0.5 px-1">
          {[20, 40, 30, 60, 45, 70, 55, 80, 65, 90, 75, 85].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-sm bg-indigo-500/60" style={{ height: `${h * 0.56}px` }} />
            </div>
          ))}
        </div>
      </MockCard>
    </div>
  );
}

function AIAgentScreen() {
  return (
    <div className="flex h-full flex-col gap-2">
      {/* Top bar */}
      <div className="flex h-8 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[9px] text-white">✦</span>
        <span className="text-[10px] font-bold text-slate-300">AI Hiring Assistant</span>
        <span className="ml-1 text-[9px] text-slate-500">Powered by Gemini</span>
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-[8px] text-emerald-500">Ready</span>
      </div>

      {/* Chat messages */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
        {/* Agent bubble */}
        <div className="flex items-start gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[8px] text-white">✦</span>
          <div className="rounded-xl rounded-tl-sm border border-white/10 bg-white/8 px-2.5 py-1.5 text-[9px] leading-relaxed text-slate-300" style={{ background: "rgba(255,255,255,0.06)" }}>
            Welcome back! Here&apos;s what I can do — run AI screenings, shortlist candidates, schedule interviews, and summarise your pipeline.
          </div>
        </div>
        {/* User bubble */}
        <div className="flex justify-end">
          <div className="max-w-[70%] rounded-xl rounded-tr-sm px-2.5 py-1.5 text-[9px] leading-relaxed text-white" style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
            Give me a pipeline summary
          </div>
        </div>
        {/* Tool call card */}
        <div className="flex items-start gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[8px] text-white">✦</span>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-400/20 px-2 py-1" style={{ background: "rgba(79,70,229,0.12)" }}>
              <span className="text-[8px] text-indigo-400">⚡</span>
              <span className="text-[9px] font-semibold text-indigo-300">Summarised pipeline</span>
              <span className="ml-auto text-[8px] text-emerald-500">✓</span>
            </div>
            <div className="rounded-xl rounded-tl-sm border border-white/10 px-2.5 py-1.5 text-[9px] leading-relaxed text-slate-300" style={{ background: "rgba(255,255,255,0.06)" }}>
              <strong className="text-white">247 applicants</strong> across 12 jobs · <strong className="text-white">61 shortlisted</strong> · avg score <strong className="text-emerald-400">72/100</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">
        <span className="text-[9px] text-slate-500">📎</span>
        <span className="flex-1 text-[9px] text-slate-600">Ask about your pipeline, candidates, or schedule an interview…</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[9px] text-white">→</span>
      </div>
    </div>
  );
}

function JobsScreen() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white/90">My Jobs</p>
          <p className="text-[9px] text-slate-500">Create, monitor and run AI screenings.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2 py-1 text-[9px] font-semibold text-white">
          + New Job
        </div>
      </div>

      {/* Filters row */}
      <div className="flex gap-1.5">
        {["All", "Active", "Draft", "Closed"].map((s, i) => (
          <span key={s} className={["rounded-full px-2 py-0.5 text-[9px] font-semibold", i === 1 ? "bg-indigo-600 text-white" : "bg-white/10 text-slate-400"].join(" ")}>{s}</span>
        ))}
      </div>

      {/* Job cards grid */}
      <div className="grid grid-cols-2 gap-1.5 overflow-hidden">
        {[
          { title: "Senior Backend Engineer", domain: "Engineering", applicants: 47, status: "active", accent: "border-l-emerald-500" },
          { title: "Product Designer", domain: "Design", applicants: 23, status: "active", accent: "border-l-emerald-500" },
          { title: "Data Analyst", domain: "Analytics", applicants: 18, status: "draft", accent: "border-l-amber-400" },
          { title: "DevOps Engineer", domain: "Engineering", applicants: 34, status: "active", accent: "border-l-emerald-500" },
        ].map((job) => (
          <MockCard key={job.title} className={["border-l-2", job.accent].join(" ")}>
            <p className="truncate text-[9px] font-bold text-white/90">{job.title}</p>
            <p className="text-[8px] text-slate-500">{job.domain}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[8px] text-slate-400">👥 {job.applicants}</span>
              <span className={["rounded-full px-1.5 py-0.5 text-[8px] font-semibold", job.status === "active" ? "bg-emerald-900/60 text-emerald-400" : "bg-amber-900/60 text-amber-400"].join(" ")}>
                {job.status}
              </span>
            </div>
          </MockCard>
        ))}
      </div>

      {/* List view table (truncated) */}
      <MockCard className="flex-1">
        <div className="grid grid-cols-4 gap-1 text-[8px] font-bold uppercase tracking-wider text-slate-500">
          <span>Title</span><span>Domain</span><span>Applicants</span><span>Status</span>
        </div>
        <div className="mt-1 space-y-1">
          {[
            { t: "ML Engineer", d: "Engineering", a: 12, s: "Active" },
            { t: "Tech Lead", d: "Leadership", a: 8, s: "Draft" },
          ].map((r) => (
            <div key={r.t} className="grid grid-cols-4 gap-1 text-[8px] text-slate-400">
              <span className="truncate text-white/70">{r.t}</span>
              <span>{r.d}</span>
              <span>{r.a}</span>
              <span className="text-emerald-400">{r.s}</span>
            </div>
          ))}
        </div>
      </MockCard>
    </div>
  );
}

function ScreeningsScreen() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white/90">Screenings</p>
          <p className="text-[9px] text-slate-500">AI-powered candidate ranking and shortlisting</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-[9px] font-semibold text-white">
          ✦ Run Screening
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Screenings Run", value: "34" },
          { label: "Candidates", value: "247" },
          { label: "Avg Score", value: "72/100" },
          { label: "Shortlisted", value: "61" },
        ].map((s) => (
          <MockCard key={s.label}>
            <p className="text-[8px] text-slate-500">{s.label}</p>
            <p className="text-xs font-bold text-white/90">{s.value}</p>
          </MockCard>
        ))}
      </div>

      {/* Screening rows */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
        {[
          { job: "Senior Backend Engineer", candidates: 47, shortlisted: 14, avg: 78, status: "completed", border: "border-l-emerald-500" },
          { job: "Product Designer", candidates: 23, shortlisted: 7, avg: 71, status: "completed", border: "border-l-emerald-500" },
          { job: "Data Analyst", candidates: 18, shortlisted: 4, avg: 65, status: "running", border: "border-l-blue-400" },
        ].map((s) => (
          <MockCard key={s.job} className={["border-l-2", s.border].join(" ")}>
            <div className="flex items-center justify-between">
              <p className="truncate text-[9px] font-bold text-white/90">{s.job}</p>
              <span className={[
                "rounded-full px-1.5 py-0.5 text-[8px] font-semibold",
                s.status === "completed" ? "bg-emerald-900/50 text-emerald-400" : "bg-blue-900/50 text-blue-300",
              ].join(" ")}>
                {s.status}
              </span>
            </div>
            <div className="mt-0.5 flex gap-2 text-[8px] text-slate-400">
              <span>{s.candidates} candidates</span>
              <span className="text-emerald-400">{s.shortlisted} shortlisted</span>
              <span className="text-indigo-400">Avg {s.avg}/100</span>
            </div>
          </MockCard>
        ))}
      </div>
    </div>
  );
}

function InterviewsScreen() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white/90">Interviews</p>
          <p className="text-[9px] text-slate-500">8 scheduled</p>
        </div>
        <div className="flex gap-1">
          {["All", "Pending", "Confirmed"].map((f, i) => (
            <span key={f} className={["rounded-full px-2 py-0.5 text-[9px] font-semibold", i === 0 ? "bg-indigo-600 text-white" : "bg-white/10 text-slate-400"].join(" ")}>{f}</span>
          ))}
        </div>
      </div>

      {/* Mini calendar strip */}
      <MockCard>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-semibold text-slate-400">May 2025</span>
          <div className="flex gap-1 text-[8px] text-slate-500">
            <span>{"<"}</span>
            <span>{">"}</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[8px] text-slate-500">
          {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
          {[null,null,null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map((d, i) => (
            <span key={i} className={[
              "rounded text-[8px]",
              d === 8 ? "bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white" :
              d === 14 || d === 20 ? "font-semibold text-indigo-400" : "text-slate-500"
            ].join(" ")}>
              {d ?? ""}
            </span>
          ))}
        </div>
      </MockCard>

      {/* Interview cards */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
        {[
          { name: "Alice Mwangi", job: "Senior Backend Engineer", time: "Fri May 9 · 10:00 AM", status: "confirmed" },
          { name: "Kwame Asante", job: "Product Designer", time: "Mon May 12 · 2:00 PM", status: "pending" },
          { name: "Nour El-Amin", job: "Data Analyst", time: "Wed May 14 · 11:00 AM", status: "confirmed" },
        ].map((iv) => (
          <MockCard key={iv.name}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold text-white/90">{iv.name}</p>
                <p className="text-[8px] text-slate-500">{iv.job}</p>
                <p className="text-[8px] text-indigo-400">{iv.time}</p>
              </div>
              <span className={[
                "rounded-full px-1.5 py-0.5 text-[8px] font-semibold",
                iv.status === "confirmed" ? "bg-emerald-900/50 text-emerald-400" : "bg-amber-900/50 text-amber-400",
              ].join(" ")}>
                {iv.status}
              </span>
            </div>
          </MockCard>
        ))}
      </div>
    </div>
  );
}

function AnalyticsScreen() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white/90">Analytics</p>
          <p className="text-[9px] text-slate-500">Performance intelligence for your pipeline.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-0.5 text-[9px]">
          {["7D","30D","90D"].map((r, i) => (
            <span key={r} className={["rounded-full px-1.5 py-0.5 font-semibold", i === 1 ? "bg-indigo-600 text-white" : "text-slate-500"].join(" ")}>{r}</span>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-1">
        {[
          { label: "Screenings", value: "34", color: "text-blue-400" },
          { label: "Avg Score", value: "72/100", color: "text-violet-400" },
          { label: "Top Skill", value: "React", color: "text-emerald-400" },
          { label: "Fastest", value: "48s", color: "text-orange-400" },
          { label: "Rate", value: "63%", color: "text-teal-400" },
        ].map((m) => (
          <MockCard key={m.label}>
            <p className="text-[8px] text-slate-500">{m.label}</p>
            <p className={["text-[10px] font-bold", m.color].join(" ")}>{m.value}</p>
          </MockCard>
        ))}
      </div>

      {/* Chart pair */}
      <div className="grid flex-1 grid-cols-2 gap-1.5 overflow-hidden">
        <MockCard className="flex flex-col">
          <p className="mb-1 text-[9px] font-semibold text-slate-400">Screenings Over Time</p>
          <div className="flex flex-1 items-end gap-0.5 px-0.5">
            {[10,25,15,40,20,55,35,70,48,80,60,90].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-blue-500/50" style={{ height: `${h * 0.44}px` }} />
            ))}
          </div>
        </MockCard>
        <MockCard className="flex flex-col">
          <p className="mb-1 text-[9px] font-semibold text-slate-400">Score Distribution</p>
          <div className="flex flex-1 items-end gap-1 px-0.5">
            {[
              { range: "0-20", pct: 8, color: "bg-red-500/70" },
              { range: "21-40", pct: 14, color: "bg-orange-500/70" },
              { range: "41-60", pct: 22, color: "bg-amber-500/70" },
              { range: "61-80", pct: 38, color: "bg-blue-500/70" },
              { range: "81-100", pct: 18, color: "bg-emerald-500/70" },
            ].map((b) => (
              <div key={b.range} className="flex flex-1 flex-col items-center gap-0.5">
                <div className={["w-full rounded-sm", b.color].join(" ")} style={{ height: `${b.pct * 1.4}px` }} />
                <span className="text-[7px] text-slate-600">{b.range}</span>
              </div>
            ))}
          </div>
        </MockCard>
      </div>

      {/* AI vs HR row */}
      <MockCard>
        <p className="mb-1 text-[9px] font-semibold text-slate-400">AI vs HR Explainability</p>
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            { label: "True Pos.", value: "38", color: "text-emerald-400" },
            { label: "False Pos.", value: "4", color: "text-red-400" },
            { label: "False Neg.", value: "2", color: "text-orange-400" },
            { label: "Agreement", value: "91%", color: "text-violet-400" },
          ].map((c) => (
            <div key={c.label}>
              <p className={["text-[10px] font-bold", c.color].join(" ")}>{c.value}</p>
              <p className="text-[8px] text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      </MockCard>
    </div>
  );
}

// ── Screen renderer ────────────────────────────────────────────────────────────
function ScreenContent({ tab }: { tab: Tab }) {
  switch (tab) {
    case "Dashboard":   return <DashboardScreen />;
    case "AI Agent":    return <AIAgentScreen />;
    case "Jobs":        return <JobsScreen />;
    case "Screenings":  return <ScreeningsScreen />;
    case "Interviews":  return <InterviewsScreen />;
    case "Analytics":   return <AnalyticsScreen />;
  }
}

// ── Callout strip ─────────────────────────────────────────────────────────────
const CALLOUTS: { icon: string; title: string; desc: string }[] = [
  { icon: "▦", title: "Full pipeline visibility", desc: "Live stats for every job: applicants, screenings, scores, and funnel in one dashboard." },
  { icon: "✦", title: "AI-ranked shortlists", desc: "The AI Agent scores every candidate in seconds, then explains its reasoning step by step." },
  { icon: "⊡", title: "One-click scheduling", desc: "Book interviews from the shortlist and track confirmed, pending, and completed slots in a calendar." },
];

// ── Exported component ─────────────────────────────────────────────────────────
export function TestimonialsSection() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");

  return (
    <section id="product-tour" className="bg-[#1c2331] py-24 px-6">
      <div className="mx-auto max-w-6xl">

        {/* Section header */}
        <div className="mb-12 text-center">
          <span className="mb-4 inline-block rounded-full border border-[#5b7fa6]/30 bg-[#5b7fa6]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#a8c4d8]">
            Product Tour
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">
            Everything you need, in one workspace
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            From posting jobs and uploading CVs to AI screening, candidate shortlisting, and interview scheduling — explore every screen below.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
                activeTab === tab
                  ? "bg-gradient-to-r from-[#5b7fa6] to-[#7b6fa6] text-white shadow-lg shadow-[#5b7fa6]/40"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Browser frame */}
        <div className="mx-auto max-w-4xl">
          <BrowserFrame title={activeTab}>
            <ScreenContent tab={activeTab} />
          </BrowserFrame>
        </div>

        {/* Callout strip */}
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {CALLOUTS.map((c) => (
            <div key={c.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5b7fa6]/15 text-lg text-[#a8c4d8]">
                {c.icon}
              </div>
              <div>
                <p className="font-semibold text-white">{c.title}</p>
                <p className="mt-1 text-sm text-slate-400">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
