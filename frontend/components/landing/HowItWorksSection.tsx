"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FileText, Play, Sparkles } from "lucide-react";
import { LiveCalendar } from "./LiveCalendar";
import { formatScheduledDate } from "./_shared";

type StepKey = "jobpost" | "resumes" | "screening" | "review";
type Step = {
  no: number;
  title: string;
  short: string;
  body: string;
  color: string;
  preview: StepKey;
};

const STEPS: Step[] = [
  {
    no: 1,
    title: "Post a Job",
    short: "Describe the role in plain language.",
    body: "HERON's AI extracts required skills, experience levels, education, and domain automatically — no manual forms to fill in.",
    color: "#6366f1",
    preview: "jobpost",
  },
  {
    no: 2,
    title: "Ingest Resumes",
    short: "Paste, upload PDFs, or let the agent process bulk uploads.",
    body: "pdfplumber + Gemini extract structured profiles for every candidate and attach them to the right job in seconds.",
    color: "#22d3ee",
    preview: "resumes",
  },
  {
    no: 3,
    title: "Run AI Screening",
    short: "One command triggers a full screening run.",
    body: "Gemini scores every candidate across five weighted dimensions, ranks them by total score, and builds a shortlist with per-candidate strengths, gaps, and hiring-risk labels.",
    color: "#fbbf24",
    preview: "screening",
  },
  {
    no: 4,
    title: "Review & Act",
    short: "Browse, approve, or instruct the agent to schedule.",
    body: "Invite emails with calendar attachments go out automatically — all from your recruiter workspace.",
    color: "#d946ef",
    preview: "review",
  },
];

function PreviewShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      style={{
        borderRadius: 18,
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(20,20,38,.9), rgba(10,10,22,.9))",
        border: "1px solid var(--hl-line-strong)",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid var(--hl-line)",
          background: "rgba(0,0,0,.25)",
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ffbd2e" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#28c940" }} />
        </div>
        <span
          style={{
            fontFamily: "var(--hl-mono)",
            fontSize: 11,
            color: "var(--hl-ink-3)",
            marginLeft: 8,
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ padding: 22, minHeight: 380 }}>{children}</div>
    </div>
  );
}

function JobPostPreview({ color }: { color: string }) {
  const full = "Senior Backend Engineer — Python, Go, distributed systems, 5+ yrs. Remote in Africa.";
  const [typed, setTyped] = useState("");
  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) window.clearInterval(id);
    }, 35);
    return () => window.clearInterval(id);
  }, []);

  const skills = ["Python", "Go", "Distributed Systems", "Kafka", "PostgreSQL", "AWS"];
  const meta: [string, string][] = [
    ["Level", "Senior"],
    ["Experience", "5+ years"],
    ["Location", "Remote · Africa"],
    ["Domain", "Engineering"],
  ];

  return (
    <PreviewShell label="app.heron.ai / jobs / new">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Describe the role
          </div>
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(255,255,255,.03)",
              border: "1px solid var(--hl-line)",
              fontSize: 14,
              color: "#fff",
              minHeight: 60,
            }}
          >
            {typed}
            <span className="caret" style={{ color }}>
              ▍
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles size={14} />
          <span style={{ fontSize: 12, color: "var(--hl-ink-3)", fontFamily: "var(--hl-mono)" }}>
            AI extracted automatically:
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Required skills
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {skills.map((s, i) => (
                <span
                  key={s}
                  style={{
                    fontSize: 12,
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: `color-mix(in oklab, ${color} 16%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
                    color: "#fff",
                    animation: `hl-fadeUp .4s ease ${i * 0.06}s both`,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="eyebrow" style={{ marginBottom: 2 }}>
              Meta
            </div>
            {meta.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  padding: "6px 0",
                  borderBottom: "1px dashed var(--hl-line)",
                }}
              >
                <span style={{ color: "var(--hl-ink-3)" }}>{k}</span>
                <span style={{ color: "#fff", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function ResumesPreview({ color }: { color: string }) {
  const docs = [
    { name: "amara_okafor.pdf", size: "124 KB", skills: ["Python", "Go", "K8s"], fit: 92, c: "#34d399" },
    { name: "diego_restrepo.pdf", size: "98 KB", skills: ["Python", "AWS", "SQL"], fit: 87, c: "#34d399" },
    { name: "priya_subramanian.pdf", size: "156 KB", skills: ["Java", "Kafka", "gRPC"], fit: 81, c: "#a78bfa" },
    { name: "lea_moreau.pdf", size: "88 KB", skills: ["Node", "TS", "PG"], fit: 74, c: "#fbbf24" },
  ];
  return (
    <PreviewShell label="app.heron.ai / applicants">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Bulk upload · 47 PDFs</div>
          <div className="pill" style={{ height: 24, fontSize: 11 }}>
            <span className="dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            parsing
          </div>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,.05)",
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: "74%",
              height: "100%",
              background: `linear-gradient(90deg, ${color}, #d946ef)`,
              animation: "hl-shimmer 2s linear infinite",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
        {docs.map((d, i) => (
          <div
            key={d.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              background: "rgba(255,255,255,.03)",
              border: "1px solid var(--hl-line)",
              borderRadius: 10,
              animation: `hl-fadeUp .4s ease ${i * 0.1}s both`,
            }}
          >
            <FileText size={18} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
              <div style={{ fontFamily: "var(--hl-mono)", fontSize: 10, color: "var(--hl-ink-3)" }}>
                {d.size} · 5 skills · 4 roles · 8.5 yrs
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {d.skills.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.06)",
                    color: "var(--hl-ink-2)",
                    fontFamily: "var(--hl-mono)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
            <span
              style={{
                fontFamily: "var(--hl-mono)",
                fontSize: 11,
                color: d.c,
                minWidth: 36,
                textAlign: "right",
              }}
            >
              {d.fit}/100
            </span>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

function ScreeningPreview({ color }: { color: string }) {
  const dims = [
    { l: "Skills match", v: 35, s: 32, c: "#34d399" },
    { l: "Experience", v: 25, s: 22, c: "#22d3ee" },
    { l: "Education", v: 15, s: 14, c: "#a78bfa" },
    { l: "Role fit", v: 15, s: 13, c: "#f472b6" },
    { l: "Domain", v: 10, s: 9, c: "#fbbf24" },
  ];
  return (
    <PreviewShell label="app.heron.ai / screenings / sr-backend-24">
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Amara Okafor · Senior Backend</div>
            <div style={{ fontSize: 11, color: "var(--hl-ink-3)", fontFamily: "var(--hl-mono)" }}>
              scored against 5-dim rubric
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              padding: "6px 12px",
              borderRadius: 999,
              background: `linear-gradient(135deg, ${color}55, transparent)`,
              border: `1px solid ${color}66`,
            }}
          >
            <span className="display" style={{ fontSize: 24, fontWeight: 700, color }}>
              92
            </span>
            <span style={{ fontSize: 11, color: "var(--hl-ink-3)" }}>/100 · strong fit</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {dims.map((d, i) => (
            <div key={d.l} style={{ animation: `hl-fadeUp .4s ease ${i * 0.08}s both` }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: "var(--hl-ink-2)" }}>
                  {d.l}{" "}
                  <span style={{ color: "var(--hl-ink-4)", fontSize: 10 }}>(weight {d.v}%)</span>
                </span>
                <span style={{ fontFamily: "var(--hl-mono)", color: d.c }}>
                  {d.s}/{d.v}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: "rgba(255,255,255,.05)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(d.s / d.v) * 100}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${d.c}, color-mix(in oklab, ${d.c} 60%, #fff))`,
                    borderRadius: 4,
                    transition: "width 1s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 18,
            padding: "12px 14px",
            background: "rgba(52,211,153,.08)",
            border: "1px solid rgba(52,211,153,.25)",
            borderRadius: 12,
            fontSize: 12.5,
            color: "var(--hl-ink-2)",
          }}
        >
          <strong style={{ color: "#34d399" }}>Strengths:</strong> 8.5 yrs Python · K8s in production
          · led 3 distributed system rewrites &nbsp;
          <strong style={{ color: "#fbbf24" }}>Gap:</strong> no formal CS degree (offset by
          experience)
        </div>
      </div>
    </PreviewShell>
  );
}

function ReviewPreview({ color }: { color: string }) {
  const slots = [
    { n: "Amara Okafor", when: formatScheduledDate(1, 10, 0), st: "confirmed", c: "#34d399" },
    { n: "Diego Restrepo", when: formatScheduledDate(2, 11, 30), st: "pending", c: "#fbbf24" },
    { n: "Priya Subramanian", when: formatScheduledDate(3, 9, 0), st: "confirmed", c: "#34d399" },
  ];
  return (
    <PreviewShell label="app.heron.ai / interviews">
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Interview schedule · this week</div>
            <div style={{ fontSize: 11, color: "var(--hl-ink-3)", fontFamily: "var(--hl-mono)" }}>
              3 slots booked · invites sent
            </div>
          </div>
          <button
            type="button"
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 500,
              background: `linear-gradient(135deg, ${color}, #6366f1)`,
              color: "#fff",
            }}
          >
            + Schedule
          </button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <LiveCalendar accent={color} secondary="#6366f1" size="sm" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {slots.map((s, i) => (
            <div
              key={s.n}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "rgba(255,255,255,.03)",
                border: "1px solid var(--hl-line)",
                borderRadius: 10,
                animation: `hl-fadeUp .4s ease ${i * 0.1}s both`,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${s.c}, #6366f1)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0a0a14",
                }}
              >
                {s.n
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: "var(--hl-ink-3)", fontFamily: "var(--hl-mono)" }}>
                  {s.when}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: `color-mix(in oklab, ${s.c} 20%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${s.c} 40%, transparent)`,
                  color: s.c,
                  fontFamily: "var(--hl-mono)",
                  textTransform: "uppercase",
                }}
              >
                {s.st}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

function StepPreview({ step }: { step: Step }) {
  if (step.preview === "jobpost") return <JobPostPreview color={step.color} />;
  if (step.preview === "resumes") return <ResumesPreview color={step.color} />;
  if (step.preview === "screening") return <ScreeningPreview color={step.color} />;
  return <ReviewPreview color={step.color} />;
}

export function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % STEPS.length), 5500);
    return () => window.clearInterval(id);
  }, [auto]);

  const step = STEPS[active];

  return (
    <section
      className="section-pad"
      id="howitworks"
      style={{
        background:
          "linear-gradient(180deg, transparent, rgba(99,102,241,.04) 50%, transparent)",
      }}
    >
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 60px" }}>
          <div className="eyebrow" style={{ color: "#22d3ee" }}>
            HOW IT WORKS
          </div>
          <h2 className="display" style={{ fontSize: "clamp(40px,5vw,64px)", marginTop: 14 }}>
            From job post to <span className="gradient-text-warm">shortlist</span> in minutes.
          </h2>
          <p
            style={{
              color: "var(--hl-ink-2)",
              fontSize: 17,
              marginTop: 18,
              lineHeight: 1.55,
            }}
          >
            HERON&apos;s four-step workflow eliminates manual screening and surfaces the best
            candidates automatically.
          </p>
        </div>

        <div className="hl-wf-grid">
          {/* stepper */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
            {STEPS.map((s, i) => {
              const isActive = i === active;
              return (
                <button
                  key={s.no}
                  type="button"
                  onClick={() => {
                    setActive(i);
                    setAuto(false);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "18px 20px",
                    borderRadius: 16,
                    background: isActive
                      ? `linear-gradient(135deg, color-mix(in oklab, ${s.color} 14%, transparent), transparent)`
                      : "rgba(255,255,255,.02)",
                    border: isActive ? `1px solid ${s.color}66` : "1px solid var(--hl-line)",
                    transition: "all .25s ease",
                    cursor: "pointer",
                    boxShadow: isActive ? `0 12px 32px -12px ${s.color}66` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: isActive
                          ? `linear-gradient(135deg, ${s.color}, #6366f1)`
                          : "rgba(255,255,255,.04)",
                        border: isActive ? "none" : "1px solid var(--hl-line-strong)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--hl-display)",
                        fontWeight: 700,
                        fontSize: 16,
                        color: isActive ? "#fff" : "var(--hl-ink-3)",
                        flexShrink: 0,
                        transition: "all .25s ease",
                        boxShadow: isActive
                          ? `0 0 0 4px color-mix(in oklab, ${s.color} 20%, transparent)`
                          : "none",
                      }}
                    >
                      {s.no}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--hl-display)",
                          fontSize: 18,
                          fontWeight: 600,
                          color: isActive ? "#fff" : "var(--hl-ink-2)",
                        }}
                      >
                        {s.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--hl-ink-3)", marginTop: 3 }}>
                        {s.short}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "var(--hl-ink-2)",
                        marginTop: 14,
                        paddingLeft: 52,
                      }}
                    >
                      {s.body}
                    </div>
                  )}
                </button>
              );
            })}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 14,
                padding: "0 6px",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--hl-ink-4)", fontFamily: "var(--hl-mono)" }}>
                {auto ? "AUTO-PLAYING" : "PAUSED"}
              </span>
              <button
                type="button"
                onClick={() => setAuto((a) => !a)}
                style={{
                  fontSize: 11,
                  color: "var(--hl-ink-3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Play size={10} fill="currentColor" /> {auto ? "Pause" : "Resume"}
              </button>
            </div>
          </div>

          <div key={active} style={{ position: "relative", animation: "hl-fadeUp .5s ease both" }}>
            <div
              style={{
                position: "absolute",
                inset: -20,
                background: `radial-gradient(circle at 50% 30%, ${step.color}33, transparent 60%)`,
                filter: "blur(40px)",
                zIndex: 0,
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <StepPreview step={step} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
