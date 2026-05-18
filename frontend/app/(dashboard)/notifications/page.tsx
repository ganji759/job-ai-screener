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
    <div className="fade-up space-y-6">
      <PageHeader
        eyebrow="Workspace · Account"
        title="Notifications"
        subtitle="Pipeline events, agent decisions, mentions."
        right={
          <>
            <button
              type="button"
              onClick={() => {
                markNotificationsReadLocally(notifications.map((n) => n._id));
                void markAllRead();
              }}
              disabled={isMarkingAll || unreadCount === 0}
              className="btn btn-primary disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
            <Button type="button" variant="secondary" disabled={notifications.length === 0 || isDeletingAll} onClick={() => setConfirmClear(true)}>
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const countBadge = t.id === "unread" ? unreadCount : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn("btn", tab === t.id ? "btn-primary" : "btn-ghost")}
              style={{ height: 32, fontSize: 12 }}
            >
              {t.label}
              {countBadge !== null && countBadge > 0 ? (
                <span
                  className="mono rounded-full px-1.5 py-0.5 text-[10px]"
                  style={
                    tab === t.id
                      ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                      : { background: "rgba(255,255,255,0.06)", color: "var(--ink-2)" }
                  }
                >
                  {countBadge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)}>
        <h3 className="display text-lg" style={{ color: "#fff" }}>Are you sure you want to delete all notifications?</h3>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>This cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" loading={isDeletingAll} onClick={() => void handleClearAll()}>
            Confirm
          </Button>
        </div>
      </Modal>

      {isLoading ? (
        <div className="panel panel-lg text-center text-sm" style={{ color: "var(--ink-3)" }}>Loading notifications...</div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center"
          style={{ border: "1px dashed var(--line-strong)", background: "rgba(255,255,255,.02)" }}
        >
          <Bell className="mb-3 h-14 w-14" strokeWidth={1.25} style={{ color: "var(--ink-4)" }} />
          <p className="text-lg font-semibold" style={{ color: "#fff" }}>{notifications.length === 0 ? "No notifications yet" : emptyMessage}</p>
          <p className="mt-2 max-w-md text-sm" style={{ color: "var(--ink-3)" }}>You will be notified when screenings complete, jobs are updated, or applicants are uploaded.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {GROUP_ORDER.map((group) => {
            const items = grouped[group];
            if (!items.length) return null;
            return (
              <section key={group}>
                <div className="mb-3 flex items-center gap-2 py-1">
                  <span className="mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--ink-4)" }}>{GROUP_LABEL[group]}</span>
                  <div className="h-px flex-1" style={{ background: "var(--line)" }} />
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
          <button type="button" onClick={() => setLimit((l) => l + 20)} className="btn btn-ghost">
            Load more notifications
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
