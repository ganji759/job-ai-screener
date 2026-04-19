"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CheckCheck, Info, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../../store/api/notificationsApi";
import type { Notification } from "../../types";
import { cn } from "../../lib/utils";
import {
  getLocalReadIds,
  getLocalUnreadIds,
  markNotificationReadLocally,
  markNotificationsReadLocally,
  subscribeLocalReadUpdates,
} from "../../lib/notificationReadState";
import { getNotificationHref } from "../../lib/notificationUi";

const iconByType: Record<Notification["type"], React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCheck,
  warning: TriangleAlert,
  error: TriangleAlert,
};

const colorByType: Record<Notification["type"], string> = {
  info: "text-brand-600 bg-brand-50 dark:bg-brand-950/40",
  success: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
  warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
  error: "text-red-600 bg-red-50 dark:bg-red-950/40",
};

const getRelativeTime = (value: string): string => {
  const diff = Date.now() - new Date(value).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const NotificationPanel = ({ onClose }: { onClose?: () => void }) => {
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [localUnreadIds, setLocalUnreadIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { data } = useGetNotificationsQuery({ page: 1, limit: 100 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  useEffect(() => {
    setLocalReadIds(getLocalReadIds());
    setLocalUnreadIds(getLocalUnreadIds());
    return subscribeLocalReadUpdates(() => {
      setLocalReadIds(getLocalReadIds());
      setLocalUnreadIds(getLocalUnreadIds());
    });
  }, []);

  const items = useMemo(() => {
    const base = (data?.notifications ?? []).map((item) =>
      localUnreadIds.has(item._id)
        ? { ...item, readAt: null }
        : localReadIds.has(item._id)
          ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
          : item,
    );
    return base.slice(0, 5);
  }, [data?.notifications, localReadIds, localUnreadIds]);

  const handleMarkAllRead = async () => {
    const ids = (data?.notifications ?? []).map((item) => item._id);
    if (!ids.length) return;
    markNotificationsReadLocally(ids);
    try {
      await markAllRead().unwrap();
    } catch {
      /* ignore */
    }
  };

  const openItem = async (n: Notification) => {
    markNotificationReadLocally(n._id);
    onClose?.();
    router.push(getNotificationHref(n));
    try {
      await markRead(n._id).unwrap();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="w-[min(100vw-2rem,380px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
        <button
          type="button"
          disabled={markingAll || !items.length}
          onClick={() => void handleMarkAllRead()}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 dark:text-brand-400"
        >
          Mark all as read
        </button>
      </div>
      <div className="max-h-[320px] overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 px-4 py-8 text-center">
            <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No notifications yet</p>
            <p className="text-xs text-slate-400">You&apos;re all caught up.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = iconByType[item.type];
              const unread = !item.readAt || localUnreadIds.has(item._id);
              return (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => void openItem(item)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition duration-200 ease-out",
                      unread ? "bg-brand-50/80 hover:bg-brand-100/80 dark:bg-slate-700/50 dark:hover:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700/80",
                    )}
                  >
                    <span className={cn("mt-0.5 shrink-0 rounded-full p-1.5", colorByType[item.type])}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-xs font-semibold text-slate-900 dark:text-slate-100">{item.title}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">{getRelativeTime(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-700">
        <Link
          href="/notifications"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          View all notifications
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};
