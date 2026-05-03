import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { runAgentChat } from "../services/agent.service";
import type { AgentMessage } from "../services/agent.service";

const AgentChatBodySchema = z.object({
  message: z.string().min(1).max(4000),
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
