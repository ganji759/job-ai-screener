import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { UserModel } from "../models/User.model";
import { OrganizationModel } from "../models/Organization.model";
import { issueOtp, verifyOtp } from "../services/otp.service";
import { notifyUser } from "../services/notification.service";
import { logger } from "../utils/logger";

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(2).optional(),
}).strip();
const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) }).strip();
const VerifyOtpSchema = z.object({ email: z.string().email(), code: z.string().length(6), purpose: z.enum(["verify_email", "login_2fa", "password_reset"]).default("verify_email") }).strip();
const SendOtpSchema = z.object({ email: z.string().email(), purpose: z.enum(["verify_email", "login_2fa", "password_reset"]).default("verify_email") }).strip();
const ResetPasswordSchema = z.object({ email: z.string().email(), code: z.string().length(6), newPassword: z.string().min(8) }).strip();

const makeSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) +
  "-" + Math.random().toString(36).slice(2, 7);

const signToken = (userId: string, email: string, role: string, orgId: string, orgRole: string): string =>
  jwt.sign({ userId, email, role, orgId, orgRole }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

const userPayload = (user: { _id: unknown; name: string; email: string; role: string; organizationId?: unknown; orgRole: string }, orgId: string) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  orgId,
  orgRole: user.orgRole,
});

export const register = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = RegisterSchema.parse(request.body);
  const exists = await UserModel.findOne({ email: body.email }).lean();
  if (exists) return void reply.code(409).send({ error: "Email already exists" });

  // Create the organization first
  const orgName = body.orgName?.trim() || `${body.name}'s Workspace`;
  const org = await OrganizationModel.create({ name: orgName, slug: makeSlug(orgName) });
  const orgId = String(org._id);

  const user = await UserModel.create({
    name: body.name,
    email: body.email,
    password: body.password,
    organizationId: org._id,
    orgRole: "owner",
  });

  let otpSent = true;
  try {
    await issueOtp(String(user._id), user.email, "verify_email");
  } catch {
    otpSent = false;
  }
  await notifyUser({
    userId: String(user._id),
    title: "Account created",
    message: `Welcome to HERON. Your workspace "${orgName}" is ready.`,
    type: "success",
    sendEmail: true,
  });

  const token = signToken(String(user._id), user.email, user.role, orgId, user.orgRole);
  reply.send({
    token,
    user: userPayload(user, orgId),
    otpSent,
    warning: otpSent ? undefined : "Account created, but OTP email was not delivered.",
  });
};

export const login = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = LoginSchema.parse(request.body);
  const user = await UserModel.findOne({ email: body.email });
  if (!user) return void reply.code(401).send({ error: "Invalid credentials" });

  const ok = await user.comparePassword(body.password);
  if (!ok) return void reply.code(401).send({ error: "Invalid credentials" });

  const orgId = user.organizationId ? String(user.organizationId) : "";

  let otpSent = true;
  try {
    await issueOtp(String(user._id), user.email, "login_2fa");
  } catch (err) {
    logger.error({ err }, "login: OTP issue failed");
    otpSent = false;
  }

  const token = signToken(String(user._id), user.email, user.role, orgId, user.orgRole);
  reply.send({
    token,
    user: userPayload(user, orgId),
    otpSent,
    ...(otpSent ? { requiresOtp: true } : { warning: "OTP email could not be sent. Login granted without 2FA." }),
  });
};

export const verifyAuthOtp = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = VerifyOtpSchema.parse(request.body);
  const user = await UserModel.findOne({ email: body.email });
  if (!user) return void reply.code(404).send({ error: "User not found" });

  const valid = await verifyOtp(String(user._id), body.code, body.purpose);
  if (!valid) return void reply.code(400).send({ error: "Invalid or expired OTP" });

  const orgId = user.organizationId ? String(user.organizationId) : "";
  const token = signToken(String(user._id), user.email, user.role, orgId, user.orgRole);
  await notifyUser({
    userId: String(user._id),
    title: "Login successful",
    message: "You logged in securely with OTP.",
    type: "success",
    sendEmail: true,
  });

  reply.send({ token, user: userPayload(user, orgId) });
};

export const resetPassword = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = ResetPasswordSchema.parse(request.body);
  const user = await UserModel.findOne({ email: body.email });
  if (!user) return void reply.code(404).send({ error: "User not found" });

  const valid = await verifyOtp(String(user._id), body.code, "password_reset");
  if (!valid) return void reply.code(400).send({ error: "Invalid or expired OTP" });

  user.password = body.newPassword;
  await user.save();

  const orgId = user.organizationId ? String(user.organizationId) : "";
  const token = signToken(String(user._id), user.email, user.role, orgId, user.orgRole);
  reply.send({ token, user: userPayload(user, orgId) });
};

export const sendOtp = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = SendOtpSchema.parse(request.body);
  const user = await UserModel.findOne({ email: body.email });
  if (!user) return void reply.code(404).send({ error: "User not found" });
  try {
    await issueOtp(String(user._id), user.email, body.purpose);
  } catch {
    return void reply.code(503).send({ error: "OTP email could not be sent. Please try again later." });
  }
  reply.send({ sent: true });
};

export const refresh = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const cookieHeader = request.headers.cookie ?? "";
  const refreshToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("refreshToken="))
    ?.split("=")[1];

  if (!refreshToken) return void reply.code(401).send({ error: "Missing refresh token" });
  const payload = jwt.verify(refreshToken, env.JWT_SECRET) as { userId: string; email: string; role: string; orgId: string; orgRole: string };
  const token = signToken(payload.userId, payload.email, payload.role, payload.orgId ?? "", payload.orgRole ?? "recruiter");
  reply.send({ token });
};

export const me = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = request.user?.userId;
  const user = await UserModel.findById(userId).select("name email role organizationId orgRole").lean();
  if (!user) return void reply.code(404).send({ error: "User not found" });
  const orgId = user.organizationId ? String(user.organizationId) : (request.user?.orgId ?? "");
  reply.send({ ...user, orgId, orgRole: user.orgRole });
};
