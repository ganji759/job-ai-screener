"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "../../lib/utils";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.add("dark");
    html.dataset.theme = "dark";
    return () => {
      if (!hadDark) {
        html.classList.remove("dark");
        delete html.dataset.theme;
      }
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
    <div className="heron-app-shell relative min-h-screen overflow-x-hidden">
      <div className="page-bg" aria-hidden />
      <div className="aurora" aria-hidden />
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div
        className={cn(
          "min-h-screen flex-1 transition-[padding] duration-[250ms] ease-in-out md:min-w-0",
          collapsed ? "md:pl-[72px]" : "md:pl-[252px]",
        )}
      >
        <Header onToggleSidebar={toggleSidebar} />
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
