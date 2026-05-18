import { Plus } from "lucide-react";
import Link from "next/link";
import { AgentChatPage } from "../../../components/agent/AgentChatPage";

export const metadata = { title: "AI Hiring Assistant · Umurava" };

export default function AgentPage() {
  return (
    <div className="fade-up flex h-[calc(100vh-9rem)] min-h-[560px] flex-col">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-[10px]">Workspace · HERON Agent</div>
          <h1 className="display m-0" style={{ fontSize: 32 }}>
            AI <span className="gradient-text-warm">Assistant</span>.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)", margin: "8px 0 0" }}>
            Powered by HERON · Talk in plain English. It can draft jobs, screen applicants, and book interviews.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <span className="pill pill-mint">
            <span className="dot" /> Ready · Gemini 2.5
          </span>
          <Link href="/agent" className="btn btn-ghost">
            <Plus className="h-3 w-3" /> New chat
          </Link>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <AgentChatPage />
      </div>
    </div>
  );
}
