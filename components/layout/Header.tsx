"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, Menu, Moon, Sun, User, Settings, LogOut, BriefcaseBusiness } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearToken } from "../../lib/auth";
import { cn } from "../../lib/utils";
import { useMeQuery } from "../../store/api/authApi";
import { useGetNotificationsQuery } from "../../store/api/notificationsApi";
import { NotificationPanel } from "./NotificationPanel";
import { useTheme } from "../../hooks/useTheme";

export const Header = ({ onToggleSidebar }: { onToggleSidebar: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useMeQuery();
  const [workspace, setWorkspace] = useState<"Recruiter" | "Admin">("Recruiter");
  const [showNotif, setShowNotif] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { data: notificationsData } = useGetNotificationsQuery({ page: 1, limit: 20 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const onScroll = () => setScrolled(window.scrollY > 8);
      onScroll();
      window.addEventListener("scroll", onScroll);
      return () => window.removeEventListener("scroll", onScroll);
    }
    return undefined;
  });

  const title = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const last = parts.at(-1) ?? "dashboard";
    const secondLast = parts.at(-2);
    const isOid = (s: string) => /^[a-f\d]{24}$/i.test(s);
    if (parts[0] === "jobs" && secondLast && isOid(secondLast)) {
      if (last === "applicants") return "Applicants";
      if (last === "screenings") return "Screenings";
      if (isOid(last)) return "Job overview";
    }
    if (isOid(last)) return "Details";
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
  }, [pathname]);
  const unread = (notificationsData?.notifications ?? []).filter((n) => !n.readAt).length;
  const initials = (user?.name ?? "RC")
    .split(" ")
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  const dark = theme === "dark";

  return (
    <header className={cn("sticky top-0 z-50 h-16 border-b border-brand-100 bg-white/90 px-4 backdrop-blur-md transition-shadow dark:border-slate-700 dark:bg-slate-800/90", scrolled && "shadow-md")}>
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="rounded-lg border border-brand-200 p-2 text-slate-600 hover:bg-brand-50 dark:border-slate-600 dark:text-slate-100">
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">Home / {title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWorkspace((p) => (p === "Recruiter" ? "Admin" : "Recruiter"))}
            className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            {workspace} View
          </button>
          <button onClick={toggleTheme} className="rounded-full border border-brand-200 p-2 text-slate-600 transition-transform hover:scale-105 hover:bg-brand-50 dark:border-slate-600 dark:text-slate-100">
            <motion.span animate={{ rotate: dark ? 180 : 0 }} className="block">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.span>
          </button>
          <div className="relative">
            <button onClick={() => setShowNotif((v) => !v)} className="relative rounded-full border border-brand-200 p-2 text-slate-600 transition-transform hover:scale-105 hover:bg-brand-50 dark:border-slate-600 dark:text-slate-100">
              <Bell className="h-4 w-4" />
              {unread > 0 ? (
                <>
                  <span className="absolute -right-1 -top-1 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>
                  <span className="absolute -right-1 -top-1 h-5 w-5 animate-ping rounded-full bg-red-400/70" />
                </>
              ) : null}
            </button>
            <AnimatePresence>{showNotif ? <motion.div className="animate-slide-right absolute right-0 top-11"><NotificationPanel /></motion.div> : null}</AnimatePresence>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{initials}</span>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{user?.name ?? "Recruiter"}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300">{user?.email ?? "..."}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-50 w-64 rounded-xl border border-brand-100 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-slate-800" sideOffset={8} align="end">
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-brand-50 p-2 dark:bg-slate-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{initials}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.name ?? "Recruiter"}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">{user?.email ?? ""}</p>
                  </div>
                </div>
                <DropdownMenu.Item onSelect={() => router.push("/profile")} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none hover:bg-brand-50 dark:text-slate-100 dark:hover:bg-slate-700"><User className="h-4 w-4" />My Profile</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => router.push("/settings")} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none hover:bg-brand-50 dark:text-slate-100 dark:hover:bg-slate-700"><Settings className="h-4 w-4" />Settings</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={toggleTheme} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none hover:bg-brand-50 dark:text-slate-100 dark:hover:bg-slate-700">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}Dark Mode</DropdownMenu.Item>
                <DropdownMenu.Separator className="my-2 h-px bg-slate-200 dark:bg-slate-600" />
                <DropdownMenu.Item
                  onSelect={() => {
                    clearToken();
                    router.replace("/login");
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 outline-none hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
};
