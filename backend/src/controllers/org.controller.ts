import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { OrganizationModel } from "../models/Organization.model";
import { UserModel } from "../models/User.model";
import { issueOtp, verifyOtp } from "../services/otp.service";

const UpdateOrgSchema = z.object({
  name: z.string().min(2).optional(),
}).strip();

const InviteSchema = z.object({
  email: z.string().email(),
  orgRole: z.enum(["admin", "recruiter", "viewer"]).default("recruiter"),
}).strip();

const AcceptInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  orgId: z.string().min(1),
  code: z.string().length(6),
}).strip();

const UpdateMemberSchema = z.object({
  orgRole: z.enum(["admin", "recruiter", "viewer"]),
}).strip();

const makeSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) +
  "-" + Math.random().toString(36).slice(2, 7);

export const getOrg = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = request.user?.orgId;
  if (!orgId) return void reply.code(401).send({ error: "No organization context" });

  const [org, members] = await Promise.all([
    OrganizationModel.findById(orgId).lean(),
    UserModel.find({ organizationId: orgId }).select("name email orgRole createdAt").lean(),
  ]);
  if (!org) return void reply.code(404).send({ error: "Organization not found" });

  reply.send({ org, members, memberCount: members.length });
};

export const updateOrg = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = request.user?.orgId;
  if (!orgId) return void reply.code(401).send({ error: "No organization context" });

  const body = UpdateOrgSchema.parse(request.body);
  const update: Record<string, unknown> = {};
  if (body.name) {
    update.name = body.name;
    update.slug = makeSlug(body.name);
  }
  if (Object.keys(update).length === 0) return void reply.code(400).send({ error: "No fields to update" });

  const org = await OrganizationModel.findByIdAndUpdate(orgId, { $set: update }, { new: true }).lean();
  reply.send({ org });
};

export const inviteMember = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = request.user?.orgId;
  if (!orgId) return void reply.code(401).send({ error: "No organization context" });

  const body = InviteSchema.parse(request.body);

  // Check if user already exists
  const existing = await UserModel.findOne({ email: body.email }).lean();
  if (existing) {
    if (String(existing.organizationId) === orgId) {
      return void reply.code(409).send({ error: "User is already a member of this organization" });
    }
    return void reply.code(409).send({ error: "Email is already registered with another workspace" });
  }

  const org = await OrganizationModel.findById(orgId).lean();
  if (!org) return void reply.code(404).send({ error: "Organization not found" });

  // Check seat limit
  const currentMembers = await UserModel.countDocuments({ organizationId: orgId });
  if (currentMembers >= org.seats) {
    return void reply.code(402).send({ error: `Seat limit reached (${org.seats}). Upgrade your plan to invite more members.` });
  }

  // Create a pending placeholder user so OTP can be sent
  const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const user = await UserModel.create({
    email: body.email,
    name: body.email.split("@")[0],
    password: tempPassword,
    organizationId: orgId,
    orgRole: body.orgRole,
  });

  try {
    await issueOtp(String(user._id), body.email, "verify_email");
  } catch {
    // Non-fatal
  }

  reply.send({
    invited: true,
    email: body.email,
    orgRole: body.orgRole,
    message: `Invitation sent to ${body.email}. They can complete signup using the OTP sent to their email.`,
  });
};

export const acceptInvite = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = AcceptInviteSchema.parse(request.body);

  const user = await UserModel.findOne({ email: body.email, organizationId: body.orgId });
  if (!user) return void reply.code(404).send({ error: "Invitation not found" });

  const valid = await verifyOtp(String(user._id), body.code, "verify_email");
  if (!valid) return void reply.code(400).send({ error: "Invalid or expired invite code" });

  user.name = body.name;
  user.password = body.password;
  await user.save();

  reply.send({ success: true, message: "Account activated. You can now log in." });
};

export const listMembers = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = request.user?.orgId;
  if (!orgId) return void reply.code(401).send({ error: "No organization context" });

  const members = await UserModel.find({ organizationId: orgId })
    .select("name email orgRole createdAt")
    .lean();

  reply.send({ members });
};

export const updateMember = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = request.user?.orgId;
  const { memberId } = request.params as { memberId: string };
  if (!orgId) return void reply.code(401).send({ error: "No organization context" });

  const body = UpdateMemberSchema.parse(request.body);
  const member = await UserModel.findOneAndUpdate(
    { _id: memberId, organizationId: orgId },
    { $set: { orgRole: body.orgRole } },
    { new: true },
  ).select("name email orgRole").lean();

  if (!member) return void reply.code(404).send({ error: "Member not found" });
  reply.send({ member });
};

export const removeMember = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = request.user?.orgId;
  const userId = request.user?.userId;
  const { memberId } = request.params as { memberId: string };
  if (!orgId) return void reply.code(401).send({ error: "No organization context" });
  if (memberId === userId) return void reply.code(400).send({ error: "Cannot remove yourself" });

  const deleted = await UserModel.findOneAndDelete({ _id: memberId, organizationId: orgId }).lean();
  if (!deleted) return void reply.code(404).send({ error: "Member not found" });
  reply.send({ removed: true });
};
