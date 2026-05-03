"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AgentPanel } from "../agent/AgentPanel";
import { cn } from "../../lib/utils";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem("umurava_sidebar_collapsed");
      setCollapsed(saved === "true");
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("umurava-sidebar-sync", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("umurava-sidebar-sync", read);
    };
  }, []);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setMobileOpen((v) => !v);
      return;
    }
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("umurava_sidebar_collapsed", String(next));
    window.dispatchEvent(new Event("umurava-sidebar-sync"));
  };

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div
        className={cn(
          "min-h-screen flex-1 transition-[padding] duration-[250ms] ease-in-out md:min-w-0",
          collapsed ? "md:pl-16" : "md:pl-[240px]",
        )}
      >
        <Header onToggleSidebar={toggleSidebar} />
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      {/* Floating AI Agent button */}
      <button
        type="button"
        onClick={() => setAgentOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:ring-offset-2",
          agentOpen
            ? "bg-slate-800 text-white shadow-xl shadow-slate-900/40 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
            : "bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 text-white shadow-indigo-md hover:scale-110 hover:shadow-indigo-lg",
        )}
        title="AI Hiring Assistant"
      >
        {!agentOpen && (
          <span className="pointer-events-none absolute inset-0 animate-agent-ring rounded-full bg-indigo-400/50" />
        )}
        <Bot className="relative z-10 h-6 w-6" />
      </button>

      {agentOpen && <AgentPanel onClose={() => setAgentOpen(false)} />}
    </div>
  );
};
