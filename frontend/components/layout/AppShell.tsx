"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "../../lib/utils";
import { DashboardSplashIntro } from "../dashboard/DashboardSplashIntro";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(() => pathname === "/dashboard");

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
      <AnimatePresence>{showIntro ? <DashboardSplashIntro onDone={() => setShowIntro(false)} /> : null}</AnimatePresence>
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
    </div>
  );
};
