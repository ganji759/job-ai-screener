import nodemailer from "nodemailer";
import { env } from "../config/env";

const SMTP_TIMEOUT_MS = 30_000;

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  connectionTimeout: SMTP_TIMEOUT_MS,
  socketTimeout: SMTP_TIMEOUT_MS,
  greetingTimeout: SMTP_TIMEOUT_MS,
  tls: {
    rejectUnauthorized: env.SMTP_TLS_REJECT_UNAUTHORIZED,
  },
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  const mailPayload = {
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  };
  try {
    await transporter.sendMail(mailPayload);
  } catch (error) {
    const message = String((error as Error)?.message ?? "");
    const tlsIssue = message.toLowerCase().includes("self-signed certificate");
    if (!tlsIssue || env.NODE_ENV === "production") {
      throw error;
    }
    const insecureTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      connectionTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    await insecureTransporter.sendMail(mailPayload);
  }
};

export const sendMailSafe = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    await sendMail(to, subject, html);
    return true;
  } catch {
    return false;
  }
};
