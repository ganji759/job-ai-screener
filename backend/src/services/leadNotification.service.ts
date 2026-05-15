import { google, type Auth } from "googleapis";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import type { ILead } from "../models/Lead.model";

/** Lazy singleton — reused so googleapis can manage its own access-token refresh cycle. */
let cachedClient: Auth.OAuth2Client | null = null;

const isConfigured = (): boolean =>
  !!(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.FOUNDER_GMAIL_REFRESH_TOKEN
  );

const getClient = (): Auth.OAuth2Client | null => {
  if (!isConfigured()) return null;
  if (cachedClient) return cachedClient;
  const client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GMAIL_OAUTH_REDIRECT_URI,
  );
  client.setCredentials({ refresh_token: env.FOUNDER_GMAIL_REFRESH_TOKEN });
  cachedClient = client;
  return client;
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Build an RFC 2822 multipart/alternative message and base64url-encode it for the Gmail API. */
const buildRawMessage = (params: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): string => {
  const boundary = `=_HeronLead_${Date.now().toString(36)}`;
  const lines = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    params.text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    params.html,
    "",
    `--${boundary}--`,
    "",
  ];
  return Buffer.from(lines.join("\r\n"), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const renderText = (lead: ILead): string =>
  [
    `New lead from the HERON landing page`,
    ``,
    `Tier of interest:        ${lead.tier_of_interest}`,
    `Name:                    ${lead.full_name}`,
    `Work email:              ${lead.work_email}`,
    `Company:                 ${lead.company}`,
    `Role:                    ${lead.role}`,
    `Team size:               ${lead.team_size}`,
    `Recruiters:              ${lead.recruiter_count}`,
    `Monthly hiring volume:   ${lead.monthly_hiring_volume ?? "—"}`,
    `Source:                  ${lead.source}`,
    `Referrer:                ${lead.referrer ?? "—"}`,
    `IP country:              ${lead.ip_country ?? "—"}`,
    ``,
    `Message:`,
    lead.message ?? "(none)",
    ``,
    `User agent: ${lead.user_agent || "—"}`,
  ].join("\n");

const renderHtml = (lead: ILead): string => {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#64748b;font-size:13px;vertical-align:top;">${label}</td><td style="padding:6px 0;font-size:14px;color:#0f172a;"><strong>${value}</strong></td></tr>`;
  const tier = lead.tier_of_interest.toUpperCase();
  const body = lead.message ? escapeHtml(lead.message) : "<em style=\"color:#94a3b8;\">(none)</em>";
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="padding:22px 26px;background:linear-gradient(135deg,#6366f1,#d946ef);color:#fff;">
      <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.85;">HERON · New Lead</div>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;">${escapeHtml(lead.full_name)} · ${escapeHtml(tier)}</h1>
    </div>
    <div style="padding:22px 26px;">
      <table style="width:100%;border-collapse:collapse;">
        ${row("Work email", `<a href="mailto:${escapeHtml(lead.work_email)}" style="color:#6366f1;text-decoration:none;">${escapeHtml(lead.work_email)}</a>`)}
        ${row("Company", escapeHtml(lead.company))}
        ${row("Role", escapeHtml(lead.role))}
        ${row("Team size", escapeHtml(lead.team_size))}
        ${row("Recruiters", escapeHtml(lead.recruiter_count))}
        ${row("Monthly hiring", escapeHtml(lead.monthly_hiring_volume ?? "—"))}
        ${row("Source", escapeHtml(lead.source))}
        ${row("Referrer", escapeHtml(lead.referrer ?? "—"))}
        ${row("IP country", escapeHtml(lead.ip_country ?? "—"))}
      </table>
      <div style="margin-top:18px;padding:14px 16px;background:#f8fafc;border-radius:10px;font-size:13.5px;line-height:1.55;color:#334155;border:1px solid #e2e8f0;">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Message</div>
        ${body}
      </div>
      <div style="margin-top:18px;font-size:11px;color:#94a3b8;line-height:1.6;">User agent: ${escapeHtml(lead.user_agent || "—")}</div>
    </div>
  </div>
</body></html>`;
};

/** Fire-and-forget: send a notification email for a newly captured lead. Resolves to `true` when delivered. */
export const sendLeadNotification = async (lead: ILead): Promise<boolean> => {
  const auth = getClient();
  if (!auth) {
    logger.debug("leadNotification: skipped — Gmail OAuth not configured (set FOUNDER_GMAIL_REFRESH_TOKEN to enable)");
    return false;
  }
  try {
    const gmail = google.gmail({ version: "v1", auth });
    const raw = buildRawMessage({
      from: env.FOUNDER_NOTIFY_FROM,
      to: env.FOUNDER_NOTIFY_TO,
      subject: `[HERON Lead] ${lead.full_name} · ${lead.company} · ${lead.tier_of_interest}`,
      text: renderText(lead),
      html: renderHtml(lead),
    });
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    logger.info({ email: lead.work_email, tier: lead.tier_of_interest }, "leadNotification: sent");
    return true;
  } catch (err) {
    logger.error({ err }, "leadNotification: failed to send");
    return false;
  }
};
