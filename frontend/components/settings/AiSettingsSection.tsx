"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../ui/Button";
import { defaultAiPrefs, loadAiPrefs, saveAiPrefs, type AiPrefs } from "../../lib/settingsStorage";
import { Divider, SectionHeader, SwitchToggle } from "./primitives";
import { cn } from "../../lib/utils";

export const AiSettingsSection = () => {
  const [ai, setAi] = useState<AiPrefs>(defaultAiPrefs);

  useEffect(() => {
    setAi(loadAiPrefs());
  }, []);

  const total = ai.weightSkills + ai.weightExperience + ai.weightEducation;
  const validTotal = total === 100;

  const setWeight = (key: keyof Pick<AiPrefs, "weightSkills" | "weightExperience" | "weightEducation">, value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    setAi((prev) => ({ ...prev, [key]: v }));
  };

  const save = () => {
    if (!validTotal) {
      toast.error("Weights must add up to 100%");
      return;
    }
    saveAiPrefs(ai);
    toast.success("AI preferences saved");
  };

  const shortlistCards: { value: 10 | 20; label: string }[] = [
    { value: 10, label: "Top 10" },
    { value: 20, label: "Top 20" },
  ];

  const explanationCards: { value: AiPrefs["explanationLevel"]; title: string; desc: string }[] = [
    { value: "brief", title: "Brief", desc: "Short 1–2 line summary per candidate." },
    { value: "detailed", title: "Detailed", desc: "Full breakdown with strengths, gaps, recommendation." },
    { value: "executive", title: "Executive", desc: "One sentence verdict only." },
  ];

  const barSegments = useMemo(
    () => [
      { pct: ai.weightSkills, color: "bg-blue-500" },
      { pct: ai.weightExperience, color: "bg-indigo-500" },
      { pct: ai.weightEducation, color: "bg-violet-500" },
    ],
    [ai.weightEducation, ai.weightExperience, ai.weightSkills],
  );

  return (
    <div>
      <SectionHeader title="AI Screening Preferences" subtitle="Customize how the AI evaluates and scores candidates" />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Default Shortlist Size</h3>
      <p className="mt-1 text-sm text-slate-500">How many candidates the AI shortlists by default in each screening run</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {shortlistCards.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setAi((p) => ({ ...p, shortlistSize: c.value }))}
            className={cn(
              "rounded-xl border-2 px-5 py-4 text-left transition",
              ai.shortlistSize === c.value ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-slate-300 dark:border-slate-600",
            )}
          >
            <p className="font-semibold text-slate-900 dark:text-slate-100">{c.label}</p>
          </button>
        ))}
      </div>

      <Divider />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Default Scoring Weights</h3>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Skills Match — {ai.weightSkills}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={ai.weightSkills}
            onChange={(e) => setWeight("weightSkills", Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-slate-700 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600 [&::-webkit-slider-thumb]:bg-white"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience — {ai.weightExperience}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={ai.weightExperience}
            onChange={(e) => setWeight("weightExperience", Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-slate-700 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600 [&::-webkit-slider-thumb]:bg-white"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Education — {ai.weightEducation}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={ai.weightEducation}
            onChange={(e) => setWeight("weightEducation", Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-slate-700 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600 [&::-webkit-slider-thumb]:bg-white"
          />
        </label>
      </div>
      <p className={cn("mt-3 text-sm font-medium", validTotal ? "text-slate-600" : "text-amber-600")}>Total: {total}%</p>
      {!validTotal ? <p className="text-sm font-semibold text-amber-600">Weights must add up to 100%</p> : null}
      <div className="mt-4 flex h-3 w-full max-w-xl overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        {barSegments.map((s, i) => (
          <div key={i} className={cn(s.color, "h-full transition-all duration-300")} style={{ width: `${s.pct}%` }} />
        ))}
      </div>

      <Divider />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Explanation Detail Level</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {explanationCards.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setAi((p) => ({ ...p, explanationLevel: c.value }))}
            className={cn(
              "relative rounded-xl border-2 p-4 text-left transition",
              ai.explanationLevel === c.value ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-slate-300 dark:border-slate-600",
            )}
          >
            {ai.explanationLevel === c.value ? (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">✓</span>
            ) : null}
            <p className="font-semibold text-slate-900 dark:text-slate-100">{c.title}</p>
            <p className="mt-1 text-xs text-slate-500">{c.desc}</p>
            {c.value === "detailed" ? (
              <p className="mt-2 text-[10px] font-semibold uppercase text-brand-600">Default</p>
            ) : null}
          </button>
        ))}
      </div>

      <Divider />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Auto-run Screening</h3>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            When enabled, AI screening starts automatically — you can still re-run manually.
          </p>
        </div>
        <SwitchToggle checked={ai.autoRunScreening} onChange={(v) => setAi((p) => ({ ...p, autoRunScreening: v }))} />
      </div>

      <div className="mt-8">
        <Button type="button" onClick={save} disabled={!validTotal}>
          Save AI Preferences
        </Button>
      </div>
    </div>
  );
};
