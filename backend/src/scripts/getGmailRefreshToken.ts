/**
 * One-time helper: obtain a Gmail-send refresh token for the founder account.
 *
 * Usage (run from backend/):
 *   npm run gmail-token
 *
 * Prerequisites:
 *   1. Create a DESKTOP-type OAuth 2.0 client in Google Cloud Console → APIs & Services →
 *      Credentials → Create Credentials → OAuth client ID → Application type: "Desktop app".
 *      Desktop clients accept localhost loopback redirects natively — no URI registration needed.
 *   2. Put its id/secret in backend/.env as GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET
 *      (or reuse GOOGLE_CLIENT_ID/SECRET if those already point to a Desktop client).
 *   3. Gmail API enabled for the project.
 *
 * The script will:
 *   - Open your browser to the Google consent screen
 *   - Spawn a tiny local listener to catch the redirect
 *   - Print the refresh token; copy it into backend/.env as FOUNDER_GMAIL_REFRESH_TOKEN=
 */
import http from "http";
import { URL } from "url";
import { exec } from "child_process";
import { google } from "googleapis";
import { env } from "../config/env";

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

const openBrowser = (url: string): void => {
  const platform = process.platform;
  const cmd =
    platform === "win32"
      ? `start "" "${url}"`
      : platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log(`(could not auto-open browser — paste this URL manually)\n${url}`);
  });
};

const main = async (): Promise<void> => {
  const clientId = env.GMAIL_CLIENT_ID ?? env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GMAIL_CLIENT_SECRET ?? env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(
      "ERROR: Set GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET (recommended: a Desktop-type OAuth client)\n" +
        "       — or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — in backend/.env first.",
    );
    process.exit(1);
  }

  const redirectUrl = new URL(env.GMAIL_OAUTH_REDIRECT_URI);
  const port = Number(redirectUrl.port) || 53682;
  const callbackPath = redirectUrl.pathname || "/oauth2callback";

  const client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    env.GMAIL_OAUTH_REDIRECT_URI,
  );

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh-token issuance even on repeat consent
    scope: SCOPES,
  });

  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url || !req.url.startsWith(callbackPath)) {
        res.statusCode = 404;
        res.end("not found");
        return;
      }
      const url = new URL(req.url, env.GMAIL_OAUTH_REDIRECT_URI);
      const code = url.searchParams.get("code");
      const oauthError = url.searchParams.get("error");
      if (oauthError || !code) {
        res.statusCode = 400;
        res.end(`OAuth error: ${oauthError ?? "missing code"}`);
        server.close();
        return;
      }
      const { tokens } = await client.getToken(code);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        "<html><body style=\"font-family:sans-serif;padding:40px;\"><h2>Refresh token captured.</h2><p>You can close this tab and return to the terminal.</p></body></html>",
      );
      console.log("\n=========================================");
      console.log("SUCCESS — copy this into backend/.env :\n");
      console.log(`FOUNDER_GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log("\n=========================================");
      if (!tokens.refresh_token) {
        console.warn(
          "\nNote: no refresh_token was returned. This usually means you've already granted this scope before.\nGo to https://myaccount.google.com/permissions and remove the existing grant, then re-run this script.",
        );
      }
      server.close();
    } catch (err) {
      res.statusCode = 500;
      res.end(`Token exchange failed: ${(err as Error).message}`);
      server.close();
    }
  });

  server.listen(port, () => {
    console.log(`Listening for Google's redirect on ${env.GMAIL_OAUTH_REDIRECT_URI}`);
    console.log(`Opening your browser to grant Gmail-send access...\n`);
    openBrowser(authUrl);
  });
};

void main();
