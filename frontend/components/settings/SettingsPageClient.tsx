"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bot, DoorOpen, Palette, PlugZap, Shield, User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountSettingsSection } from "./AccountSettingsSection";
import { AiSettingsSection } from "./AiSettingsSection";
import { AppearanceSettingsSection } from "./AppearanceSettingsSection";
import { GoogleCalendarSection } from "./GoogleCalendarSection";
import { NotificationSettingsSection } from "./NotificationSettingsSection";
import { ProfileSettingsSection } from "./ProfileSettingsSection";
import { SecuritySettingsSection } from "./SecuritySettingsSection";
import { cn } from "../../lib/utils";

const NAV = [
  { id: "profile",      label: "Profile",                   icon: User     },
  { id: "security",     label: "Security",                  icon: Shield   },
  { id: "notifications",label: "Notification Preferences",  icon: Bell     },
  { id: "ai",           label: "AI Preferences",            icon: Bot      },
  { id: "appearance",   label: "Appearance",                icon: Palette  },
  { id: "integrations", label: "Integrations",              icon: PlugZap  },
  { id: "account",      label: "Account",                   icon: DoorOpen },
] as const;

type SectionId = (typeof NAV)[number]["id"];

function isSection(s: string | null): s is SectionId {
  return !!s && (NAV as readonly { id: string }[]).some((n) => n.id === s);
}

export const SettingsPageClient = () => {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<SectionId>("profile");

  useEffect(() => {
    const q = searchParams.get("section");
    if (isSection(q)) setSection(q);
  }, [searchParams]);

  const content = (() => {
    switch (section) {
      case "profile":
        return <ProfileSettingsSection />;
      case "security":
        return <SecuritySettingsSection />;
      case "notifications":
        return <NotificationSettingsSection />;
      case "ai":
        return <AiSettingsSection />;
      case "appearance":
        return <AppearanceSettingsSection />;
      case "integrations":
        return <GoogleCalendarSection />;
      case "account":
        return <AccountSettingsSection />;
      default:
        return <ProfileSettingsSection />;
    }
  })();

  return (
    <div className="fade-up mx-auto max-w-6xl">
      <div className="mb-6">
        <div className="eyebrow mb-[10px]">Workspace · Account</div>
        <h1 className="display m-0" style={{ fontSize: 32 }}>Settings</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
          Workspace preferences, security, integrations.
        </p>
      </div>
      <div className="panel overflow-hidden">
        {/* Mobile horizontal tabs */}
        <div className="md:hidden" style={{ borderBottom: "1px solid var(--line)", padding: "8px" }}>
          <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn("btn shrink-0", active ? "btn-primary" : "btn-ghost")}
                  style={{ height: 32, fontSize: 12 }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Desktop nav */}
          <nav
            className="hidden w-[240px] shrink-0 flex-col p-3 md:flex"
            style={{ borderRight: "1px solid var(--line)", background: "rgba(0,0,0,.18)" }}
          >
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn("nav-item mb-1", active && "active")}
                  style={{ height: 40, paddingLeft: 12, paddingRight: 12 }}
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "#fff" : "var(--ink-3)" }} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="min-h-[480px] flex-1 p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
