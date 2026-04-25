"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, User, X } from "lucide-react";
import { useCandidateAiChatMutation } from "../../store/api/screeningsApi";

type Message = { role: "user" | "model"; content: string };

type Props = {
  screeningId: string;
  candidateId: string;
  candidateName: string;
  aiRecommendation: string;
  totalScore: number;
  jobTitle: string;
  onClose: () => void;
};

export function AiChatModal({ screeningId, candidateId, candidateName, aiRecommendation, totalScore, jobTitle, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: `Hi! I'm ready to discuss **${candidateName}** with you.\n\nThey scored **${totalScore}/100** for the ${jobTitle} role, with an AI recommendation of **${aiRecommendation}**.\n\nWhat would you like to know?`,
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [chat, { isLoading }] = useCandidateAiChatMutation();

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    const history = messages.filter((m) => m.role !== "model" || messages.indexOf(m) > 0);
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await chat({
        screeningId,
        candidateId,
        message: text,
        history: history.map((m) => ({ role: m.role, content: m.content })),
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
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Chat window */}
      <div className="relative flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:h-[520px]">
        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-3 text-white">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{candidateName}</p>
            <p className="truncate text-xs text-violet-200">{jobTitle} · Score {totalScore}/100 · AI: {aiRecommendation}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-full p-1 hover:bg-white/20 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${msg.role === "user" ? "bg-brand-600" : "bg-violet-600"}`}>
                {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-brand-600 text-white"
                    : "rounded-tl-sm bg-slate-100 text-slate-800"
                }`}
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n/g, "<br/>"),
                }}
              />
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested questions */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {[
              "Why is their score low?",
              "What are the biggest gaps?",
              "Would you recommend hiring them?",
              "How do they compare to an ideal candidate?",
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setInput(q); inputRef.current?.focus(); }}
                className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200 px-3 py-2.5 flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about this candidate… (Enter to send)"
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <p className="rounded-b-2xl bg-slate-50 px-4 py-1.5 text-center text-[10px] text-slate-400 border-t border-slate-100">
          AI advice is for reference only — final decisions are yours.
        </p>
      </div>
    </div>
  );
}
