"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Briefcase, ClipboardList, LayoutDashboard, Settings, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { cn } from "../../lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applicants", label: "Applicants", icon: Users },
  { href: "/screenings", label: "Screenings", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar = ({ collapsed = false, mobileOpen = false, onCloseMobile }: { collapsed?: boolean; mobileOpen?: boolean; onCloseMobile?: () => void }) => {
  const pathname = usePathname();
  useEffect(() => {
    if (!mobileOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onCloseMobile?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {mobileOpen ? <button onClick={onCloseMobile} className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" /> : null}
      <motion.aside
        initial={{ x: -8, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn(
          "fixed top-0 z-50 flex h-screen flex-col overflow-y-auto border-r border-brand-100 bg-white shadow-brand-sm transition-[width,left] duration-200 dark:border-slate-700 dark:bg-slate-800",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "left-0" : "-left-full lg:left-0",
        )}
      >
      <div className="border-b border-brand-100 bg-gradient-to-br from-brand-700 to-brand-900 px-5 py-6 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-sm font-bold"><Sparkles className="h-4 w-4" /></span>
          <div className={cn(collapsed && "hidden")}>
            <h1 className="text-base font-bold tracking-tight">Umurava</h1>
            <p className="text-xs text-brand-100">AI HR</p>
            <span className="mt-1 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px]">v1.0 Beta</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition",
                active ? "bg-brand-600 text-white shadow-brand" : "text-slate-600 hover:bg-brand-50 hover:text-brand-800 dark:text-slate-200 dark:hover:bg-slate-700",
              )}
              title={collapsed ? link.label : undefined}
              onClick={() => onCloseMobile?.()}
            >
              {active ? <motion.span layoutId="activeNav" className="absolute left-0 h-6 w-1 rounded-r-full bg-brand-300" /> : null}
              <Icon className={cn("h-4 w-4", active ? "text-white" : "text-brand-600")} />
              <span className={cn(collapsed && "hidden")}>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-brand-100 p-3 text-xs text-slate-500">
        <div className="rounded-xl bg-brand-50 px-3 py-2 dark:bg-slate-700">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">RC</span>
            <div className={cn(collapsed && "hidden")}>
              <p className="font-semibold text-brand-700 dark:text-slate-100">Recruiter</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">Online</p>
            </div>
          </div>
        </div>
      </div>
      </motion.aside>
    </>
  );
};
