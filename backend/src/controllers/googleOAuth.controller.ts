import type { FastifyReply, FastifyRequest } from "fastify";
import {
  getAuthUrl,
  handleOAuthCallback,
  isCalendarConnected,
  isGoogleConfigured,
  revokeGoogleCalendar,
} from "../services/googleCalendar.service";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const userId = (req: FastifyRequest): string =>
  (req.user as { userId: string }).userId;

export const googleGetAuthUrl = async (req: FastifyRequest, reply: FastifyReply) => {
  if (!isGoogleConfigured()) {
    return reply.code(503).send({ error: "Google Calendar integration is not configured on this server." });
  }
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return reply.code(401).send({ error: "Missing authorization token" });
  return reply.send({ url: getAuthUrl(token) });
};

export const googleCallback = async (req: FastifyRequest, reply: FastifyReply) => {
  const { code, error, state } = req.query as { code?: string; error?: string; state?: string };

  if (error || !code || !state) {
    logger.warn({ error, hasCode: !!code }, "googleCallback: missing code or denied by user");
    return reply.redirect(`${env.FRONTEND_URL}/settings?section=integrations&google_cal=error`);
  }

  try {
    await handleOAuthCallback(code, state);
    return reply.redirect(`${env.FRONTEND_URL}/settings?section=integrations&google_cal=success`);
  } catch (err) {
    logger.error({ err }, "googleCallback: token exchange failed");
    return reply.redirect(`${env.FRONTEND_URL}/settings?section=integrations&google_cal=error`);
  }
};

export const googleCalendarStatus = async (req: FastifyRequest, reply: FastifyReply) => {
  const connected = await isCalendarConnected(userId(req));
  return reply.send({ connected, configured: isGoogleConfigured() });
};

export const googleCalendarDisconnect = async (req: FastifyRequest, reply: FastifyReply) => {
  await revokeGoogleCalendar(userId(req));
  return reply.send({ disconnected: true });
};
