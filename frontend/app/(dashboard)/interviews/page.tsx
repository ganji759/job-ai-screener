"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { useGetInterviewsQuery } from "../../../store/api/interviewsApi";
import { InterviewCard } from "../../../components/interviews/InterviewCard";
import { PageHeader } from "../../../components/layout/PageHeader";

type Filter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all",       label: "All"       },
  { value: "pending",   label: "Pending"   },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function InterviewsPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, refetch } = useGetInterviewsQuery(
    filter === "all" ? {} : { status: filter },
  );

  const interviews = data?.interviews ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        subtitle={`${data?.total ?? 0} scheduled`}
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === f.value
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center gap-2 text-slate-500">
          <Calendar className="h-5 w-5 animate-pulse" />
          Loading interviews…
        </div>
      ) : interviews.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-slate-500">
          <Calendar className="h-8 w-8 text-slate-300" />
          <p className="font-medium">No interviews found</p>
          <p className="text-sm text-slate-400">
            Schedule an interview from the{" "}
            <a href="/screenings" className="text-brand-600 hover:underline">
              Screenings
            </a>{" "}
            page once candidates are accepted.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {interviews.map((iv) => (
            <InterviewCard key={iv._id} interview={iv} onDeleted={() => void refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}
