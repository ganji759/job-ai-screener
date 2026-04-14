"use client";

import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../../../store/api/notificationsApi";

export default function NotificationsPage() {
  const { data, isLoading } = useGetNotificationsQuery({ page: 1, limit: 50 });
  const [markRead, { isLoading: isMarking }] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();
  const [deleteNotification, { isLoading: isDeleting }] = useDeleteNotificationMutation();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Notifications" subtitle="All backend events delivered to your recruiter workspace." />
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={isMarkingAll}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </button>
      </div>
      {isLoading ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-300">Loading notifications...</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(data?.notifications ?? []).length === 0 ? (
            <Card className="text-center">
              <Bell className="mx-auto mb-2 h-5 w-5 text-brand-500" />
              <p className="text-sm text-slate-500 dark:text-slate-300">No notifications yet.</p>
            </Card>
          ) : (
            data?.notifications.map((notification) => (
              <Card
                key={notification._id}
                className={`group flex items-start justify-between gap-3 transition ${notification.readAt ? "opacity-85" : "border-brand-300 bg-brand-50/40 dark:bg-brand-950/10"}`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!notification.readAt ? (
                    <button
                      type="button"
                      disabled={isMarking}
                      onClick={() => void markRead(notification._id)}
                      className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      Mark read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void deleteNotification(notification._id)}
                    className="rounded-full border border-red-200 bg-white p-2 text-red-500 transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-800 dark:hover:bg-red-950/30"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
