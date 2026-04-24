import type { Types } from "mongoose";
import { z } from "zod";
import { redisDel } from "../config/redis";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";
import { sendMailSafe } from "./email.service";
import {
  renderScreeningAcceptanceEmail,
  renderScreeningRejectionEmail,
} from "./emailTemplates.service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const mergeRecruiterDecisionRecords = (
  current: Record<string, unknown>,
  incoming: Record<string, { decision: string; hrNote: string; decidedAt?: string; aiLabel?: string }>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...current };
  for (const [applicantId, inc] of Object.entries(incoming)) {
    const prev = (merged[applicantId] && typeof merged[applicantId] === "object"
      ? (merged[applicantId] as Record<string, unknown>)
      : {}) as Record<string, unknown>;
    merged[applicantId] = { ...prev, ...inc };
  }
  return merged;
};

const applicantIdsFromShortlist = (
  shortlist: unknown[],
  jobApplicants: Array<{ _id: Types.ObjectId; profile: unknown }>,
): Set<string> => {
  const ids = new Set<string>();
  for (const row of shortlist) {
    if (row == null || typeof row !== "object") continue;
    const candidateId = String((row as Record<string, unknown>).candidateId ?? "");
    if (!candidateId) continue;
    const app = jobApplicants.find((a) => {
      const prof = a.profile as Record<string, unknown> | undefined;
      const pid = String(prof?.id ?? a._id);
      return String(a._id) === candidateId || pid === candidateId;
    });
    if (app) ids.add(String(app._id));
  }
  return ids;
};

const profileFirstName = (profile: Record<string, unknown>): string => {
  const raw = profile.firstName;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const name = String(profile.name ?? "");
  const part = name.split(/\s+/)[0];
  return part || "there";
};

export const scheduleAutoRejectionEmails = (params: {
  screeningId: string;
  jobId: Types.ObjectId;
  jobTitle: string;
  previousMerged: Record<string, unknown>;
  incoming: Record<string, { decision: string; hrNote: string; decidedAt?: string; aiLabel?: string }>;
}): void => {
  const { screeningId, jobId, jobTitle, previousMerged, incoming } = params;
  const toNotify: string[] = [];
  for (const [applicantId, inc] of Object.entries(incoming)) {
    if (inc.decision !== "rejected") continue;
    const prev = previousMerged[applicantId] as { decision?: string } | undefined;
    if (prev?.decision === "rejected") continue;
    toNotify.push(applicantId);
  }
  if (toNotify.length === 0) return;

  void (async () => {
    for (const applicantId of toNotify) {
      const applicant = await ApplicantModel.findById(applicantId).lean();
      if (!applicant || String(applicant.jobId) !== String(jobId)) continue;
      const profile = (applicant.profile ?? {}) as Record<string, unknown>;
      const email = String(profile.email ?? "").trim();
      if (!EMAIL_RE.test(email)) continue;
      const firstName = profileFirstName(profile);
      const html = renderScreeningRejectionEmail({ firstName, jobTitle });
      const ok = await sendMailSafe(email, `Update on your application — ${jobTitle}`, html);
      if (ok) {
        const screening = await ScreeningModel.findById(screeningId).lean();
        if (!screening) continue;
        const rd = screening.recruiterDecisions;
        const base =
          rd && typeof rd === "object" && !(rd instanceof Map)
            ? { ...(rd as Record<string, unknown>) }
            : rd instanceof Map
              ? Object.fromEntries(rd.entries())
              : {};
        const prevEntry =
          base[applicantId] && typeof base[applicantId] === "object"
            ? (base[applicantId] as Record<string, unknown>)
            : {};
        base[applicantId] = {
          ...prevEntry,
          rejectionEmailSentAt: new Date().toISOString(),
        };
        await ScreeningModel.updateOne({ _id: screeningId }, { $set: { recruiterDecisions: base } });
      }
    }
    await redisDel(`screening:${screeningId}`);
  })();
};

export const SendAcceptanceEmailsBodySchema = z.object({
  message: z.string().min(16, "Message must be at least 16 characters"),
  subject: z.string().min(3).max(200).optional(),
});

export type SendAcceptanceEmailsBody = z.infer<typeof SendAcceptanceEmailsBodySchema>;

export const sendAcceptanceEmailsForScreening = async (params: {
  screeningId: string;
  recruiterId: string;
  body: SendAcceptanceEmailsBody;
}): Promise<{ sent: number; skipped: number; errors: string[] }> => {
  const { screeningId, recruiterId, body } = params;
  const screening = await ScreeningModel.findOne({ _id: screeningId, recruiterId }).lean();
  if (!screening || screening.status !== "completed") {
    throw new Error("SCREENING_INVALID");
  }
  const stored = screening.results as { shortlist?: unknown[] } | undefined;
  const shortlist = stored?.shortlist;
  if (!Array.isArray(shortlist) || shortlist.length === 0) {
    throw new Error("NO_SHORTLIST");
  }

  const job = await JobModel.findById(screening.jobId).lean();
  if (!job) throw new Error("JOB_NOT_FOUND");
  const jobTitle = String(job.title ?? "your application");

  const jobApplicants = await ApplicantModel.find({ jobId: screening.jobId }).lean();
  const inShortlist = applicantIdsFromShortlist(shortlist, jobApplicants);

  const rdRaw = screening.recruiterDecisions;
  const decisions =
    rdRaw && typeof rdRaw === "object" && !(rdRaw instanceof Map)
      ? { ...(rdRaw as Record<string, unknown>) }
      : rdRaw instanceof Map
        ? Object.fromEntries(rdRaw.entries())
        : {};

  const subject =
    body.subject?.trim() ||
    `Great news about your application — ${jobTitle}`;

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  const mergedDecisions = { ...decisions };

  for (const applicantId of inShortlist) {
    const row = decisions[applicantId] as { decision?: string } | undefined;
    if (row?.decision !== "approved") {
      skipped += 1;
      continue;
    }
    const applicant = jobApplicants.find((a) => String(a._id) === applicantId);
    if (!applicant) {
      skipped += 1;
      continue;
    }
    const profile = (applicant.profile ?? {}) as Record<string, unknown>;
    const email = String(profile.email ?? "").trim();
    if (!EMAIL_RE.test(email)) {
      errors.push(`${applicantId}: invalid email`);
      skipped += 1;
      continue;
    }
    const firstName = profileFirstName(profile);
    const html = renderScreeningAcceptanceEmail({
      firstName,
      jobTitle,
      recruiterMessage: body.message,
    });
    const ok = await sendMailSafe(email, subject, html);
    if (ok) {
      sent += 1;
      const prevEntry =
        mergedDecisions[applicantId] && typeof mergedDecisions[applicantId] === "object"
          ? (mergedDecisions[applicantId] as Record<string, unknown>)
          : {};
      mergedDecisions[applicantId] = {
        ...prevEntry,
        congratsEmailSentAt: new Date().toISOString(),
      };
    } else {
      errors.push(`${email}: send failed`);
    }
  }

  if (sent > 0) {
    await ScreeningModel.updateOne({ _id: screeningId, recruiterId }, { $set: { recruiterDecisions: mergedDecisions } });
    await redisDel(`screening:${screeningId}`);
  }

  return { sent, skipped, errors };
};
