"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "../../lib/utils";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("umurava_sidebar_collapsed");
    setCollapsed(saved === "true");
  }, []);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileOpen((v) => !v);
      return;
    }
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("umurava_sidebar_collapsed", String(next));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div
        className={cn(
          "min-h-screen flex-1 transition-[padding] duration-200 lg:min-w-0",
          collapsed ? "lg:pl-16" : "lg:pl-60",
        )}
      >
        <Header onToggleSidebar={toggleSidebar} />
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
