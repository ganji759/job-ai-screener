import crypto from "crypto";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserModel } from "../models/User.model";
import { logger } from "../utils/logger";

// ── Encryption helpers ────────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";

function encrypt(text: string): string {
  if (!env.ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY not configured");
  const key = Buffer.from(env.ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(data: string): string {
  if (!env.ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY not configured");
  const [ivHex, tagHex, encHex] = data.split(":");
  const key = Buffer.from(env.ENCRYPTION_KEY, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex")).toString("utf8") + decipher.final("utf8");
}

// ── OAuth client factory ──────────────────────────────────────────────────────

export function isGoogleConfigured(): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI && env.ENCRYPTION_KEY);
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

// ── Auth URL (state = signed JWT so callback knows which user) ────────────────

export function getAuthUrl(userJwt: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    // gmail.send is requested for ALL connecting users so the founder's own connection can send
    // lead notifications. Non-founder users simply never have those scopes invoked.
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    prompt: "consent",
    state: userJwt,
  });
}

// ── Token exchange & storage ──────────────────────────────────────────────────

export async function handleOAuthCallback(code: string, state: string): Promise<string> {
  const payload = jwt.verify(state, env.JWT_SECRET) as { userId: string };
  const userId = payload.userId;

  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Google did not return both access and refresh tokens. Make sure prompt=consent is set.");
  }

  await UserModel.findByIdAndUpdate(userId, {
    googleTokens: {
      accessToken:  encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt:    tokens.expiry_date ?? Date.now() + 3_600_000,
    },
  });

  return userId;
}

export async function revokeGoogleCalendar(userId: string): Promise<void> {
  const user = await UserModel.findById(userId).select("googleTokens").lean();
  const tokens = (user as { googleTokens?: { accessToken: string; refreshToken: string } } | null)?.googleTokens;
  if (tokens) {
    try {
      const client = createOAuthClient();
      client.setCredentials({ access_token: decrypt(tokens.accessToken) });
      await client.revokeCredentials();
    } catch {
      // Best-effort revoke; still remove from DB
    }
  }
  await UserModel.findByIdAndUpdate(userId, { $unset: { googleTokens: "" } });
}

export async function isCalendarConnected(userId: string): Promise<boolean> {
  const user = await UserModel.findById(userId).select("googleTokens").lean();
  return !!(user as { googleTokens?: unknown } | null)?.googleTokens;
}

// ── Authorized client (with auto-refresh) ────────────────────────────────────

/** Public re-export — used by other services (e.g. lead-notification Gmail send) that need a user's authorized Google client. */
export const getGoogleClientForUser = (userId: string) => getAuthorizedClient(userId);

async function getAuthorizedClient(userId: string) {
  const user = await UserModel.findById(userId).select("googleTokens").lean();
  const tokens = (user as { googleTokens?: { accessToken: string; refreshToken: string; expiresAt: number } } | null)?.googleTokens;
  if (!tokens) throw new Error("Google Calendar not connected for this user");

  const client = createOAuthClient();
  client.setCredentials({
    access_token:  decrypt(tokens.accessToken),
    refresh_token: decrypt(tokens.refreshToken),
    expiry_date:   tokens.expiresAt,
  });

  client.on("tokens", (newTokens) => {
    const patch: Record<string, unknown> = {};
    if (newTokens.access_token) patch["googleTokens.accessToken"] = encrypt(newTokens.access_token);
    if (newTokens.expiry_date)  patch["googleTokens.expiresAt"]   = newTokens.expiry_date;
    if (Object.keys(patch).length) {
      UserModel.findByIdAndUpdate(userId, { $set: patch }).catch((err: unknown) =>
        logger.error({ err }, "googleCalendar: failed to persist refreshed tokens"),
      );
    }
  });

  return client;
}

// ── Calendar event operations ─────────────────────────────────────────────────

export async function createCalendarEvent(params: {
  recruiterId: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  candidateEmail: string;
  candidateName: string;
  recruiterEmail: string;
  recruiterName: string;
}): Promise<{ eventId: string; meetLink: string | null }> {
  const auth = await getAuthorizedClient(params.recruiterId);
  const calendar = google.calendar({ version: "v3", auth });

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary:     params.title,
      description: params.description,
      start: { dateTime: params.start.toISOString(), timeZone: "UTC" },
      end:   { dateTime: params.end.toISOString(),   timeZone: "UTC" },
      attendees: [
        { email: params.recruiterEmail, displayName: params.recruiterName, organizer: true },
        { email: params.candidateEmail, displayName: params.candidateName },
      ],
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    },
  });

  const meetLink =
    data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ?? null;

  return { eventId: data.id ?? "", meetLink };
}

export async function deleteCalendarEvent(recruiterId: string, eventId: string): Promise<void> {
  try {
    const auth = await getAuthorizedClient(recruiterId);
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId, sendUpdates: "all" });
  } catch (err) {
    logger.warn({ err, eventId }, "googleCalendar: could not delete event (may already be gone)");
  }
}
