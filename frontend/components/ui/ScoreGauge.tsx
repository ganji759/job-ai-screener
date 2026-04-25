"use client";

import { useEffect, useMemo, useState } from "react";

export const ScoreGauge = ({ value }: { value: number }) => {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setAnimated(value), 50);
    return () => window.clearTimeout(id);
  }, [value]);

  const color = value > 70 ? "#22c55e" : value > 40 ? "#f59e0b" : "#ef4444";
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, animated)) / 100) * circumference;
  const centerLabel = useMemo(() => `${Math.round(animated)}`, [animated]);

  return (
    <div className="relative inline-flex h-32 w-32 items-center justify-center">
      <svg viewBox="0 0 130 130" className="h-32 w-32 -rotate-90">
        <circle cx="65" cy="65" r={radius} stroke="#e2e8f0" strokeWidth="10" fill="none" />
        <circle cx="65" cy="65" r={radius} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className="absolute text-2xl font-bold text-slate-900 dark:text-slate-100">{centerLabel}</span>
    </div>
  );
};
