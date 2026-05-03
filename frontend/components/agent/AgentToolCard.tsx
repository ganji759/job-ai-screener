"use client";

import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useState } from "react";
import type { ToolCall } from "../../store/api/agentApi";

const TOOL_LABELS: Record<string, string> = {
  list_jobs: "Listed jobs",
  get_job_details: "Fetched job details",
  get_applicants: "Fetched applicants",
  list_screenings: "Listed screenings",
  get_screening_results: "Fetched screening results",
  list_interviews: "Listed interviews",
  get_pipeline_summary: "Fetched pipeline summary",
  schedule_interview: "Scheduled interview",
};

export const AgentToolCard = ({ toolCall }: { toolCall: ToolCall }) => {
  const [expanded, setExpanded] = useState(false);

  const label = TOOL_LABELS[toolCall.name] ?? toolCall.name.replaceAll("_", " ");
  const isError = toolCall.result != null && typeof toolCall.result === "object" && "error" in (toolCall.result as object);

  return (
    <div className="my-1 rounded-md border border-slate-200 bg-slate-50 text-xs dark:border-slate-700 dark:bg-slate-800/50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Wrench className={`h-3 w-3 shrink-0 ${isError ? "text-red-500" : "text-indigo-500"}`} />
        <span className={`font-medium ${isError ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}>
          {label}
        </span>
        {expanded ? (
          <ChevronDown className="ml-auto h-3 w-3 text-slate-400" />
        ) : (
          <ChevronRight className="ml-auto h-3 w-3 text-slate-400" />
        )}
      </button>
      {expanded && (
        <pre className="overflow-x-auto border-t border-slate-200 p-3 text-[10px] leading-relaxed text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {JSON.stringify({ args: toolCall.args, result: toolCall.result }, null, 2)}
        </pre>
      )}
    </div>
  );
};
