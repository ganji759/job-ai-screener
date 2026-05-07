import { Types } from "mongoose";
import { InterviewModel } from "../models/Interview.model";
import { sendMailSafe } from "./email.service";
import { renderInterviewInviteEmail, renderBaseEmailTemplate } from "./emailTemplates.service";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  isCalendarConnected,
  isGoogleConfigured,
} from "./googleCalendar.service";
import { logger } from "../utils/logger";

const fmtIcs = (d: Date): string =>
  d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

function generateIcs(params: {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
}): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HERON//Interview//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${params.uid}@heron.ai`,
    `DTSTAMP:${fmtIcs(new Date())}`,
    `DTSTART:${fmtIcs(params.start)}`,
    `DTEND:${fmtIcs(params.end)}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`,
    params.location ? `LOCATION:${params.location}` : null,
    `ORGANIZER;CN="${params.organizerName}":mailto:${params.organizerEmail}`,
    `ATTENDEE;CN="${params.attendeeName}";RSVP=TRUE:mailto:${params.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Interview reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

const UTC_LOCALE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "long", year: "numeric", month: "long",
  day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
};

export type CreateInterviewInput = {
  candidateId: string;
  applicantId: string;
  jobId: string;
  screeningId?: string;
  recruiterId: string;
  organizationId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  title: string;
  type: "video" | "phone" | "in-person";
  proposedSlots: Array<{ start: string; end: string }>;
  meetingLink?: string;
  notes?: string;
  recruiterName: string;
  recruiterEmail: string;
};

export const createInterview = async (input: CreateInterviewInput) => {
  const slots = input.proposedSlots.map((s) => ({
    start: new Date(s.start),
    end:   new Date(s.end),
  }));

  const interview = await InterviewModel.create({
    candidateId:     input.candidateId,
    applicantId:     new Types.ObjectId(input.applicantId),
    jobId:           new Types.ObjectId(input.jobId),
    ...(input.screeningId ? { screeningId: new Types.ObjectId(input.screeningId) } : {}),
    recruiterId:     new Types.ObjectId(input.recruiterId),
    organizationId:  new Types.ObjectId(input.organizationId),
    candidateName:  input.candidateName,
    candidateEmail: input.candidateEmail,
    jobTitle:       input.jobTitle,
    title:          input.title,
    type:           input.type,
    proposedSlots:  slots,
    meetingLink:    input.meetingLink,
    notes:          input.notes,
  });

  const firstSlot = slots[0];
  if (!firstSlot) return interview;

  // ── Google Calendar (optional) ────────────────────────────────────────────
  let effectiveMeetLink = input.meetingLink;
  let googleCalendarEventId: string | undefined;
  let googleCalendarInviteSent = false;

  if (isGoogleConfigured()) {
    try {
      const connected = await isCalendarConnected(input.recruiterId);
      if (connected) {
        const { eventId, meetLink } = await createCalendarEvent({
          recruiterId:    input.recruiterId,
          title:          input.title,
          description:    `Interview for ${input.jobTitle}\nCandidate: ${input.candidateName}${input.notes ? `\n\nNotes: ${input.notes}` : ""}`,
          start:          firstSlot.start,
          end:            firstSlot.end,
          candidateEmail: input.candidateEmail,
          candidateName:  input.candidateName,
          recruiterEmail: input.recruiterEmail,
          recruiterName:  input.recruiterName,
        });
        googleCalendarEventId = eventId;
        googleCalendarInviteSent = true;
        // Prefer the auto-generated Google Meet link if no manual one was provided
        if (meetLink && !effectiveMeetLink) effectiveMeetLink = meetLink;

        await InterviewModel.findByIdAndUpdate(interview._id, {
          googleCalendarEventId,
          ...(meetLink && !input.meetingLink ? { meetingLink: meetLink } : {}),
        });
      }
    } catch (err) {
      logger.warn({ err }, "interview.createInterview: Google Calendar event creation failed (non-fatal)");
    }
  }

  // ── Resend email + .ics attachment ────────────────────────────────────────
  const ics = generateIcs({
    uid:            String(interview._id),
    title:          input.title,
    description:    `Interview for ${input.jobTitle}\nCandidate: ${input.candidateName}${input.notes ? `\n\nNotes: ${input.notes}` : ""}`,
    start:          firstSlot.start,
    end:            firstSlot.end,
    location:       effectiveMeetLink,
    organizerEmail: input.recruiterEmail,
    organizerName:  input.recruiterName,
    attendeeEmail:  input.candidateEmail,
    attendeeName:   input.candidateName,
  });

  const html = renderInterviewInviteEmail({
    candidateName:           input.candidateName,
    jobTitle:                input.jobTitle,
    interviewType:           input.type,
    proposedSlots: slots.map((s) => ({
      start: s.start.toLocaleString("en-US", UTC_LOCALE_OPTS),
      end:   s.end.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
    })),
    meetingLink:             effectiveMeetLink,
    notes:                   input.notes,
    googleCalendarInviteSent,
  });

  await sendMailSafe(input.candidateEmail, input.title, html, [
    {
      filename:    "interview.ics",
      content:     Buffer.from(ics).toString("base64"),
      contentType: "text/calendar",
    },
  ]);

  return interview;
};

export const listInterviews = async (params: {
  organizationId: string;
  screeningId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const { organizationId, screeningId, status, page = 1, limit = 20 } = params;
  const filter: Record<string, unknown> = { organizationId: new Types.ObjectId(organizationId) };
  if (screeningId) filter.screeningId = new Types.ObjectId(screeningId);
  if (status) filter.status = status;

  const [interviews, total] = await Promise.all([
    InterviewModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InterviewModel.countDocuments(filter),
  ]);

  return { interviews, total, page, limit };
};

export const getInterview = async (id: string, organizationId: string) =>
  InterviewModel.findOne({ _id: id, organizationId: new Types.ObjectId(organizationId) }).lean();

export const updateInterview = async (
  id: string,
  organizationId: string,
  patch: {
    status?: "pending" | "confirmed" | "cancelled" | "completed";
    confirmedSlot?: { start: string; end: string };
    meetingLink?: string;
    notes?: string;
  },
) => {
  const update: Record<string, unknown> = {};
  if (patch.status) update.status = patch.status;
  if (patch.meetingLink !== undefined) update.meetingLink = patch.meetingLink;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.confirmedSlot) {
    update.confirmedSlot = {
      start: new Date(patch.confirmedSlot.start),
      end:   new Date(patch.confirmedSlot.end),
    };
    if (!patch.status) update.status = "confirmed";
  }
  return InterviewModel.findOneAndUpdate(
    { _id: id, organizationId: new Types.ObjectId(organizationId) },
    { $set: update },
    { new: true },
  ).lean();
};

export const deleteInterview = async (id: string, organizationId: string, recruiterId: string) => {
  const interview = await InterviewModel.findOne({
    _id: id,
    organizationId: new Types.ObjectId(organizationId),
  }).lean() as { googleCalendarEventId?: string } | null;

  if (interview?.googleCalendarEventId && isGoogleConfigured()) {
    await deleteCalendarEvent(recruiterId, interview.googleCalendarEventId);
  }

  const res = await InterviewModel.deleteOne({ _id: id, organizationId: new Types.ObjectId(organizationId) });
  return res.deletedCount > 0;
};

export const cancelInterview = async (
  id: string,
  organizationId: string,
  recruiterId: string,
  reason?: string,
): Promise<{ success: boolean; message: string }> => {
  const interview = await InterviewModel.findOneAndUpdate(
    { _id: id, organizationId: new Types.ObjectId(organizationId) },
    { $set: { status: "cancelled" } },
    { new: true },
  ).lean() as { candidateName: string; candidateEmail: string; jobTitle: string; googleCalendarEventId?: string } | null;

  if (!interview) return { success: false, message: "Interview not found or access denied." };

  if (interview.googleCalendarEventId && isGoogleConfigured()) {
    deleteCalendarEvent(recruiterId, interview.googleCalendarEventId).catch(() => undefined);
  }

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const reasonBlock = reason ? `<br/><br/>Reason: ${esc(reason)}` : "";
  const html = renderBaseEmailTemplate({
    title: "Interview cancelled",
    greeting: `Hello ${esc(interview.candidateName)},`,
    message: `We regret to inform you that your interview for the <b>${esc(interview.jobTitle)}</b> role has been cancelled.${reasonBlock}<br/><br/>We will be in touch if any new dates become available.`,
    accent: "#64748b",
  });

  await sendMailSafe(interview.candidateEmail, `Interview cancelled — ${interview.jobTitle}`, html);

  return {
    success: true,
    message: `Interview cancelled for ${interview.candidateName}. Cancellation email sent to ${interview.candidateEmail}.`,
  };
};
