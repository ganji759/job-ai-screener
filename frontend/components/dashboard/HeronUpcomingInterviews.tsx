"use client";

import Link from "next/link";
import type { Interview } from "../../store/api/interviewsApi";

function initialsFromName(name?: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "??";
}

function describeWhen(iv: Interview): { day: string; time: string; live: boolean } {
  const slot = iv.confirmedSlot ?? iv.proposedSlots?.[0];
  if (!slot) return { day: "TBD", time: "—", live: false };
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const now = new Date();
  const isLive = now >= start && now <= end;

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  let day: string;
  if (sameDay(start, now)) day = "Today";
  else if (sameDay(start, tomorrow)) day = "Tomorrow";
  else day = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  const time = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  return { day, time, live: isLive };
}

function duration(iv: Interview): string {
  const slot = iv.confirmedSlot ?? iv.proposedSlots?.[0];
  if (!slot) return "—";
  const mins = Math.round((new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60000);
  return `${mins}m`;
}

export function HeronUpcomingInterviews({ items }: { items: Interview[] }) {
  return (
    <div className="panel panel-lg">
      <div className="mb-[14px] flex items-center justify-between">
        <div>
          <div className="eyebrow">Today &amp; tomorrow</div>
          <div className="mt-1 text-base font-semibold" style={{ color: "#fff" }}>
            Upcoming interviews
          </div>
        </div>
        <Link href="/interviews" className="btn btn-ghost" style={{ height: 30, fontSize: 12 }}>
          Calendar
        </Link>
      </div>

      {items.length === 0 ? (
        <div
          className="rounded-[14px] px-4 py-10 text-center"
          style={{ border: "1px dashed var(--line)", color: "var(--ink-3)" }}
        >
          <p className="text-sm">No interviews scheduled.</p>
          <p className="mt-1 text-xs">Schedule one from a screening to see it here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {items.slice(0, 5).map((iv) => {
            const w = describeWhen(iv);
            return (
              <Link
                href={`/interviews?highlight=${iv._id}`}
                key={iv._id}
                className="grid items-center gap-3"
                style={{
                  gridTemplateColumns: "auto 1fr auto",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,.025)",
                  border: "1px solid var(--line)",
                }}
              >
                <span className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                  {initialsFromName(iv.candidateName)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium" style={{ color: "#fff" }}>
                    {iv.candidateName || "Candidate"}
                  </div>
                  <div className="truncate text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                    {iv.title || iv.type} · {duration(iv)} · {iv.jobTitle || "—"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={w.live ? "pill pill-mint pulse-ring" : "pill pill-indigo"}
                  >
                    {w.live ? <span className="dot" /> : null}
                    {w.time}
                  </span>
                  <span className="mono text-[10.5px]" style={{ color: "var(--ink-4)" }}>
                    {w.day}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
