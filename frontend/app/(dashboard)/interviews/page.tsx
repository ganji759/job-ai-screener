"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  X,
} from "lucide-react";
import { useGetInterviewsQuery } from "../../../store/api/interviewsApi";
import type { Interview } from "../../../store/api/interviewsApi";
import { InterviewCard } from "../../../components/interviews/InterviewCard";
import { PageHeader } from "../../../components/layout/PageHeader";
import { cn } from "../../../lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";
type SortKey = "upcoming" | "date-desc" | "name-asc";
type ViewMode = "list" | "calendar";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "All"       },
  { value: "pending",   label: "Pending"   },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "upcoming",   label: "Upcoming first" },
  { value: "date-desc",  label: "Newest first"   },
  { value: "name-asc",   label: "Name A → Z"     },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function slotDate(iv: Interview): Date {
  const s = iv.confirmedSlot ?? iv.proposedSlots[0];
  return s ? new Date(s.start) : new Date(iv.createdAt);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// ── Mini calendar ─────────────────────────────────────────────────────────────

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
  const year  = month.getFullYear();
  const mon   = month.getMonth();

  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : new Date(year, mon, i - firstDay + 1),
  );

  const countOnDay = (d: Date) =>
    interviews.filter((iv) => isSameDay(slotDate(iv), d)).length;

  const today = new Date();

  return (
    <div className="surface-card overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, mon - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.07]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {MONTHS[mon]} {year}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, mon + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.07]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-black/[0.04] dark:border-white/[0.04]">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 p-2 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const count   = countOnDay(day);
          const isToday = isSameDay(day, today);
          const isSel   = selectedDay ? isSameDay(day, selectedDay) : false;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(isSel ? null : day)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl py-1.5 text-sm transition",
                isSel
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md"
                  : isToday
                    ? "bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]",
                count > 0 && !isSel ? "font-semibold" : "",
              )}
            >
              <span className={cn("text-xs leading-none", isToday && !isSel ? "font-bold" : "")}>
                {day.getDate()}
              </span>
              {count > 0 ? (
                <span className={cn(
                  "mt-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none",
                  isSel
                    ? "bg-white/25 text-white"
                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
                )}>
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InterviewsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [jobFilter,    setJobFilter]    = useState("");
  const [sortBy,       setSortBy]       = useState<SortKey>("upcoming");
  const [viewMode,     setViewMode]     = useState<ViewMode>("list");
  const [calMonth,     setCalMonth]     = useState(() => new Date());
  const [selectedDay,  setSelectedDay]  = useState<Date | null>(null);

  const { data, isLoading, refetch } = useGetInterviewsQuery({ limit: 100 });
  const all = data?.interviews ?? [];

  // Unique job titles for the job filter dropdown
  const jobs = useMemo(
    () => [...new Set(all.map((iv) => iv.jobTitle))].sort(),
    [all],
  );

  // Apply status + job + selected-day filters
  const filtered = useMemo(() => {
    let list = all;
    if (statusFilter !== "all") list = list.filter((iv) => iv.status === statusFilter);
    if (jobFilter)              list = list.filter((iv) => iv.jobTitle === jobFilter);
    if (selectedDay)            list = list.filter((iv) => isSameDay(slotDate(iv), selectedDay));
    return list;
  }, [all, statusFilter, jobFilter, selectedDay]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "upcoming")  return slotDate(a).getTime() - slotDate(b).getTime();
      if (sortBy === "date-desc") return slotDate(b).getTime() - slotDate(a).getTime();
      if (sortBy === "name-asc")  return a.candidateName.localeCompare(b.candidateName);
      return 0;
    });
  }, [filtered, sortBy]);

  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (jobFilter ? 1 : 0) + (selectedDay ? 1 : 0);

  return (
    <div className="fade-up space-y-5">
      <PageHeader
        eyebrow="Workspace · Conversations"
        title="Interviews"
        subtitle={`${data?.total ?? 0} scheduled · live, upcoming, and ready for debrief.`}
      />

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn("btn", statusFilter === f.value ? "btn-primary" : "btn-ghost")}
              style={{ height: 32, fontSize: 12 }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Job filter */}
          <div className="relative">
            <Briefcase className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--ink-4)" }} />
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="input"
              style={{ height: 32, paddingLeft: 30, paddingRight: 28, fontSize: 12 }}
            >
              <option value="">All jobs</option>
              {jobs.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowDownUp className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--ink-4)" }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="input"
              style={{ height: 32, paddingLeft: 30, paddingRight: 28, fontSize: 12 }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div
            className="flex overflow-hidden"
            style={{ borderRadius: 10, border: "1px solid var(--line)" }}
          >
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

      {/* Active filter chips */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Filtered by:</span>
          {jobFilter && (
            <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              <Briefcase className="h-3 w-3" /> {jobFilter}
              <button type="button" onClick={() => setJobFilter("")}><X className="h-3 w-3" /></button>
            </span>
          )}
          {selectedDay && (
            <span className="flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
              <Calendar className="h-3 w-3" />
              {selectedDay.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              <button type="button" onClick={() => setSelectedDay(null)}><X className="h-3 w-3" /></button>
            </span>
          )}
          <button
            type="button"
            onClick={() => { setStatusFilter("all"); setJobFilter(""); setSelectedDay(null); }}
            className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center gap-2 text-slate-500">
          <Calendar className="h-5 w-5 animate-pulse" />
          Loading interviews…
        </div>
      ) : viewMode === "calendar" ? (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Calendar */}
          <MiniCalendar
            interviews={filtered}
            month={calMonth}
            onMonthChange={setCalMonth}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />

          {/* Day panel */}
          <div>
            {selectedDay ? (
              <>
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  <span className="ml-2 font-normal text-slate-400">· {sorted.length} interview{sorted.length !== 1 ? "s" : ""}</span>
                </p>
                {sorted.length === 0 ? (
                  <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
                    No interviews on this day
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sorted.map((iv) => (
                      <InterviewCard key={iv._id} interview={iv} onDeleted={() => void refetch()} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 text-slate-400 dark:border-slate-700">
                <Calendar className="h-8 w-8 text-slate-300" />
                <p className="text-sm">Pick a day to see interviews</p>
              </div>
            )}
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-slate-500">
          <Calendar className="h-8 w-8 text-slate-300" />
          <p className="font-medium">No interviews found</p>
          <p className="text-sm text-slate-400">
            {activeFilters > 0
              ? "Try clearing some filters."
              : <>Schedule one from the <a href="/screenings" className="text-brand-600 hover:underline">Screenings</a> page.</>
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((iv) => (
            <InterviewCard key={iv._id} interview={iv} onDeleted={() => void refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}
