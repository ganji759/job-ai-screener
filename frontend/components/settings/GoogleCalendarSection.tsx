"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, ExternalLink, Loader2, Unlink, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import {
  useDisconnectCalendarMutation,
  useGetCalendarAuthUrlQuery,
  useGetCalendarStatusQuery,
} from "../../store/api/calendarApi";

export const GoogleCalendarSection = () => {
  const searchParams = useSearchParams();

  const { data: status, isLoading: statusLoading } = useGetCalendarStatusQuery();
  const { data: authData, isFetching: urlFetching } = useGetCalendarAuthUrlQuery(undefined, {
    skip: !status?.configured || status?.connected,
  });
  const [disconnect, { isLoading: disconnecting }] = useDisconnectCalendarMutation();

  // Handle redirect-back result from Google OAuth
  useEffect(() => {
    const result = searchParams.get("google_cal");
    if (result === "success") toast.success("Google Calendar connected successfully!");
    if (result === "error")   toast.error("Could not connect Google Calendar. Please try again.");
  }, [searchParams]);

  const handleConnect = () => {
    if (!authData?.url) return;
    window.location.href = authData.url;
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google Calendar? Future interviews won't be added to your calendar.")) return;
    try {
      await disconnect().unwrap();
      toast.success("Google Calendar disconnected.");
    } catch {
      toast.error("Could not disconnect. Please try again.");
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking connection…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Integrations</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connect third-party services to enhance your hiring workflow.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/40"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          {/* Left — info */}
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
              <Calendar className="h-6 w-6 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-50">Google Calendar</p>
                {status?.connected ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    <XCircle className="h-3 w-3" /> Not connected
                  </span>
                )}
              </div>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                When connected, scheduling an interview automatically creates a Google Calendar event,
                generates a Google Meet link, and sends the candidate a calendar invite — in addition
                to the Resend email with .ics attachment.
              </p>

              {status?.connected ? (
                <ul className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {[
                    "Calendar event created in your primary Google Calendar",
                    "Google Meet link auto-generated for video interviews",
                    "Candidate receives a Google Calendar invite",
                    "Resend email still sent with .ics attachment",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}

              {!status?.configured ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  Google Calendar is not configured on this server. Ask your administrator to set
                  <code className="mx-1 font-mono">GOOGLE_CLIENT_ID</code>,
                  <code className="mx-1 font-mono">GOOGLE_CLIENT_SECRET</code>,
                  <code className="mx-1 font-mono">GOOGLE_REDIRECT_URI</code>, and
                  <code className="mx-1 font-mono">ENCRYPTION_KEY</code>.
                </p>
              ) : null}
            </div>
          </div>

          {/* Right — action */}
          <div className="shrink-0">
            {status?.connected ? (
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                disabled={disconnecting}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={!status?.configured || urlFetching || !authData?.url}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {urlFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Connect Google Calendar
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
