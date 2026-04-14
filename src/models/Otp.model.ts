import { Schema, model } from "mongoose";

const OtpSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  email: { type: String, required: true, lowercase: true, index: true },
  codeHash: { type: String, required: true },
  purpose: { type: String, enum: ["verify_email", "login_2fa", "password_reset"], default: "verify_email" },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date },
}, { timestamps: true });

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = model("Otp", OtpSchema);
