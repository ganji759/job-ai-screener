import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { LEAD_TIERS, LeadModel, TEAM_SIZES } from "../models/Lead.model";
import { logger } from "../utils/logger";

const LeadCreateSchema = z
  .object({
    full_name: z.string().min(1).max(200),
    work_email: z.string().email().max(320),
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    team_size: z.enum(TEAM_SIZES),
    tier_of_interest: z.enum(LEAD_TIERS),
    message: z.string().max(2000).nullish(),
    source: z.string().max(50).optional(),
    user_agent: z.string().max(500).optional(),
    referrer: z.string().max(2000).nullish(),
  })
  .strip();

export const createLead = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const body = LeadCreateSchema.parse(request.body);
  const lead = await LeadModel.create({
    full_name: body.full_name,
    work_email: body.work_email,
    company: body.company,
    role: body.role,
    team_size: body.team_size,
    tier_of_interest: body.tier_of_interest,
    message: body.message ?? null,
    source: body.source ?? "landing_page",
    user_agent: body.user_agent ?? "",
    referrer: body.referrer ?? null,
  });
  logger.info(
    { leadId: String(lead._id), tier: lead.tier_of_interest, email: lead.work_email },
    "lead captured",
  );
  reply.code(201).send({
    id: String(lead._id),
    created_at: lead.get("created_at"),
  });
};
