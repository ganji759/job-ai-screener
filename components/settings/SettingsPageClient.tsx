"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bot, DoorOpen, Palette, Shield, User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountSettingsSection } from "./AccountSettingsSection";
import { AiSettingsSection } from "./AiSettingsSection";
import { AppearanceSettingsSection } from "./AppearanceSettingsSection";
import { NotificationSettingsSection } from "./NotificationSettingsSection";
import { ProfileSettingsSection } from "./ProfileSettingsSection";
import { SecuritySettingsSection } from "./SecuritySettingsSection";
import { cn } from "../../lib/utils";

const NAV = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notification Preferences", icon: Bell },
  { id: "ai", label: "AI Preferences", icon: Bot },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account", label: "Account", icon: DoorOpen },
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
      case "account":
        return <AccountSettingsSection />;
      default:
        return <ProfileSettingsSection />;
    }
  })();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-800/40 dark:shadow-none">
        {/* Mobile horizontal tabs */}
        <div className="border-b border-slate-200 bg-white px-2 py-2 md:hidden dark:border-slate-700 dark:bg-slate-800">
          <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition",
                    active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
                  )}
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
          <nav className="hidden w-[240px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/30 md:flex">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "mb-1 flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition",
                    active
                      ? "bg-brand-600 font-bold text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-brand-600 dark:text-brand-400")} />
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
