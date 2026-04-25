import bcrypt from "bcrypt";
import { randomInt } from "node:crypto";
import { env } from "../config/env";
import { OtpModel } from "../models/Otp.model";
import { sendMail } from "./email.service";
import { renderOtpTemplate } from "./emailTemplates.service";

const createCode = (): string => String(randomInt(100000, 999999));

export const issueOtp = async (userId: string, email: string, purpose: "verify_email" | "login_2fa" | "password_reset"): Promise<void> => {
  const code = createCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60_000);

  await OtpModel.create({ userId, email, codeHash, purpose, expiresAt });

  await sendMail(
    email,
    "Umurava AI HR OTP Code",
    renderOtpTemplate({ code, minutes: env.OTP_EXPIRES_MINUTES }),
  );
};

export const verifyOtp = async (userId: string, code: string, purpose: "verify_email" | "login_2fa" | "password_reset"): Promise<boolean> => {
  const otp = await OtpModel.findOne({ userId, purpose, usedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  if (!otp) return false;
  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) return false;
  otp.usedAt = new Date();
  await otp.save();
  return true;
};
