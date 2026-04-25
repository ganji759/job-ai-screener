"use client";

import { useEffect, useState } from "react";

export const ScoreBar = ({ label, value, max = 100, color = "bg-brand-600" }: { label: string; value: number; max?: number; color?: string }) => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setW(Math.max(0, Math.min(100, (value / max) * 100))), 50);
    return () => window.clearTimeout(id);
  }, [value, max]);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-200">{label}</span>
        <span className="font-semibold text-slate-800 dark:text-slate-100">{value} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
};
