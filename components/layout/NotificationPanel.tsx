"use client";

import Link from "next/link";
import { Bell, Briefcase, CheckCheck, Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useDeleteNotificationMutation, useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from "../../store/api/notificationsApi";
import type { Notification } from "../../types";
import { cn } from "../../lib/utils";

type TabType = "all" | "unread" | "screening" | "system";

const iconByType: Record<Notification["type"], React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCheck,
  warning: TriangleAlert,
  error: TriangleAlert,
};

const colorByType: Record<Notification["type"], string> = {
  info: "text-brand-600 bg-brand-50",
  success: "text-emerald-600 bg-emerald-50",
  warning: "text-amber-600 bg-amber-50",
  error: "text-red-600 bg-red-50",
};

const getRelativeTime = (value: string): string => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const NotificationPanel = () => {
  const [tab, setTab] = useState<TabType>("all");
  const { data } = useGetNotificationsQuery({ page: 1, limit: 30 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const list = useMemo(() => {
    const base = data?.notifications ?? [];
    if (tab === "unread") return base.filter((n) => !n.readAt);
    if (tab === "screening") return base.filter((n) => /screening/i.test(n.title) || /screening/i.test(n.message));
    if (tab === "system") return base.filter((n) => /system|account|security/i.test(n.title) || /system|account|security/i.test(n.message));
    return base;
  }, [data?.notifications, tab]);

  return (
    <div className="w-[380px] max-w-[92vw] overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
        <button onClick={() => void markAllRead()} className="text-xs font-semibold text-brand-700 hover:text-brand-800">
          Mark all read
        </button>
      </div>
      <div className="flex gap-1 border-b border-brand-100 px-3 py-2 dark:border-slate-700">
        {(["all", "unread", "screening", "system"] as const).map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition",
              tab === name ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-700 dark:text-slate-200",
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="max-h-[420px] overflow-y-auto p-3">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-200 px-4 py-10 text-center">
            <Bell className="h-6 w-6 text-brand-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">All caught up!</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">No notifications in this category.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((item) => {
              const Icon = iconByType[item.type];
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => void markRead(item._id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition hover:bg-brand-50/60 dark:hover:bg-slate-700",
                    item.readAt ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30" : "border-brand-200 bg-white dark:border-slate-600 dark:bg-slate-900/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {!item.readAt ? <span className="mt-2 h-2 w-2 rounded-full bg-brand-500" /> : <span className="mt-2 h-2 w-2 rounded-full bg-transparent" />}
                    <span className={cn("mt-0.5 rounded-full p-1.5", colorByType[item.type])}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                        <span className="text-[10px] text-slate-400">{getRelativeTime(item.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{item.message}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteNotification(item._id);
                          }}
                          className="text-[11px] text-slate-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t border-brand-100 px-4 py-2 text-right dark:border-slate-700">
        <Link href="/notifications" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">
          <Briefcase className="h-3.5 w-3.5" />
          View all notifications
        </Link>
      </div>
    </div>
  );
};
