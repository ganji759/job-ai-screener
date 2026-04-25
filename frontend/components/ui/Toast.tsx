"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { removeToast } from "../../store/slices/uiSlice";
import { cn } from "../../lib/utils";

const tone: Record<"success" | "error" | "warning" | "info", string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-brand-200 bg-brand-50 text-brand-800",
};

export const ToastStack = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.ui.activeToasts);

  useEffect(() => {
    if (!items.length) return;
    const timers = items.map((item) =>
      window.setTimeout(() => {
        dispatch(removeToast(item.id));
      }, 4000),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [items, dispatch]);

  return (
    <div className="fixed right-4 top-4 z-[100] space-y-2">
      {items.map((item) => (
        <div key={item.id} className={cn("animate-slide-right w-80 rounded-xl border p-3 shadow-lg", tone[item.type])}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              {item.message ? <p className="mt-0.5 text-xs">{item.message}</p> : null}
            </div>
            <button onClick={() => dispatch(removeToast(item.id))}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
