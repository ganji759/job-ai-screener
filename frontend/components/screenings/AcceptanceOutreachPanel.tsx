"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useSendAcceptanceEmailsMutation } from "../../store/api/screeningsApi";
import { getRtkQueryErrorMessage } from "../../lib/rtkError";

export type ApprovedCandidateRow = {
  id: string;
  name: string;
  email: string;
  congratsEmailSentAt?: string;
};

type Props = {
  screeningId: string;
  jobTitle?: string;
  approved: ApprovedCandidateRow[];
};

export function AcceptanceOutreachPanel({ screeningId, jobTitle, approved }: Props) {
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sendEmails, { isLoading }] = useSendAcceptanceEmailsMutation();

  const handleSend = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 16) {
      toast.error("Write a congratulations message (at least 16 characters).");
      return;
    }
    const toastId = toast.loading("Sending emails…");
    try {
      const res = await sendEmails({
        id: screeningId,
        message: trimmed,
        subject: subject.trim() || undefined,
      }).unwrap();
      const n = res.sent ?? 0;
      const errs = res.errors?.length ? ` Some addresses failed: ${res.errors.slice(0, 3).join("; ")}` : "";
      toast.success(`Sent ${n} congratulations email(s).${errs}`, { id: toastId });
      setMessage("");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err, "Could not send emails."), { id: toastId });
    }
  };

  if (approved.length === 0) return null;

  return (
    <Card className="border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Accepted candidates</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              You marked {approved.length} shortlisted candidate{approved.length === 1 ? "" : "s"} as{" "}
              <span className="font-medium text-emerald-800 dark:text-emerald-300">Accept</span>
              {jobTitle ? ` for ${jobTitle}` : ""}. Send one congratulations email to each, with your own message.
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Candidates you <span className="font-medium">Reject</span> from the shortlist receive an automatic standard rejection email when you save that decision.
            </p>
          </div>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white/80 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900/50">
        {approved.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <span className="font-medium text-slate-900 dark:text-slate-100">{row.name}</span>
            <span className="text-slate-600 dark:text-slate-400">{row.email || "—"}</span>
            {row.congratsEmailSentAt ? (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Congrats sent {new Date(row.congratsEmailSentAt).toLocaleString()}
              </span>
            ) : (
              <span className="text-xs text-amber-700 dark:text-amber-400">Not emailed yet</span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400" htmlFor={`accept-subject-${screeningId}`}>
            Email subject <span className="font-normal normal-case text-slate-500">(optional)</span>
          </label>
          <input
            id={`accept-subject-${screeningId}`}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`e.g. Great news — ${jobTitle ?? "next steps"}`}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400" htmlFor={`accept-msg-${screeningId}`}>
            Congratulations message
          </label>
          <textarea
            id={`accept-msg-${screeningId}`}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a warm message to all accepted candidates. It will be sent to each person individually with their name."
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={() => void handleSend()} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            <span className="ml-2">Send email to all accepted</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
