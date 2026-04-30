"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User, X } from "lucide-react";
import { useCandidateAiChatMutation } from "../../store/api/screeningsApi";

type Message = { role: "user" | "model"; content: string };

export type AdvisoryCandidate = {
  rank: number;
  name: string;
  score: number;
  recommendation: string;
  strengths: string[];
  gaps: string[];
  hrDecision?: string;
};

type Props = {
  screeningId: string;
  jobTitle: string;
  candidates: AdvisoryCandidate[];
  onClose: () => void;
};

const SUGGESTED_QUESTIONS = [
  "Who should I definitely hire?",
  "Compare the top 3 candidates",
  "What are common skill gaps across all candidates?",
  "Are there any red flags I should know about?",
  "Which candidates align best with the role?",
];

function buildCandidateContext(candidates: AdvisoryCandidate[], jobTitle: string): string {
  const rows = candidates
    .map(
      (c) =>
        `#${c.rank} ${c.name} — Score: ${c.score}/100 | AI: ${c.recommendation} | HR: ${c.hrDecision ?? "pending"}\n` +
        `  Strengths: ${c.strengths.slice(0, 3).join(" · ") || "none listed"}\n` +
        `  Gaps: ${c.gaps.slice(0, 3).join(" · ") || "none listed"}`,
    )
    .join("\n\n");

  return (
    `[Advisory context — ${candidates.length} candidates screened for "${jobTitle}"]\n\n` +
    `${rows}\n\n` +
    `You are an expert AI HR advisor. Use this data to give objective, actionable advice. ` +
    `When comparing candidates always reference their rank and score. ` +
    `Remind the HR that final hiring decisions are theirs.`
  );
}

function renderContent(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

export function AiAdvisoryModal({ screeningId, jobTitle, candidates, onClose }: Props) {
  const greeting =
    `Hi! I have a full picture of all **${candidates.length} candidates** screened for **${jobTitle}**.\n\n` +
    `Ask me anything — who to hire, how candidates compare, common gaps, red flags, or anything else that helps you decide.`;

  const [messages, setMessages] = useState<Message[]>([{ role: "model", content: greeting }]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [chat, { isLoading }] = useCandidateAiChatMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const extractReply = (raw: string): string => {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        const text = parsed.answer ?? parsed.text ?? parsed.reply ?? parsed.message ?? parsed.content;
        if (typeof text === "string") return text;
      } catch { /* not JSON */ }
    }
    return raw;
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg };
    const currentHistory = messages.filter((_, i) => i > 0); // skip hardcoded greeting
    setMessages((prev) => [...prev, userMsg]);

    // Inject the full candidate context as the first history entry so the LLM always has it.
    const contextEntry = { role: "user" as const, content: buildCandidateContext(candidates, jobTitle) };
    const contextAck = { role: "model" as const, content: "Understood — I have the full candidate context." };
    const historyWithContext = [
      contextEntry,
      contextAck,
      ...currentHistory.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const res = await chat({
        screeningId,
        candidateId: "advisory",
        message: msg,
        history: historyWithContext,
      }).unwrap();
      setMessages((prev) => [...prev, { role: "model", content: extractReply(res.reply) }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", content: "Sorry, I couldn't reach the AI right now. Please try again." },
      ]);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-end sm:pr-6 sm:pb-24">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Chat window */}
      <div className="relative flex w-full max-w-sm flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:h-[560px]">

        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 px-4 py-3 text-white">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-tight">AI Advisory</p>
            <p className="truncate text-xs text-indigo-200">
              {jobTitle} · {candidates.length} candidates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-full p-1 transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                  msg.role === "user" ? "bg-brand-600" : "bg-gradient-to-br from-indigo-500 to-violet-600"
                }`}
              >
                {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-brand-600 text-white"
                    : "rounded-tl-sm bg-slate-100 text-slate-800"
                }`}
                dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
              />
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested questions — only on first turn */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q)}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2 border-t border-slate-200 px-3 py-2.5">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about the full candidate pool… (Enter to send)"
            className="max-h-32 flex-1 resize-none overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <p className="rounded-b-2xl border-t border-slate-100 bg-slate-50 px-4 py-1.5 text-center text-[10px] text-slate-400">
          Advisory only — final hiring decisions remain with the recruiter.
        </p>
      </div>
    </div>
  );
}
