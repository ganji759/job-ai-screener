"use client";

import { Bot, Send, X, Minimize2, Maximize2, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentMessage, ToolCall } from "../../store/api/agentApi";
import { useAgentChatMutation } from "../../store/api/agentApi";
import { AgentToolCard } from "./AgentToolCard";

type ChatEntry =
  | { type: "user"; content: string }
  | { type: "agent"; content: string; toolCalls: ToolCall[] }
  | { type: "thinking" };

/** Minimal markdown renderer — handles bold, inline code, bullets, and paragraphs. */
const AgentMarkdown = ({ text }: { text: string }) => {
  const lines = text.split("\n");
  const rendered: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      rendered.push(
        <ul key={rendered.length} className="my-1 list-disc space-y-0.5 pl-4">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  const renderInline = (raw: string): React.ReactNode => {
    const parts = raw.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs dark:bg-slate-700">{part.slice(1, -1)}</code>;
      return part;
    });
  };

  lines.forEach((line, i) => {
    const bullet = line.match(/^[-*•]\s+(.*)/);
    const numbered = line.match(/^\d+\.\s+(.*)/);
    const heading = line.match(/^#{1,3}\s+(.*)/);

    if (bullet || numbered) {
      listItems.push((bullet ?? numbered)![1]);
    } else {
      flushList();
      if (heading) {
        rendered.push(<p key={i} className="mt-1 font-semibold">{renderInline(heading[1])}</p>);
      } else if (line.trim() === "") {
        rendered.push(<div key={i} className="h-1" />);
      } else {
        rendered.push(<p key={i} className="leading-relaxed">{renderInline(line)}</p>);
      }
    }
  });
  flushList();
  return <div className="space-y-0.5">{rendered}</div>;
};

const SUGGESTIONS = [
  "Give me a pipeline summary",
  "List my active jobs",
  "Show latest screening results",
  "List upcoming interviews",
];

export const AgentPanel = ({ onClose }: { onClose: () => void }) => {
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<AgentMessage[]>([]);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [agentChat, { isLoading }] = useAgentChatMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const send = useCallback(
    async (msg: string) => {
      const trimmed = msg.trim();
      if (!trimmed || isLoading) return;
      setInput("");

      setEntries((prev) => [...prev, { type: "user", content: trimmed }, { type: "thinking" }]);

      try {
        const res = await agentChat({ message: trimmed, history }).unwrap();
        setHistory((prev) => [
          ...prev,
          { role: "user", content: trimmed },
          { role: "model", content: res.reply },
        ]);
        setEntries((prev) => [
          ...prev.filter((e) => e.type !== "thinking"),
          { type: "agent", content: res.reply, toolCalls: res.toolCalls },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setEntries((prev) => [
          ...prev.filter((e) => e.type !== "thinking"),
          { type: "agent", content: `Error: ${msg}`, toolCalls: [] },
        ]);
      }
    },
    [agentChat, history, isLoading],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const clearChat = () => {
    setEntries([]);
    setHistory([]);
  };

  return (
    <div
      className={`fixed bottom-20 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 dark:border-slate-700 dark:bg-slate-900 ${
        minimized ? "h-14 w-72" : "h-[560px] w-[400px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-indigo-600 px-4 py-3 dark:border-slate-700">
        <Bot className="h-5 w-5 text-white" />
        <span className="flex-1 text-sm font-semibold text-white">AI Hiring Assistant</span>
        <button
          type="button"
          onClick={clearChat}
          className="rounded p-1 text-indigo-200 transition hover:bg-indigo-500 hover:text-white"
          title="Clear chat"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setMinimized((v) => !v)}
          className="rounded p-1 text-indigo-200 transition hover:bg-indigo-500 hover:text-white"
          title={minimized ? "Expand" : "Minimize"}
        >
          {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-indigo-200 transition hover:bg-indigo-500 hover:text-white"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {entries.length === 0 && (
              <div className="flex flex-col items-center gap-3 pt-6 text-center">
                <div className="rounded-full bg-indigo-50 p-4 dark:bg-indigo-900/30">
                  <Bot className="h-8 w-8 text-indigo-500" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  AI Hiring Assistant
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ask me about your jobs, candidates, screenings, or interviews — I can even schedule one for you.
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {entries.map((entry, i) => {
              if (entry.type === "thinking") {
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                      <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-none bg-slate-100 px-4 py-3 dark:bg-slate-800">
                      <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                      <span className="text-xs text-slate-500">Thinking…</span>
                    </div>
                  </div>
                );
              }

              if (entry.type === "user") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-indigo-600 px-4 py-3 text-sm text-white">
                      {entry.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    {entry.toolCalls.length > 0 && (
                      <div className="space-y-1">
                        {entry.toolCalls.map((tc, j) => (
                          <AgentToolCard key={j} toolCall={tc} />
                        ))}
                      </div>
                    )}
                    <div className="rounded-2xl rounded-tl-none bg-slate-100 px-4 py-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                      <AgentMarkdown text={entry.content} />
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-3 dark:border-slate-700">
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your pipeline…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
                style={{ maxHeight: "100px" }}
              />
              <button
                type="button"
                onClick={() => void send(input)}
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-center text-[10px] text-slate-400">Enter to send · Shift+Enter for new line</p>
          </div>
        </>
      )}
    </div>
  );
};
