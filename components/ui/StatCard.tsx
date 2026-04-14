"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  trendValue?: string;
  color?: string;
  onClick?: () => void;
  loading?: boolean;
}

export const StatCard = ({ title, value, icon: Icon, trend = "up", trendValue = "+0%", color = "bg-brand-50 text-brand-700", onClick, loading }: StatCardProps) => {
  const [display, setDisplay] = useState(0);
  const dir = trend === "up" ? "text-emerald-600" : "text-red-600";

  useEffect(() => {
    if (loading) return;
    let current = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const id = window.setInterval(() => {
      current += step;
      if (current >= value) {
        setDisplay(value);
        window.clearInterval(id);
      } else {
        setDisplay(current);
      }
    }, 20);
    return () => window.clearInterval(id);
  }, [value, loading]);

  const content = useMemo(
    () =>
      loading ? (
        <div className="animate-shimmer h-16 rounded-xl" />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className={cn("rounded-xl p-2", color)}>
              <Icon className="h-4 w-4" />
            </span>
            <span className={cn("text-xs font-semibold", dir)}>{trendValue}</span>
          </div>
          <p className="mt-3 text-xs uppercase text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{display}</p>
        </>
      ),
    [Icon, color, dir, loading, title, trendValue, display],
  );

  return (
    <motion.button whileHover={{ y: -2, scale: 1.02 }} onClick={onClick} className="w-full rounded-2xl border border-brand-100 bg-white p-4 text-left shadow-brand-sm dark:border-slate-700 dark:bg-slate-800">
      {content}
    </motion.button>
  );
};
