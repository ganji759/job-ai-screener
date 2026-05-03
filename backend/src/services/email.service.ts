import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);

type Attachment = { filename: string; content: string; contentType?: string };

export const sendMail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: Attachment[],
): Promise<void> => {
  const payload: Parameters<typeof resend.emails.send>[0] = { from: env.RESEND_FROM, to, subject, html };
  if (attachments?.length) (payload as unknown as Record<string, unknown>).attachments = attachments;
  const { error } = await resend.emails.send(payload);
  if (error) throw new Error(error.message);
};

export const sendMailSafe = async (
  to: string,
  subject: string,
  html: string,
  attachments?: Attachment[],
): Promise<boolean> => {
  try {
    await sendMail(to, subject, html, attachments);
    return true;
  } catch {
    return false;
  }
};
