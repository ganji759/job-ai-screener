"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Brain,
  Briefcase,
  Building2,
  CalendarCheck,
  FileBarChart2,
  LayoutGrid,
  Settings,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { getLocalReadIds, getLocalUnreadIds, subscribeLocalReadUpdates } from "../../lib/notificationReadState";
import { cn } from "../../lib/utils";
import { useGetNotificationsQuery } from "../../store/api/notificationsApi";
import { HeronLogo } from "./HeronLogo";

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent?: boolean;
};

const workspaceLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/agent", label: "AI Assistant", icon: Wand2, accent: true },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applicants", label: "Applicants", icon: Users },
  { href: "/screenings", label: "Screenings", icon: Brain },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/interviews", label: "Interviews", icon: CalendarCheck },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart2 },
];

const accountLinks: { href: string; label: string; icon: NavLink["icon"]; showBadge?: boolean }[] = [
  { href: "/notifications", label: "Notifications", icon: Bell, showBadge: true },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/org", label: "Organisation", icon: Building2 },
];

function NavRow({
  href,
  label,
  Icon,
  active,
  collapsed,
  accent,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: NavLink["icon"];
  active: boolean;
  collapsed: boolean;
  accent?: boolean;
  badge?: number;
  onNavigate: () => void;
}) {
  const inner = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("nav-item", active && "active", collapsed && "justify-center px-0")}
      style={collapsed ? { padding: 0, justifyContent: "center" } : undefined}
    >
      <span
        className="inline-flex items-center"
        style={{
          color: active ? "#fff" : accent ? "#c7d2fe" : "var(--ink-3)",
        }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badge && badge > 0 ? (
            <span
              className="mono shrink-0 rounded-full px-[7px] py-[2px] text-center text-[10px] font-semibold"
              style={{
                background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                color: active ? "#fff" : "var(--ink-2)",
                minWidth: 22,
              }}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          ) : accent ? (
            <span
              className="shrink-0 rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "linear-gradient(135deg, #6366f1, #d946ef)",
                boxShadow: "0 0 10px rgba(217,70,239,.7)",
              }}
            />
          ) : null}
        </>
      ) : badge && badge > 0 ? (
        <span
          className="absolute right-1 top-1 rounded-full bg-[#ef4444]"
          style={{ width: 8, height: 8, boxShadow: "0 0 0 2px #0c0c18" }}
        />
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
          className="z-[70] rounded-md bg-[#1d1d1f] px-2 py-1 text-xs font-medium leading-none text-white shadow-md"
        >
          {label}
          <Tooltip.Arrow className="fill-[#1d1d1f]" width={10} height={5} />
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
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [localUnreadIds, setLocalUnreadIds] = useState<Set<string>>(new Set());
  const { data: notificationsData } = useGetNotificationsQuery({ page: 1, limit: 50 });

  useEffect(() => {
    setLocalReadIds(getLocalReadIds());
    setLocalUnreadIds(getLocalUnreadIds());
    return subscribeLocalReadUpdates(() => {
      setLocalReadIds(getLocalReadIds());
      setLocalUnreadIds(getLocalUnreadIds());
    });
  }, []);

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
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "sidebar-surface fixed top-0 z-50 flex h-screen flex-col overflow-hidden",
          "transition-[transform,width] duration-300 ease-out md:duration-[250ms] md:ease-in-out",
          collapsed ? "w-[72px]" : "w-[252px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center gap-3 border-b px-3 pb-[18px] pt-[18px]",
            collapsed && "justify-center px-0",
          )}
          style={{ borderColor: "var(--line)" }}
        >
          <HeronLogo size={collapsed ? 28 : 32} />
          {!collapsed ? (
            <div className="min-w-0">
              <p
                className="display text-base leading-tight"
                style={{ fontWeight: 700, letterSpacing: "-0.02em" }}
              >
                HERON
              </p>
              <p
                className="mono text-[10.5px] leading-tight"
                style={{ color: "var(--ink-4)", letterSpacing: "0.12em", textTransform: "uppercase" }}
              >
                AI Hiring
              </p>
            </div>
          ) : null}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-[2px] overflow-y-auto overflow-x-hidden px-[14px] pb-3">
          {!collapsed ? <p className="nav-section">Workspace</p> : <div className="pt-3" />}
          {workspaceLinks.map((link) => (
            <NavRow
              key={link.href}
              href={link.href}
              label={link.label}
              Icon={link.icon}
              active={isActive(link.href)}
              collapsed={collapsed}
              accent={link.accent}
              onNavigate={closeMobile}
            />
          ))}

          {!collapsed ? <p className="nav-section">Account</p> : <div className="my-2 h-px" style={{ background: "var(--line)" }} />}
          {accountLinks.map((link) => (
            <NavRow
              key={link.href}
              href={link.href}
              label={link.label}
              Icon={link.icon}
              active={isActive(link.href)}
              collapsed={collapsed}
              badge={link.showBadge ? unreadCount : undefined}
              onNavigate={closeMobile}
            />
          ))}
        </nav>

        {!collapsed ? (
          <div
            className="m-[14px] mt-3 rounded-[14px] p-[14px]"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,.18), rgba(217,70,239,.14))",
              border: "1px solid rgba(99,102,241,.32)",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-[14px] w-[14px] text-white" strokeWidth={2} />
              <span
                className="mono text-[10px] font-semibold tracking-[0.14em]"
                style={{ textTransform: "uppercase", color: "#fff" }}
              >
                Pro · 14 days left
              </span>
            </div>
            <p className="mb-[10px] text-[12.5px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>
              Unlock unlimited screenings & SSO.
            </p>
            <Link
              href="/settings?tab=billing"
              className="btn btn-primary w-full justify-center"
              style={{ height: 32, fontSize: 12 }}
            >
              Upgrade plan
            </Link>
          </div>
        ) : (
          <div className="mx-auto mb-[14px] mt-3">
            <Link
              href="/settings?tab=billing"
              className="flex h-9 w-9 items-center justify-center rounded-[10px]"
              style={{
                background: "linear-gradient(135deg, #6366f1, #d946ef)",
                boxShadow: "0 8px 24px -8px rgba(217,70,239,.55)",
              }}
              aria-label="Upgrade plan"
            >
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
            </Link>
          </div>
        )}
      </aside>
    </Tooltip.Provider>
  );
};
