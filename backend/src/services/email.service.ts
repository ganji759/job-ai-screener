import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);

const FROM = "onboarding@resend.dev";

export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(error.message);
};

export const sendMailSafe = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    await sendMail(to, subject, html);
    return true;
  } catch {
    return false;
  }
};
