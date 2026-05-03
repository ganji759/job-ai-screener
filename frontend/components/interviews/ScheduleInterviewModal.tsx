"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, ExternalLink, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { InterviewType } from "../../store/api/interviewsApi";
import { useCreateInterviewMutation } from "../../store/api/interviewsApi";
import { useGetCalendarStatusQuery } from "../../store/api/calendarApi";

export type ScheduleInterviewTarget = {
  candidateId: string;
  applicantId: string;
  jobId: string;
  screeningId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
};

type Slot = { date: string; startTime: string; endTime: string };

const emptySlot = (): Slot => ({ date: "", startTime: "", endTime: "" });

const toIso = (date: string, time: string): string => `${date}T${time}:00.000Z`;

export const ScheduleInterviewModal = ({
  open,
  target,
  onClose,
  onScheduled,
}: {
  open: boolean;
  target: ScheduleInterviewTarget | null;
  onClose: () => void;
  onScheduled?: () => void;
}) => {
  const [createInterview, { isLoading }] = useCreateInterviewMutation();
  const { data: calendarStatus } = useGetCalendarStatusQuery();

  const [interviewType, setInterviewType] = useState<InterviewType>("video");
  const [slots, setSlots] = useState<Slot[]>([emptySlot()]);
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");

  const isCalendarConnected = calendarStatus?.connected ?? false;

  const reset = () => {
    setInterviewType("video");
    setSlots([emptySlot()]);
    setMeetingLink("");
    setNotes("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addSlot = () => {
    if (slots.length >= 3) return;
    setSlots((prev) => [...prev, emptySlot()]);
  };

  const removeSlot = (i: number) => setSlots((prev) => prev.filter((_, idx) => idx !== i));

  const updateSlot = (i: number, key: keyof Slot, value: string) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;

    const validSlots = slots.filter((s) => s.date && s.startTime && s.endTime);
    if (validSlots.length === 0) {
      toast.error("Add at least one complete time slot.");
      return;
    }

    for (const s of validSlots) {
      if (s.startTime >= s.endTime) {
        toast.error("End time must be after start time for each slot.");
        return;
      }
    }

    const title = `Interview — ${target.candidateName} for ${target.jobTitle}`;

    try {
      await createInterview({
        ...target,
        title,
        type: interviewType,
        proposedSlots: validSlots.map((s) => ({
          start: toIso(s.date, s.startTime),
          end:   toIso(s.date, s.endTime),
        })),
        meetingLink: meetingLink.trim() || undefined,
        notes:       notes.trim() || undefined,
      }).unwrap();

      const successMsg = isCalendarConnected
        ? "Interview scheduled — Google Calendar event created & invite sent."
        : "Interview scheduled and invite sent.";
      toast.success(successMsg);
      reset();
      onScheduled?.();
      onClose();
    } catch {
      toast.error("Could not schedule interview. Check that the candidate has a valid email.");
    }
  };

  if (!target) return null;

  return (
    <Modal open={open} onClose={handleClose} size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Schedule interview</h3>
            <p className="text-sm text-slate-500">{target.candidateName} · {target.jobTitle}</p>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Google Calendar status banner */}
        {calendarStatus?.configured ? (
          isCalendarConnected ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">
              <Calendar className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold">Google Calendar connected</span> — a calendar event
                with Google Meet will be created automatically.
              </span>
              <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/40">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">
                Google Calendar not connected. Only a Resend email + .ics will be sent.
              </span>
              <Link
                href="/settings?section=integrations"
                className="ml-auto flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Connect <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )
        ) : null}

        {/* Interview type */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Interview format</p>
          <div className="flex gap-2">
            {(["video", "phone", "in-person"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setInterviewType(t)}
                className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                  interviewType === t
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Proposed slots */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Proposed time slots (UTC)</p>
            {slots.length < 3 ? (
              <button
                type="button"
                onClick={addSlot}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add slot
              </button>
            ) : null}
          </div>
          <div className="space-y-3">
            {slots.map((slot, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-1 flex-wrap gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase text-slate-500">Date</label>
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => updateSlot(i, "date", e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      required={i === 0}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase text-slate-500">Start</label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      required={i === 0}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase text-slate-500">End</label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      required={i === 0}
                    />
                  </div>
                </div>
                {slots.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeSlot(i)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Optional fields */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Meeting link{" "}
              <span className="font-normal text-slate-500">
                {isCalendarConnected ? "(auto-generated via Google Meet — or override here)" : "(optional)"}
              </span>
            </label>
            <input
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder={isCalendarConnected ? "Leave blank to use auto-generated Google Meet link" : "https://meet.google.com/..."}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes <span className="font-normal text-slate-500">(optional — included in invite email)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please prepare a brief project walkthrough…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {isCalendarConnected
            ? <>A Google Calendar event + Google Meet link will be created, and an invite email + .ics will be sent to <span className="font-medium">{target.candidateEmail || "the candidate"}</span>.</>
            : <>An invite email + .ics calendar file will be sent to <span className="font-medium">{target.candidateEmail || "the candidate"}</span> immediately.</>
          }
        </p>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {isCalendarConnected ? "Schedule with Google Calendar" : "Schedule & send invite"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
