import { baseApi } from "./baseApi";

export type AgentMessage = { role: "user" | "model"; content: string };
export type ToolCall = { name: string; args: Record<string, unknown>; result: unknown };

export interface AgentChatPayload {
  message: string;
  history?: AgentMessage[];
}

export interface AgentChatResponse {
  reply: string;
  toolCalls: ToolCall[];
}

export const agentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    agentChat: builder.mutation<AgentChatResponse, AgentChatPayload>({
      query: ({ message, history }) => ({
        url: "/agent/chat",
        method: "post",
        data: { message, history: history ?? [] },
      }),
      transformResponse: (raw: unknown): AgentChatResponse => {
        const r = raw as Record<string, unknown>;
        return {
          reply: String(r.reply ?? ""),
          toolCalls: Array.isArray(r.toolCalls) ? (r.toolCalls as ToolCall[]) : [],
        };
      },
    }),
  }),
});

export const { useAgentChatMutation } = agentApi;
