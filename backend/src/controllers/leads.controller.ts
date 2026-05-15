import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  HIRING_VOLUMES,
  LEAD_TIERS,
  LeadModel,
  RECRUITER_COUNTS,
  TEAM_SIZES,
} from "../models/Lead.model";
import { logger } from "../utils/logger";
import { sendLeadNotification } from "../services/leadNotification.service";

const LeadCreateSchema = z
  .object({
    full_name: z.string().min(1).max(200),
    work_email: z.string().email().max(320),
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    team_size: z.enum(TEAM_SIZES),
    recruiter_count: z.enum(RECRUITER_COUNTS),
    tier_of_interest: z.enum(LEAD_TIERS),
    monthly_hiring_volume: z.enum(HIRING_VOLUMES).nullish(),
    message: z.string().max(500).nullish(),
    source: z.string().max(50).optional(),
    user_agent: z.string().max(500).optional(),
    referrer: z.string().max(2000).nullish(),
  })
  .strip();

/** Derive caller's ISO-3166 country code from edge headers (Vercel / Cloudflare / generic). */
const resolveIpCountry = (request: FastifyRequest): string | null => {
  const h = request.headers;
  const pick = (v: string | string[] | undefined): string | null => {
    if (!v) return null;
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === "string" && s.trim() ? s.trim().slice(0, 4).toUpperCase() : null;
  };
  return (
    pick(h["x-vercel-ip-country"]) ||
    pick(h["cf-ipcountry"]) ||
    pick(h["x-country-code"]) ||
    null
  );
};

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
    recruiter_count: body.recruiter_count,
    tier_of_interest: body.tier_of_interest,
    monthly_hiring_volume: body.monthly_hiring_volume ?? null,
    message: body.message ?? null,
    source: body.source ?? "landing_pricing",
    user_agent: body.user_agent ?? "",
    referrer: body.referrer ?? null,
    ip_country: resolveIpCountry(request),
  });
  logger.info(
    { leadId: String(lead._id), tier: lead.tier_of_interest, email: lead.work_email },
    "lead captured",
  );
  // Fire-and-forget founder notification: never block the 201 response on Gmail latency or failures.
  void sendLeadNotification(lead.toObject()).catch((err: unknown) =>
    logger.error({ err }, "lead notification dispatch failed unexpectedly"),
  );
  reply.code(201).send({
    id: String(lead._id),
    created_at: lead.get("created_at"),
  });
};
