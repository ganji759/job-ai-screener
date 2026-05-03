import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { runAgentChat } from "../services/agent.service";
import type { AgentMessage } from "../services/agent.service";
import { parsePDF, heuristicExtractResume, extractRawTextFromPdf } from "../services/parser.service";

const AgentChatBodySchema = z.object({
  message: z.string().min(1).max(15000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        content: z.string(),
      }),
    )
    .max(50)
    .default([]),
});

export async function agentChatHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = AgentChatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
  }

  const { message, history } = parsed.data;
  const recruiterId = String((req as unknown as { user: { userId: string } }).user.userId);

  try {
    const { reply: agentReply, toolCalls } = await runAgentChat(
      message,
      history as AgentMessage[],
      recruiterId,
    );
    return reply.send({ reply: agentReply, toolCalls });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: msg });
  }
}

/** POST /api/v1/agent/extract-text — parse an uploaded file and return raw text for the agent. */
export async function extractTextHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded." });

    const buf = await data.toBuffer();
    const filename = data.filename ?? "upload";
    const mime = data.mimetype ?? "";

    let rawText = "";
    if (mime === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
      try {
        const result = await parsePDF(buf, filename);
        rawText = result.rawText ?? "";
        if (!rawText) {
          const p = result as Record<string, unknown>;
          rawText = [p.firstName, p.lastName, p.email, p.title, p.summary].filter(Boolean).join(" ");
        }
      } catch {
        // parsePDF failed entirely — fall back to raw text extraction only
        rawText = await extractRawTextFromPdf(buf).catch(() => "");
      }
    } else {
      // Plain text / docx / csv — read as UTF-8
      rawText = buf.toString("utf-8");
    }

    if (!rawText || rawText.trim().length < 20) {
      return reply.status(422).send({ error: "Could not extract readable text from this file. Try a text-based PDF or paste the resume text directly." });
    }

    // Extract minimal profile info for a preview
    const preview = heuristicExtractResume(rawText);

    return reply.send({
      rawText: rawText.slice(0, 14000),
      name: `${preview.firstName ?? ""} ${preview.lastName ?? ""}`.trim() || null,
      email: preview.email ?? null,
      title: preview.title ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: `Text extraction failed: ${msg}` });
  }
}
