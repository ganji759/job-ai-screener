"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Brain,
  Briefcase,
  CalendarCheck,
  FileBarChart2,
  LayoutGrid,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { getLocalReadIds, getLocalUnreadIds, subscribeLocalReadUpdates } from "../../lib/notificationReadState";
import { cn } from "../../lib/utils";
import { useGetNotificationsQuery } from "../../store/api/notificationsApi";
import { useMeQuery } from "../../store/api/authApi";
import { UserAccountDropdown } from "./UserAccountDropdown";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applicants", label: "Applicants", icon: Users },
  { href: "/screenings", label: "Screenings", icon: Brain },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/interviews", label: "Interviews", icon: CalendarCheck },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart2 },
] as const;

const secondaryLinks = [
  { href: "/notifications", label: "Notifications", icon: Bell, showBadge: true },
  { href: "/settings", label: "Settings", icon: Settings, showBadge: false },
] as const;

const appleSans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function NavLinkRow({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  badgeCount,
  showBadge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  badgeCount: number;
  showBadge: boolean;
  onNavigate: () => void;
}) {
  const inner = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-10 items-center rounded-[10px] transition-colors duration-150 ease-out",
        collapsed ? "mx-auto w-10 justify-center px-0" : "mx-2 mb-0.5 gap-[10px] px-3",
        active
          ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/10 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:from-indigo-500/20 dark:to-violet-500/12 dark:text-indigo-300 dark:ring-indigo-500/25"
          : "font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100",
      )}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors duration-150 ease-out",
            active
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200",
          )}
        />
        {showBadge && collapsed && badgeCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#ff3b30] ring-2 ring-white/90" aria-hidden />
        ) : null}
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
          {showBadge && badgeCount > 0 ? (
            <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[9px] bg-[#ff3b30] px-1 text-[11px] font-bold leading-none text-white transition-opacity duration-200">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </>
      ) : null}
    </Link>
  );

  if (!collapsed) return inner;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{inner}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-[70] rounded-md bg-[#1d1d1f] px-1 py-1 text-xs font-medium leading-none text-white shadow-md dark:bg-slate-100 dark:text-slate-900"
        >
          {label}
          <Tooltip.Arrow className="fill-[#1d1d1f] dark:fill-slate-100" width={10} height={5} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export const Sidebar = ({
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
}: {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) => {
  const pathname = usePathname();
  const { data: user } = useMeQuery();
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [localUnreadIds, setLocalUnreadIds] = useState<Set<string>>(new Set());
  const { data: notificationsData } = useGetNotificationsQuery({ page: 1, limit: 50 });
  const [avatarErr, setAvatarErr] = useState(false);

  useEffect(() => {
    setLocalReadIds(getLocalReadIds());
    setLocalUnreadIds(getLocalUnreadIds());
    return subscribeLocalReadUpdates(() => {
      setLocalReadIds(getLocalReadIds());
      setLocalUnreadIds(getLocalUnreadIds());
    });
  }, []);

  useEffect(() => {
    setAvatarErr(false);
  }, [user?.avatarUrl]);

  const unreadCount = useMemo(() => {
    return (notificationsData?.notifications ?? []).filter((n) => {
      if (localUnreadIds.has(n._id)) return true;
      if (localReadIds.has(n._id)) return false;
      return !n.readAt;
    }).length;
  }, [notificationsData?.notifications, localReadIds, localUnreadIds]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onCloseMobile?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [mobileOpen, onCloseMobile]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const initials = (user?.name ?? "RC")
    .split(" ")
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
  const avatarUrl = user?.avatarUrl ?? null;

  const closeMobile = () => onCloseMobile?.();

  return (
    <Tooltip.Provider delayDuration={300}>
      {mobileOpen ? (
        <motion.button
          type="button"
          aria-label="Close menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      ) : null}

      <aside
        style={{ fontFamily: appleSans }}
        className={cn(
          "fixed top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-black/[0.06] bg-white/90 backdrop-blur-2xl dark:border-white/[0.05] dark:bg-[#0d1117]/95",
          "transition-[transform,width] duration-300 ease-out md:duration-[250ms] md:ease-in-out",
          collapsed ? "w-16" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo — 64px */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-black/[0.06] dark:border-slate-700",
            collapsed ? "justify-center px-0" : "justify-start pl-5 pr-3",
          )}
        >
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30 text-white">
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </span>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50">Umurava</p>
                <p className="text-[11px] font-medium leading-tight text-slate-400 dark:text-slate-500">AI Hiring</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Scrollable nav */}
        <div className="sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-4">
          <p
            className={cn(
              "mb-4 px-5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#8e8e93] dark:text-slate-400",
              collapsed && "sr-only",
            )}
          >
            Workspace
          </p>

          <nav className="pb-2">
            {primaryLinks.map((link) => (
              <NavLinkRow
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                active={isActive(link.href)}
                collapsed={collapsed}
                badgeCount={0}
                showBadge={false}
                onNavigate={closeMobile}
              />
            ))}

            <div className="my-2 mx-2 h-px bg-black/[0.06] dark:bg-slate-700" aria-hidden />

            {secondaryLinks.map((link) => (
              <NavLinkRow
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                active={isActive(link.href)}
                collapsed={collapsed}
                badgeCount={unreadCount}
                showBadge={link.showBadge}
                onNavigate={closeMobile}
              />
            ))}
          </nav>
        </div>

        {/* User + beta */}
        <div className="shrink-0 border-t border-black/[0.06] dark:border-slate-700">
          <UserAccountDropdown align="start" side="top">
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-[10px] p-3 text-left transition-colors duration-150 ease-out",
                "hover:cursor-pointer hover:bg-black/[0.04]",
                collapsed && "justify-center p-2",
              )}
            >
              {avatarUrl && !avatarErr ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]"
                  onError={() => setAvatarErr(true)}
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20">
                  {initials}
                </span>
              )}
              {!collapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#1d1d1f] dark:text-slate-100">{user?.name ?? "Recruiter"}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8e8e93] dark:text-slate-400">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#34c759]" aria-hidden />
                    Online
                  </p>
                </div>
              ) : null}
            </button>
          </UserAccountDropdown>

          {!collapsed ? (
            <p className="px-3 pb-3 text-center text-[10px] text-[#c7c7cc] dark:text-slate-500">v1.0 Beta</p>
          ) : (
            <p className="px-1 pb-2 text-center text-[9px] leading-tight text-[#c7c7cc] dark:text-slate-500">Beta</p>
          )}
        </div>
      </aside>
    </Tooltip.Provider>
  );
};
