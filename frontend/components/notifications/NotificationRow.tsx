"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Briefcase, Shield, Sparkles, Star, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Notification } from "../../types";
import { classifyNotification, formatRelativeNotificationTime, getNotificationHref, type NotificationVisualKind } from "../../lib/notificationUi";
import { cn } from "../../lib/utils";

const kindIcon = (kind: NotificationVisualKind) => {
  switch (kind) {
    case "screening":
    case "shortlist":
      return { Icon: Sparkles, bg: "bg-blue-100", color: "text-blue-600" };
    case "screening_failed":
      return { Icon: AlertTriangle, bg: "bg-red-100", color: "text-red-600" };
    case "job":
      return { Icon: Briefcase, bg: "bg-emerald-100", color: "text-emerald-600" };
    case "job_closed":
      return { Icon: Briefcase, bg: "bg-slate-100", color: "text-slate-600" };
    case "applicant_upload":
      return { Icon: Upload, bg: "bg-amber-100", color: "text-amber-600" };
    case "system":
      return { Icon: Shield, bg: "bg-slate-100", color: "text-slate-600" };
    default:
      return { Icon: Sparkles, bg: "bg-blue-100", color: "text-blue-600" };
  }
};

export const NotificationRow = ({
  notification,
  unread,
  timeLabel,
  listId,
  onMarkRead,
  onDelete,
  marking,
  deleting,
}: {
  notification: Notification;
  unread: boolean;
  timeLabel: string;
  listId?: string;
  onMarkRead: () => void;
  onDelete: () => void;
  marking: boolean;
  deleting: boolean;
}) => {
  const router = useRouter();
  const kind = classifyNotification(notification);
  const { Icon, bg, color } =
    kind === "shortlist"
      ? { Icon: Star, bg: "bg-blue-100", color: "text-blue-600" }
      : kindIcon(kind);

  const href = getNotificationHref(notification);

  const onCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    router.push(href);
  };

  return (
    <motion.div
      id={listId}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative cursor-pointer rounded-xl border p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-colors duration-300",
        unread ? "border-l-[3px] border-l-blue-500 bg-[#eff6ff]" : "border-slate-200/80 bg-white hover:bg-slate-50",
      )}
      onClick={onCardClick}
    >
      {unread ? <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-blue-500" aria-hidden /> : null}
      <div className="flex gap-3 pl-2">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", bg)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm", unread ? "font-bold text-blue-900" : "font-medium text-slate-900")}>{notification.title}</p>
          <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
          <p className="mt-2 text-xs text-slate-400">{timeLabel}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
          {unread ? (
            <button
              type="button"
              disabled={marking}
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Mark read
            </button>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Read</span>
          )}
          <button
            type="button"
            disabled={deleting}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
