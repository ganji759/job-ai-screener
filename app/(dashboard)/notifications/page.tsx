"use client";

import { AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, ChevronDown, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { NotificationRow } from "../../../components/notifications/NotificationRow";
import {
  useDeleteAllNotificationsMutation,
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../../../store/api/notificationsApi";
import {
  clearAllLocalNotificationState,
  getLocalReadIds,
  getLocalUnreadIds,
  markNotificationReadLocally,
  markNotificationsReadLocally,
  removeNotificationLocalState,
  subscribeLocalReadUpdates,
} from "../../../lib/notificationReadState";
import {
  formatRelativeNotificationTime,
  getTimeGroup,
  notificationMatchesTab,
  type TimeGroup,
} from "../../../lib/notificationUi";
import { cn } from "../../../lib/utils";
import type { Notification } from "../../../types";

const TABS = [
  { id: "all" as const, label: "All" },
  { id: "unread" as const, label: "Unread" },
  { id: "screenings" as const, label: "Screenings" },
  { id: "jobs" as const, label: "Jobs" },
  { id: "system" as const, label: "System" },
];

const GROUP_ORDER: TimeGroup[] = ["today", "yesterday", "week", "older"];
const GROUP_LABEL: Record<TimeGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  older: "Older",
};

export default function NotificationsPage() {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [limit, setLimit] = useState(20);
  const [, setMinutePulse] = useState(0);
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [localUnreadIds, setLocalUnreadIds] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);

  const { data, isLoading } = useGetNotificationsQuery({ page: 1, limit });
  const [markRead, { isLoading: isMarking }] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();
  const [deleteNotification, { isLoading: isDeleting }] = useDeleteNotificationMutation();
  const [deleteAllNotifications, { isLoading: isDeletingAll }] = useDeleteAllNotificationsMutation();

  useEffect(() => {
    setLocalReadIds(getLocalReadIds());
    setLocalUnreadIds(getLocalUnreadIds());
    return subscribeLocalReadUpdates(() => {
      setLocalReadIds(getLocalReadIds());
      setLocalUnreadIds(getLocalUnreadIds());
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setMinutePulse((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const isUnread = useCallback(
    (id: string, readAt?: string | null) => {
      if (localUnreadIds.has(id)) return true;
      if (localReadIds.has(id)) return false;
      return !readAt;
    },
    [localReadIds, localUnreadIds],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setHighlightedId(params.get("notificationId"));
  }, []);

  useEffect(() => {
    if (!highlightedId || !data?.notifications?.length) return;
    const target = data.notifications.find((n) => n._id === highlightedId);
    if (target && !target.readAt) {
      markNotificationReadLocally(highlightedId);
      void markRead(highlightedId);
    }
    const el = document.getElementById(`notification-${highlightedId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [data?.notifications, highlightedId, markRead]);

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;

  const unreadCount = useMemo(() => notifications.filter((n) => isUnread(n._id, n.readAt)).length, [isUnread, notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => notificationMatchesTab(n, tab, isUnread));
  }, [notifications, tab, isUnread]);

  const grouped = useMemo(() => {
    const buckets: Record<TimeGroup, Notification[]> = { today: [], yesterday: [], week: [], older: [] };
    const now = new Date();
    filtered.forEach((n) => {
      const g = getTimeGroup(new Date(n.createdAt), now);
      buckets[g].push(n);
    });
    return buckets;
  }, [filtered]);

  const emptyMessage =
    tab === "unread"
      ? "No unread notifications"
      : tab === "screenings"
        ? "No screenings notifications"
        : tab === "jobs"
          ? "No jobs notifications"
          : tab === "system"
            ? "No system notifications"
            : "No notifications yet";

  const handleClearAll = async () => {
    try {
      clearAllLocalNotificationState();
      await deleteAllNotifications().unwrap();
      setConfirmClear(false);
    } catch {
      /* toast optional */
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Notifications" subtitle="Stay updated on your screenings, jobs, and applicant activity" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              markNotificationsReadLocally(notifications.map((n) => n._id));
              void markAllRead();
            }}
            disabled={isMarkingAll || unreadCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
          <Button type="button" variant="secondary" className="rounded-full" disabled={notifications.length === 0 || isDeletingAll} onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const countBadge = t.id === "unread" ? unreadCount : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                tab === t.id ? "border-brand-600 bg-brand-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {t.label}
              {countBadge !== null && countBadge > 0 ? (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", tab === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700")}>{countBadge}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)}>
        <h3 className="text-lg font-semibold text-slate-900">Are you sure you want to delete all notifications?</h3>
        <p className="mt-2 text-sm text-slate-600">This cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" className="rounded-full" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" className="rounded-full" loading={isDeletingAll} onClick={() => void handleClearAll()}>
            Confirm
          </Button>
        </div>
      </Modal>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">Loading notifications...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <Bell className="mb-3 h-14 w-14 text-slate-300" strokeWidth={1.25} />
          <p className="text-lg font-semibold text-slate-800">{notifications.length === 0 ? "No notifications yet" : emptyMessage}</p>
          <p className="mt-2 max-w-md text-sm text-slate-500">You will be notified when screenings complete, jobs are updated, or applicants are uploaded.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {GROUP_ORDER.map((group) => {
            const items = grouped[group];
            if (!items.length) return null;
            return (
              <section key={group}>
                <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 bg-[#f8fafc] py-2 dark:bg-slate-900">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{GROUP_LABEL[group]}</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {items.map((notification) => (
                      <NotificationRow
                        key={notification._id}
                        listId={`notification-${notification._id}`}
                        notification={notification}
                        unread={isUnread(notification._id, notification.readAt)}
                        timeLabel={formatRelativeNotificationTime(new Date(notification.createdAt))}
                        marking={isMarking}
                        deleting={isDeleting}
                        onMarkRead={() => {
                          markNotificationReadLocally(notification._id);
                          void markRead(notification._id);
                        }}
                        onDelete={() => {
                          removeNotificationLocalState(notification._id);
                          void deleteNotification(notification._id);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!isLoading && notifications.length > 0 && notifications.length < total ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setLimit((l) => l + 20)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Load more notifications
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
