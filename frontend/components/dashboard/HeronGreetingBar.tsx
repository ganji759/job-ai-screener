"use client";

import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type PulseLine = string;

export function HeronGreetingBar({
  firstName,
  pulseLines,
  overnightScreenings,
  shortlistedToday,
  interviewsScheduledRecent,
}: {
  firstName: string;
  pulseLines: PulseLine[];
  overnightScreenings: number;
  shortlistedToday: number;
  interviewsScheduledRecent: number;
}) {
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (pulseLines.length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, [pulseLines.length]);

  const fallbackLines: PulseLine[] = [
    "Workspace is quiet — no screenings running right now",
    "Upload candidates to start your first screening",
    "AI Assistant is online and ready",
  ];
  const lines = pulseLines.length > 0 ? pulseLines : fallbackLines;
  const current = lines[tick % lines.length];

  return (
    <div className="conic-border mb-7">
      <div
        className="inner relative flex flex-wrap items-center justify-between gap-7 overflow-hidden"
        style={{ padding: "28px 32px" }}
      >
        <span
          className="pointer-events-none absolute"
          style={{
            right: -80,
            top: -40,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(217,70,239,.35), transparent 70%)",
          }}
        />
        <span
          className="pointer-events-none absolute"
          style={{
            right: -20,
            bottom: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(99,102,241,.30), transparent 70%)",
          }}
        />

        <div className="relative z-[1]" style={{ maxWidth: 720 }}>
          <div className="eyebrow mb-[10px]" style={{ color: "#c7d2fe" }}>
            <span
              className="blink mr-2 inline-block"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 8px #34d399",
              }}
            />
            Live · {today}
          </div>
          <h2 className="display m-0" style={{ fontSize: 40 }}>
            {greeting}, <span className="gradient-text-warm">{firstName}</span>.
          </h2>
          <p
            className="mt-[10px]"
            style={{ color: "var(--ink-2)", fontSize: 15, maxWidth: 580, lineHeight: 1.55, margin: "10px 0 0" }}
          >
            HERON ran <b style={{ color: "#fff" }}>{overnightScreenings} screenings</b> overnight, shortlisted{" "}
            <b style={{ color: "#fff" }}>{shortlistedToday} candidates</b> and scheduled{" "}
            <b style={{ color: "#fff" }}>{interviewsScheduledRecent} interviews</b>. Want a summary?
          </p>
          <div className="mt-[18px] flex flex-wrap gap-[10px]">
            <Link href="/agent" className="btn btn-primary">
              <Sparkles className="h-[14px] w-[14px]" /> Ask AI assistant
            </Link>
            <Link href="/jobs?openNew=1" className="btn btn-ghost">
              <Plus className="h-3 w-3" /> New job
            </Link>
          </div>
        </div>

        <div className="relative z-[1]" style={{ minWidth: 260 }}>
          <div
            style={{
              padding: "18px 18px 14px",
              borderRadius: 16,
              background: "linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.15))",
              border: "1px solid var(--line)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="eyebrow mb-3" style={{ color: "var(--ink-3)" }}>
              Pulse · last 60s
            </div>
            <div
              key={tick}
              className="fade-up"
              style={{ fontSize: 15, color: "#fff", fontWeight: 500, lineHeight: 1.45 }}
            >
              {current}
            </div>
            <div className="mt-4 flex gap-1">
              {lines.map((_, i) => (
                <span
                  key={i}
                  className="flex-1"
                  style={{
                    height: 3,
                    borderRadius: 2,
                    background:
                      i === tick % lines.length
                        ? "linear-gradient(90deg, #6366f1, #d946ef)"
                        : "rgba(255,255,255,.08)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
