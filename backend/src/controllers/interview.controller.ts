import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createInterview,
  deleteInterview,
  getInterview,
  listInterviews,
  updateInterview,
} from "../services/interview.service";
import { UserModel } from "../models/User.model";

const SlotSchema = z.object({
  start: z.string().datetime({ offset: true }).or(z.string().min(1)),
  end:   z.string().datetime({ offset: true }).or(z.string().min(1)),
});

const CreateInterviewSchema = z.object({
  candidateId:    z.string().min(1),
  applicantId:    z.string().min(1),
  jobId:          z.string().min(1),
  screeningId:    z.string().min(1),
  candidateName:  z.string().min(1),
  candidateEmail: z.string().email(),
  jobTitle:       z.string().min(1),
  title:          z.string().min(1),
  type:           z.enum(["video", "phone", "in-person"]),
  proposedSlots:  z.array(SlotSchema).min(1).max(3),
  meetingLink:    z.string().url().optional().or(z.literal("").transform(() => undefined)),
  notes:          z.string().max(2000).optional(),
});

const UpdateInterviewSchema = z.object({
  status:        z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
  confirmedSlot: SlotSchema.optional(),
  meetingLink:   z.string().url().optional().or(z.literal("").transform(() => undefined)),
  notes:         z.string().max(2000).optional(),
});

const userId = (req: FastifyRequest): string =>
  (req.user as { userId: string }).userId;

export const createInterviewHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = CreateInterviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ data: null, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message } });
  }

  const recruiterId = userId(req);
  const recruiter = await UserModel.findById(recruiterId).lean();

  const interview = await createInterview({
    ...parsed.data,
    recruiterId,
    recruiterName:  recruiter?.name ?? "Recruiter",
    recruiterEmail: recruiter?.email ?? "",
    meetingLink:    parsed.data.meetingLink ?? undefined,
    notes:          parsed.data.notes ?? undefined,
  });

  return reply.code(201).send({ data: interview, error: null });
};

export const listInterviewsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const q = req.query as Record<string, string>;
  const result = await listInterviews({
    recruiterId: userId(req),
    screeningId: q.screeningId,
    status:      q.status,
    page:        q.page ? Number(q.page) : 1,
    limit:       q.limit ? Math.min(Number(q.limit), 50) : 20,
  });
  return reply.send({ data: result, error: null });
};

export const getInterviewHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const interview = await getInterview(id, userId(req));
  if (!interview) return reply.code(404).send({ data: null, error: { code: "NOT_FOUND", message: "Interview not found" } });
  return reply.send({ data: interview, error: null });
};

export const updateInterviewHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const parsed = UpdateInterviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ data: null, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message } });
  }
  const updated = await updateInterview(id, userId(req), {
    ...parsed.data,
    meetingLink: parsed.data.meetingLink ?? undefined,
  });
  if (!updated) return reply.code(404).send({ data: null, error: { code: "NOT_FOUND", message: "Interview not found" } });
  return reply.send({ data: updated, error: null });
};

export const deleteInterviewHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const deleted = await deleteInterview(id, userId(req));
  if (!deleted) return reply.code(404).send({ data: null, error: { code: "NOT_FOUND", message: "Interview not found" } });
  return reply.send({ data: { deleted: true }, error: null });
};
