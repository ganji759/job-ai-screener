"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Plus,
  X,
} from "lucide-react";
import { useGetInterviewsQuery } from "../../../store/api/interviewsApi";
import type { Interview } from "../../../store/api/interviewsApi";
import { InterviewCard } from "../../../components/interviews/InterviewCard";
import { cn } from "../../../lib/utils";

type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";
type SortKey = "upcoming" | "date-desc" | "name-asc";
type ViewMode = "list" | "calendar";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "upcoming", label: "Upcoming first" },
  { value: "date-desc", label: "Newest first" },
  { value: "name-asc", label: "Name A → Z" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function slotDate(iv: Interview): Date {
  const s = iv.confirmedSlot ?? iv.proposedSlots[0];
  return s ? new Date(s.start) : new Date(iv.createdAt);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function initialsOf(name?: string): string {
  if (!name) return "??";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join("") || "??"
  );
}

function relativeDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MiniCalendar({
  interviews,
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
}: {
  interviews: Interview[];
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDay: Date | null;
  onSelectDay: (d: Date | null) => void;
}) {
  const year = month.getFullYear();
  const mon = month.getMonth();

  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : new Date(year, mon, i - firstDay + 1),
  );

  const countOnDay = (d: Date) => interviews.filter((iv) => isSameDay(slotDate(iv), d)).length;
  const today = new Date();

  return (
    <div className="panel overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, mon - 1, 1))}
          className="btn-icon"
          style={{ width: 28, height: 28 }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold" style={{ color: "#fff" }}>
          {MONTHS[mon]} {year}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, mon + 1, 1))}
          className="btn-icon"
          style={{ width: 28, height: 28 }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        className="grid grid-cols-7"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        {DAYS.map((d) => (
          <div
            key={d}
            className="mono py-2 text-center text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ink-4)" }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 p-2">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const count = countOnDay(day);
          const isToday = isSameDay(day, today);
          const isSel = selectedDay ? isSameDay(day, selectedDay) : false;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(isSel ? null : day)}
              className="relative flex flex-col items-center justify-center rounded-[10px] py-1.5 text-sm transition"
              style={
                isSel
                  ? {
                      background: "linear-gradient(135deg, #6366f1, #d946ef)",
                      color: "#fff",
                      boxShadow: "0 8px 20px -10px rgba(217,70,239,.55)",
                    }
                  : isToday
                    ? {
                        background: "rgba(99,102,241,.12)",
                        border: "1px solid rgba(99,102,241,.35)",
                        color: "#c7d2fe",
                      }
                    : { color: "var(--ink-2)" }
              }
            >
              <span className="text-xs leading-none">{day.getDate()}</span>
              {count > 0 ? (
                <span
                  className="mono mt-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none"
                  style={
                    isSel
                      ? { background: "rgba(255,255,255,.25)", color: "#fff" }
                      : { background: "rgba(99,102,241,.18)", color: "#c7d2fe" }
                  }
                >
                  {count}
                </span>
              ) : (
                <span className="mt-0.5 h-4" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [jobFilter, setJobFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("upcoming");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => new Date());

  const { data, isLoading, refetch } = useGetInterviewsQuery({ limit: 100 });
  const all = data?.interviews ?? [];

  const jobs = useMemo(() => [...new Set(all.map((iv) => iv.jobTitle))].sort(), [all]);

  const filtered = useMemo(() => {
    let list = all;
    if (statusFilter !== "all") list = list.filter((iv) => iv.status === statusFilter);
    if (jobFilter) list = list.filter((iv) => iv.jobTitle === jobFilter);
    return list;
  }, [all, statusFilter, jobFilter]);

  const dayFiltered = useMemo(() => {
    if (!selectedDay) return filtered;
    return filtered.filter((iv) => isSameDay(slotDate(iv), selectedDay));
  }, [filtered, selectedDay]);

  const sorted = useMemo(() => {
    return [...dayFiltered].sort((a, b) => {
      if (sortBy === "upcoming") return slotDate(a).getTime() - slotDate(b).getTime();
      if (sortBy === "date-desc") return slotDate(b).getTime() - slotDate(a).getTime();
      if (sortBy === "name-asc") return a.candidateName.localeCompare(b.candidateName);
      return 0;
    });
  }, [dayFiltered, sortBy]);

  // Week strip (7 days starting from today)
  const today = new Date();
  const weekStrip = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const count = filtered.filter((iv) => isSameDay(slotDate(iv), d)).length;
      return { date: d, count };
    });
  }, [filtered, today]);

  const debriefRows = useMemo(() => {
    return all
      .filter((iv) => iv.status === "completed")
      .sort((a, b) => slotDate(b).getTime() - slotDate(a).getTime())
      .slice(0, 8);
  }, [all]);

  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (jobFilter ? 1 : 0);
  const selectedDayLabel = selectedDay
    ? selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : null;
  const isSelectedToday = selectedDay ? isSameDay(selectedDay, today) : false;

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-[10px]">Workspace · Calendar</div>
          <h1 className="display m-0" style={{ fontSize: 32 }}>
            Interviews.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)", margin: "8px 0 0", maxWidth: 720 }}>
            Scheduled, in progress, and ready for debrief — all in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <button type="button" className="btn btn-ghost">
            <Calendar className="h-3 w-3" /> Sync calendar
          </button>
          <button type="button" className="btn btn-primary">
            <Plus className="h-3 w-3" /> Schedule
          </button>
        </div>
      </div>

      {/* Week day strip */}
      <div
        className="panel mb-[22px] flex flex-wrap items-center gap-2"
        style={{ padding: 16 }}
      >
        {weekStrip.map((d) => {
          const isSelected = selectedDay ? isSameDay(d.date, selectedDay) : false;
          const dow = DAY_LABELS[d.date.getDay()];
          return (
            <button
              key={d.date.toISOString()}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : d.date)}
              className="text-center transition-all"
              style={{
                flex: "1 1 80px",
                padding: "10px 8px",
                borderRadius: 10,
                background: isSelected
                  ? "linear-gradient(135deg, rgba(99,102,241,.25), rgba(217,70,239,.18))"
                  : "rgba(255,255,255,.025)",
                border: `1px solid ${isSelected ? "rgba(99,102,241,.4)" : "var(--line)"}`,
                color: isSelected ? "#fff" : "var(--ink-2)",
                cursor: "pointer",
              }}
            >
              <div
                className="mono text-[10px] uppercase tracking-[0.14em]"
                style={{ color: isSelected ? "#c7d2fe" : "var(--ink-4)" }}
              >
                {dow}
              </div>
              <div className="text-lg font-semibold mt-0.5">{d.date.getDate()}</div>
              <div
                className="mono mt-1 text-[10px]"
                style={{ color: isSelected ? "#fff" : "var(--ink-4)" }}
              >
                {d.count} iv
              </div>
            </button>
          );
        })}
      </div>

      {/* Secondary toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn("btn", statusFilter === f.value ? "btn-primary" : "btn-ghost")}
              style={{ height: 30, fontSize: 12 }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Briefcase
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--ink-4)" }}
            />
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="input"
              style={{ height: 32, paddingLeft: 30, paddingRight: 28, fontSize: 12 }}
            >
              <option value="">All jobs</option>
              {jobs.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <ArrowDownUp
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--ink-4)" }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="input"
              style={{ height: 32, paddingLeft: 30, paddingRight: 28, fontSize: 12 }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex overflow-hidden" style={{ borderRadius: 10, border: "1px solid var(--line)" }}>
            {(["list", "calendar"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                title={v === "list" ? "List view" : "Calendar view"}
                className="flex h-8 w-9 items-center justify-center transition"
                style={
                  viewMode === v
                    ? {
                        background: "linear-gradient(135deg, #6366f1 0%, #d946ef 100%)",
                        color: "#fff",
                      }
                    : { background: "rgba(255,255,255,0.04)", color: "var(--ink-3)" }
                }
              >
                {v === "list" ? <LayoutList className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeFilters > 0 || selectedDay ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-4)" }}>
            Filtered by
          </span>
          {jobFilter ? (
            <span className="pill pill-indigo">
              <Briefcase className="h-3 w-3" /> {jobFilter}
              <button type="button" onClick={() => setJobFilter("")} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}
          {selectedDay ? (
            <span className="pill pill-fuchsia">
              <Calendar className="h-3 w-3" />
              {selectedDay.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              <button type="button" onClick={() => setSelectedDay(null)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setJobFilter("");
              setSelectedDay(null);
            }}
            className="text-[11px] underline-offset-2 hover:underline"
            style={{ color: "var(--ink-3)" }}
          >
            Clear all
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div
          className="panel panel-lg flex flex-col items-center justify-center gap-3 py-16"
          style={{ color: "var(--ink-3)" }}
        >
          <Calendar className="h-5 w-5 animate-pulse" style={{ color: "var(--indigo-2)" }} />
          <p className="text-sm font-medium">Loading interviews…</p>
        </div>
      ) : viewMode === "calendar" ? (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <MiniCalendar
            interviews={filtered}
            month={calMonth}
            onMonthChange={setCalMonth}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
          <div>
            {selectedDay ? (
              <>
                <div className="eyebrow mb-3">
                  {isSelectedToday ? "Today" : selectedDayLabel}
                  <span className="ml-2" style={{ color: "var(--ink-4)" }}>
                    · {sorted.length} interview{sorted.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {sorted.length === 0 ? (
                  <div
                    className="flex min-h-[160px] items-center justify-center px-4 text-sm"
                    style={{
                      border: "1px dashed var(--line-strong)",
                      borderRadius: 16,
                      background: "rgba(255,255,255,.02)",
                      color: "var(--ink-3)",
                    }}
                  >
                    No interviews on this day
                  </div>
                ) : (
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
                    {sorted.map((iv) => (
                      <InterviewCard key={iv._id} interview={iv} onDeleted={() => void refetch()} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div
                className="flex min-h-[200px] flex-col items-center justify-center gap-2"
                style={{
                  border: "1px dashed var(--line-strong)",
                  borderRadius: 16,
                  background: "rgba(255,255,255,.02)",
                  color: "var(--ink-3)",
                }}
              >
                <Calendar className="h-8 w-8" style={{ color: "var(--ink-4)" }} />
                <p className="text-sm">Pick a day to see interviews</p>
              </div>
            )}
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-sm"
          style={{
            border: "1px dashed var(--line-strong)",
            borderRadius: 16,
            background: "rgba(255,255,255,.02)",
            color: "var(--ink-3)",
            padding: 24,
          }}
        >
          <Calendar className="h-8 w-8" style={{ color: "var(--ink-4)" }} />
          <p className="font-medium" style={{ color: "#fff" }}>No interviews found</p>
          <p>
            {activeFilters > 0 || selectedDay ? (
              "Try clearing some filters."
            ) : (
              <>
                Schedule one from the <a href="/screenings" style={{ color: "var(--indigo-2)" }} className="hover:underline">Screenings</a> page.
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="eyebrow mb-[14px]">
            {selectedDay ? (
              <>
                {isSelectedToday ? "Today" : selectedDayLabel}
                <span className="ml-2" style={{ color: "var(--ink-4)" }}>
                  · {sorted.length} interview{sorted.length !== 1 ? "s" : ""}
                </span>
              </>
            ) : (
              `All interviews · ${sorted.length}`
            )}
          </div>
          <div className="grid gap-[14px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
            {sorted.map((iv) => (
              <InterviewCard key={iv._id} interview={iv} onDeleted={() => void refetch()} />
            ))}
          </div>
        </>
      )}

      {/* Awaiting debrief */}
      {debriefRows.length > 0 ? (
        <>
          <div className="eyebrow mb-[14px] mt-7">Awaiting debrief</div>
          <div className="panel overflow-hidden" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Interview</th>
                  <th>Recruiter</th>
                  <th>Outcome</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {debriefRows.map((iv) => {
                  const slot = iv.confirmedSlot ?? iv.proposedSlots?.[0];
                  return (
                    <tr key={iv._id}>
                      <td>
                        <div className="flex items-center gap-[10px]">
                          <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                            {initialsOf(iv.candidateName)}
                          </span>
                          <span className="font-medium" style={{ color: "#fff" }}>
                            {iv.candidateName || "Candidate"}
                          </span>
                        </div>
                      </td>
                      <td>
                        {iv.title || iv.type || "Interview"}{" "}
                        <span style={{ color: "var(--ink-4)" }}>
                          · {slot ? relativeDay(slot.start) : "—"}
                        </span>
                      </td>
                      <td style={{ color: "var(--ink-2)" }}>{iv.jobTitle || "—"}</td>
                      <td>
                        <span className="pill pill-amber">{iv.notes ? "Has notes" : "Pending feedback"}</span>
                      </td>
                      <td>
                        <a
                          href={`/interviews?highlight=${iv._id}`}
                          className="btn btn-primary"
                          style={{ height: 28, fontSize: 11.5 }}
                        >
                          Submit feedback
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
