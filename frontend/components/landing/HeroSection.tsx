"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Bolt, Bot, Check, Mic, Play, Plus, Sparkles } from "lucide-react";
import { useLeadModal } from "./LeadModalContext";

// ============================================================
// AgentDemo — auto-playing 16s pipeline showing the AI agent
//   1. Voice listening (mic + waveform)
//   2. Transcribing → typed user message reveal
//   3. Tool chain stream
//   4. Candidate cards reveal w/ animated score bars
//   5. Green summary callout
// ============================================================

type Candidate = {
  name: string;
  role: string;
  score: number;
  color: string;
};

const CANDIDATES: Candidate[] = [
  { name: "Amara Okafor", role: "Sr. Backend · Lagos", score: 92, color: "#34d399" },
  { name: "Diego Restrepo", role: "Sr. Backend · Bogotá", score: 87, color: "#34d399" },
  { name: "Priya Subramanian", role: "Sr. Backend · Bangalore", score: 81, color: "#a78bfa" },
  { name: "Léa Moreau", role: "Backend · Paris", score: 74, color: "#fbbf24" },
  { name: "Tomás Álvarez", role: "Backend · Madrid", score: 62, color: "#f87171" },
];

const VOICE_LISTEN_MS = 2200;
const VOICE_TRANS_MS = 2800;
const VOICE_OFFSET = VOICE_TRANS_MS;

type TimelineEvent =
  | { t: number; kind: "user"; text: string; fromVoice?: boolean }
  | { t: number; kind: "status" | "tool" | "log"; text: string }
  | { t: number; kind: "candidates"; count: number }
  | { t: number; kind: "summary" }
  | { t: number; kind: "reset" };

const TIMELINE: TimelineEvent[] = [
  { t: 0 + VOICE_OFFSET, kind: "user", text: "Screen 47 backend applicants for the Senior role and shortlist the top 5.", fromVoice: true },
  { t: 700 + VOICE_OFFSET, kind: "status", text: "Agent received · planning chain of tool calls" },
  { t: 1400 + VOICE_OFFSET, kind: "tool", text: '→ list_jobs(domain="Engineering", status="active")' },
  { t: 2100 + VOICE_OFFSET, kind: "tool", text: '→ ingest_resumes(job_id="sr-backend-24", count=47)' },
  { t: 2900 + VOICE_OFFSET, kind: "log", text: "pdfplumber parsed 47 PDFs · 0 errors" },
  { t: 3600 + VOICE_OFFSET, kind: "tool", text: '→ run_screening(rubric="5-dim", weights=[35,25,15,15,10])' },
  { t: 4400 + VOICE_OFFSET, kind: "candidates", count: 1 },
  { t: 4900 + VOICE_OFFSET, kind: "candidates", count: 2 },
  { t: 5400 + VOICE_OFFSET, kind: "candidates", count: 3 },
  { t: 5900 + VOICE_OFFSET, kind: "candidates", count: 4 },
  { t: 6400 + VOICE_OFFSET, kind: "candidates", count: 5 },
  { t: 7200 + VOICE_OFFSET, kind: "log", text: "Avg match score 79/100 · 5 above shortlist threshold (75)" },
  { t: 7900 + VOICE_OFFSET, kind: "tool", text: '→ schedule_interviews(top_n=3, slot="Tue–Thu 10am–1pm")' },
  { t: 8800 + VOICE_OFFSET, kind: "summary" },
  { t: 13500 + VOICE_OFFSET, kind: "reset" },
];

type VoicePhase = "listening" | "transcribing" | "done";

function AgentDemo() {
  const [tick, setTick] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("listening");
  const [voiceMs, setVoiceMs] = useState(0);
  const logRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    let raf = 0;
    const loop = () => {
      const elapsed = Date.now() - startRef.current;

      if (elapsed < VOICE_LISTEN_MS) {
        setVoicePhase("listening");
        setVoiceMs(elapsed);
      } else if (elapsed < VOICE_TRANS_MS) {
        setVoicePhase("transcribing");
        setVoiceMs(VOICE_LISTEN_MS);
      } else {
        setVoicePhase("done");
      }

      let r = 0;
      let sum = false;
      let reset = false;
      let lastIdx = -1;
      for (let i = 0; i < TIMELINE.length; i++) {
        const e = TIMELINE[i];
        if (elapsed >= e.t) {
          lastIdx = i;
          if (e.kind === "candidates") r = e.count;
          if (e.kind === "summary") sum = true;
          if (e.kind === "reset") reset = true;
        }
      }
      if (reset) {
        startRef.current = Date.now();
        setRevealed(0);
        setShowSummary(false);
        setTick(0);
      } else {
        setRevealed(r);
        setShowSummary(sum);
        setTick(lastIdx);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const lines = useMemo(
    () =>
      TIMELINE.slice(0, tick + 1).filter((e) =>
        ["user", "status", "tool", "log"].includes(e.kind),
      ) as Extract<TimelineEvent, { text: string }>[],
    [tick],
  );

  const transcribeProgress = useMemo(() => {
    if (voicePhase !== "done") return 0;
    const since = Date.now() - startRef.current - VOICE_TRANS_MS;
    return Math.max(0, Math.min(1, since / 800));
  }, [voicePhase, tick, voiceMs]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines.length, voicePhase]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 22,
        background: "linear-gradient(180deg, rgba(20,20,38,.92), rgba(10,10,22,.92))",
        border: "1px solid var(--hl-line-strong)",
        boxShadow:
          "0 30px 80px -20px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04), 0 0 80px -20px rgba(99,102,241,.45)",
        overflow: "hidden",
      }}
    >
      {/* top chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid var(--hl-line)",
          background: "rgba(0,0,0,.25)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c940" }} />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
          <Sparkles size={14} />
          <span style={{ fontFamily: "var(--hl-mono)", fontSize: 12, color: "var(--hl-ink-3)" }}>
            app.heron.ai / ai-agent
          </span>
        </div>
        <span className="pill" style={{ height: 24, fontSize: 11 }}>
          <span className="dot" /> Live · Gemini 2.5
        </span>
      </div>

      {/* body */}
      <div className="hl-agent-body">
        {/* LEFT: agent log */}
        <div
          style={{
            padding: "22px 22px 16px",
            borderRight: "1px solid var(--hl-line)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg,#6366f1,#d946ef)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>AI Hiring Assistant</div>
              <div style={{ fontSize: 11, color: "var(--hl-ink-3)", fontFamily: "var(--hl-mono)" }}>
                chain.run · 5 tools available
              </div>
            </div>
          </div>

          <div
            ref={logRef}
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontFamily: "var(--hl-mono)",
              fontSize: 12.5,
              lineHeight: 1.55,
              maxHeight: 340,
            }}
          >
            {voicePhase !== "done" && <VoiceBubble phase={voicePhase} ms={voiceMs} />}
            {lines.map((l, i) => (
              <LogLine
                key={`${l.kind}-${i}`}
                kind={l.kind}
                text={l.text}
                fromVoice={"fromVoice" in l ? !!l.fromVoice : false}
                isLast={i === lines.length - 1 && !showSummary}
                progress={"fromVoice" in l && l.fromVoice ? transcribeProgress : 1}
              />
            ))}
          </div>

          {/* input row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background:
                voicePhase === "listening" ? "rgba(217,70,239,.08)" : "rgba(255,255,255,.04)",
              border:
                voicePhase === "listening"
                  ? "1px solid rgba(217,70,239,.4)"
                  : "1px solid var(--hl-line)",
              borderRadius: 12,
              transition: "all .3s ease",
            }}
          >
            <Plus size={14} />
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: voicePhase === "listening" ? "#f0abfc" : "var(--hl-ink-3)",
              }}
            >
              {voicePhase === "listening" ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#ef4444",
                      marginRight: 6,
                      animation: "hl-blink 1s infinite",
                    }}
                  />
                  Listening · voice command active…
                </>
              ) : voicePhase === "transcribing" ? (
                "Transcribing…"
              ) : (
                "Ask anything about your pipeline…"
              )}
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background:
                  voicePhase === "listening"
                    ? "linear-gradient(135deg,#ef4444,#d946ef)"
                    : "rgba(255,255,255,.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  voicePhase === "listening" ? "0 0 0 4px rgba(239,68,68,.15)" : "none",
                transition: "all .25s ease",
              }}
            >
              <Mic size={14} />
            </div>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg,#6366f1,#d946ef)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowRight size={12} />
            </div>
          </div>
        </div>

        {/* RIGHT: candidate stream */}
        <div
          style={{
            padding: "22px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".01em" }}>
              Screening Senior Backend · 47 candidates
            </div>
            <div className="eyebrow" style={{ fontSize: 10 }}>
              {revealed >= 5 ? (
                "COMPLETE"
              ) : (
                <span>
                  <span className="caret" style={{ display: "inline-block" }}>
                    ●
                  </span>{" "}
                  SCORING
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {CANDIDATES.map((c, i) => (
              <CandidateCard key={c.name} c={c} idx={i} visible={i < revealed} />
            ))}
          </div>

          <div
            style={{
              opacity: showSummary ? 1 : 0,
              transform: showSummary ? "translateY(0)" : "translateY(8px)",
              transition: "opacity .4s ease, transform .4s ease",
              background: "linear-gradient(135deg, rgba(52,211,153,.16), rgba(34,211,238,.12))",
              border: "1px solid rgba(52,211,153,.3)",
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(52,211,153,.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#34d399",
              }}
            >
              <Check size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Shortlisted 5 · 3 interviews scheduled
              </div>
              <div style={{ fontSize: 11, color: "var(--hl-ink-3)" }}>
                Invites sent · calendar slots Tue–Thu 10am–1pm
              </div>
            </div>
            <div className="eyebrow" style={{ fontSize: 10, color: "#34d399" }}>
              4M 12S TOTAL
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hl-agent-body {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          min-height: 480px;
        }
        @media (max-width: 720px) {
          .hl-agent-body {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function LogLine({
  kind,
  text,
  fromVoice,
  isLast,
  progress = 1,
}: {
  kind: "user" | "status" | "tool" | "log";
  text: string;
  fromVoice: boolean;
  isLast: boolean;
  progress?: number;
}) {
  const palette: Record<
    "user" | "status" | "tool" | "log",
    { bg: string; bd: string; fg: string; label: string }
  > = {
    user: {
      bg: "rgba(99,102,241,.12)",
      bd: "rgba(99,102,241,.32)",
      fg: "#c7d2fe",
      label: fromVoice ? "🎙️" : "YOU",
    },
    status: { bg: "transparent", bd: "transparent", fg: "var(--hl-ink-3)", label: "· · ·" },
    tool: { bg: "rgba(217,70,239,.08)", bd: "rgba(217,70,239,.25)", fg: "#f0abfc", label: "TOOL" },
    log: { bg: "transparent", bd: "transparent", fg: "var(--hl-ink-2)", label: "LOG" },
  };
  const c = palette[kind];
  const shownText = progress >= 1 ? text : text.slice(0, Math.floor(text.length * progress));
  const isTyping = progress < 1;
  const padded = kind === "tool" || kind === "user";

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        animation: "hl-fadeUp .35s cubic-bezier(.2,.7,.2,1) both",
      }}
    >
      <span
        style={{
          fontFamily: "var(--hl-mono)",
          fontSize: fromVoice ? 12 : 9.5,
          letterSpacing: ".12em",
          color: "var(--hl-ink-4)",
          marginTop: 3,
          width: 32,
          flexShrink: 0,
        }}
      >
        {c.label}
      </span>
      <span
        style={{
          flex: 1,
          padding: padded ? "6px 10px" : "0",
          background: c.bg,
          borderRadius: 8,
          borderLeft: padded ? `2px solid ${c.bd}` : "0",
          color: c.fg,
          wordBreak: "break-word",
        }}
      >
        {shownText}
        {(isLast || isTyping) && (
          <span className="caret" style={{ marginLeft: 4, color: "#fff" }}>
            ▍
          </span>
        )}
      </span>
    </div>
  );
}

function VoiceBubble({ phase, ms }: { phase: VoicePhase; ms: number }) {
  const seconds = (ms / 1000).toFixed(1);
  const [whole, frac] = seconds.split(".");
  const bars = 18;
  const isListening = phase === "listening";
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        animation: "hl-fadeUp .3s ease both",
      }}
    >
      <span
        style={{
          fontFamily: "var(--hl-mono)",
          fontSize: 12,
          color: "var(--hl-ink-4)",
          marginTop: 6,
          width: 32,
          flexShrink: 0,
        }}
      >
        🎙️
      </span>
      <div
        style={{
          flex: 1,
          padding: "10px 12px",
          borderRadius: 10,
          background: isListening
            ? "linear-gradient(90deg, rgba(239,68,68,.10), rgba(217,70,239,.10))"
            : "linear-gradient(90deg, rgba(99,102,241,.10), rgba(217,70,239,.10))",
          border: isListening
            ? "1px solid rgba(239,68,68,.35)"
            : "1px solid rgba(99,102,241,.35)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", width: 24, height: 24, flexShrink: 0 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: isListening ? "#ef4444" : "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Mic size={12} />
            </div>
            {isListening && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: "50%",
                    border: "2px solid #ef4444",
                    opacity: 0.5,
                    animation: "hl-voicering 1.4s ease-out infinite",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: "50%",
                    border: "2px solid #ef4444",
                    opacity: 0.5,
                    animation: "hl-voicering 1.4s ease-out infinite .7s",
                  }}
                />
              </>
            )}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 3, height: 28 }}>
            {Array.from({ length: bars }).map((_, i) => {
              const seed = (Math.sin(i * 1.3) + 1) / 2;
              const phaseOff = i * 0.08;
              const style: CSSProperties = {
                flex: 1,
                borderRadius: 2,
                background: isListening
                  ? "linear-gradient(180deg, #f97316, #d946ef)"
                  : "linear-gradient(180deg, #6366f1, #818cf8)",
                height: "100%",
                transformOrigin: "center",
                animation: isListening
                  ? `hl-wave ${0.55 + seed * 0.4}s ease-in-out -${phaseOff}s infinite alternate`
                  : "none",
                transform: isListening ? undefined : "scaleY(0.25)",
                opacity: isListening ? 1 : 0.5,
                transition: "opacity .3s, transform .3s",
              };
              return <div key={i} style={style} />;
            })}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 1,
              minWidth: 62,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: isListening ? "#fca5a5" : "#c7d2fe",
                fontFamily: "var(--hl-mono)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
                fontWeight: 600,
              }}
            >
              {isListening ? "● REC" : "✓ DONE"}
            </div>
            <div style={{ fontFamily: "var(--hl-mono)", fontSize: 11, color: "#fff" }}>
              0:0{whole}
              <span style={{ opacity: 0.5 }}>.{frac ?? "0"}</span>
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 10.5,
            color: isListening ? "#f0abfc" : "var(--hl-ink-3)",
            fontFamily: "var(--hl-mono)",
            letterSpacing: ".03em",
          }}
        >
          {isListening
            ? "Listening · say a command like “shortlist top 5”…"
            : "Transcribing · Gemini Speech-to-Text"}
        </div>
      </div>
    </div>
  );
}

function CandidateCard({ c, idx, visible }: { c: Candidate; idx: number; visible: boolean }) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: `opacity .4s ease ${idx * 0.05}s, transform .4s ease ${idx * 0.05}s`,
        padding: "10px 12px",
        background: "rgba(255,255,255,.025)",
        border: "1px solid var(--hl-line)",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${c.color}, color-mix(in oklab, ${c.color} 55%, #6366f1))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 12,
          color: "#0a0a14",
          flexShrink: 0,
        }}
      >
        {c.name
          .split(" ")
          .map((n) => n[0])
          .join("")}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {c.name}
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
          {c.role}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          minWidth: 74,
        }}
      >
        <div
          style={{
            fontFamily: "var(--hl-mono)",
            fontSize: 13,
            fontWeight: 600,
            color: c.color,
          }}
        >
          {c.score}
          <span style={{ color: "var(--hl-ink-4)", fontWeight: 400, fontSize: 10 }}>/100</span>
        </div>
        <div
          style={{
            width: 64,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: visible ? `${c.score}%` : "0%",
              height: "100%",
              borderRadius: 2,
              background: c.color,
              transition: `width .6s ease ${idx * 0.05 + 0.2}s`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Hero
// ============================================================
export function HeroSection() {
  const { open: openLeadModal } = useLeadModal();
  const stats = [
    { n: "10×", l: "Faster screening", g: ["#fbbf24", "#f472b6"] as const },
    { n: "94%", l: "Placement accuracy", g: ["#22d3ee", "#6366f1"] as const },
    { n: "3,200+", l: "Candidates ranked", g: ["#34d399", "#22d3ee"] as const },
    { n: "60%", l: "Lower hiring cost", g: ["#d946ef", "#6366f1"] as const },
  ];

  return (
    <section className="section-pad" style={{ paddingTop: 60, paddingBottom: 100 }} id="top">
      <div className="container">
        <div className="hl-hero-grid">
          <div className="fade-up">
            <div className="pill" style={{ marginBottom: 22 }}>
              <span className="dot" />
              <span style={{ color: "#fff" }}>AI-Powered Talent Intelligence</span>
            </div>
            <h1 className="display" style={{ fontSize: "clamp(48px, 6.4vw, 86px)", margin: 0 }}>
              Hire smarter,
              <br />
              <span className="gradient-text-warm">faster,</span>
              <br />
              build better teams.
            </h1>
            <p
              style={{
                fontSize: 18,
                lineHeight: 1.55,
                color: "var(--hl-ink-2)",
                marginTop: 24,
                maxWidth: 520,
              }}
            >
              HERON&apos;s AI agent screens, scores and shortlists candidates the way your best
              recruiter would — transparently, in minutes, not days.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openLeadModal("professional")}
              >
                Request Early Access <ArrowRight size={14} />
              </button>
              <a className="btn btn-ghost" href="#product">
                <Play size={14} fill="currentColor" /> Watch the AI agent work
              </a>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                marginTop: 36,
                color: "var(--hl-ink-3)",
                fontSize: 13,
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bolt size={14} /> 4-minute setup
              </span>
            </div>
          </div>

          <div style={{ position: "relative" }} className="fade-up">
            <div
              style={{
                position: "absolute",
                inset: -30,
                background:
                  "radial-gradient(circle at 50% 30%, rgba(99,102,241,.25), transparent 60%)",
                filter: "blur(40px)",
                zIndex: 0,
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <AgentDemo />
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="hl-stats-strip" style={{ marginTop: 96 }}>
          {stats.map((s, i) => (
            <div key={s.l} style={{ position: "relative", padding: "24px 4px" }}>
              <div
                className="display"
                style={{
                  fontSize: 54,
                  lineHeight: 1,
                  background: `linear-gradient(135deg, ${s.g[0]}, ${s.g[1]})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "var(--hl-ink-3)",
                  letterSpacing: ".02em",
                }}
              >
                {s.l}
              </div>
              {i < 3 && (
                <div
                  style={{
                    position: "absolute",
                    right: -12,
                    top: "25%",
                    bottom: "25%",
                    width: 1,
                    background: "var(--hl-line)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .hl-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
          gap: 56px;
          align-items: center;
        }
        .hl-stats-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        @media (max-width: 980px) {
          .hl-hero-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .hl-stats-strip {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </section>
  );
}
