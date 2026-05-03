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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
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
          "fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          agentOpen
            ? "bg-slate-700 text-white hover:bg-slate-600"
            : "bg-indigo-600 text-white hover:bg-indigo-700",
        )}
        title="AI Hiring Assistant"
      >
        <Bot className="h-6 w-6" />
      </button>

      {agentOpen && <AgentPanel onClose={() => setAgentOpen(false)} />}
    </div>
  );
};
