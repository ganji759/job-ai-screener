"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import { Button } from "../ui/Button";
import { useTheme, type AppearanceMode } from "../../hooks/useTheme";
import { defaultAppearancePrefs, loadAppearancePrefs, saveAppearancePrefs, type AppearancePrefs } from "../../lib/settingsStorage";
import { Divider, SectionHeader, SwitchToggle } from "./primitives";
import { cn } from "../../lib/utils";

export const AppearanceSettingsSection = () => {
  const { appearanceMode, setAppearanceMode } = useTheme();
  const [ap, setAp] = useState<AppearancePrefs>(defaultAppearancePrefs);

  useEffect(() => {
    const loaded = loadAppearancePrefs();
    setAp(loaded);
    const collapsed = localStorage.getItem("umurava_sidebar_collapsed") === "true";
    if (collapsed !== loaded.compactSidebar) {
      setAp((p) => ({ ...p, compactSidebar: collapsed }));
    }
  }, []);

  const setCompact = (v: boolean) => {
    setAp((p) => ({ ...p, compactSidebar: v }));
    localStorage.setItem("umurava_sidebar_collapsed", String(v));
    window.dispatchEvent(new Event("umurava-sidebar-sync"));
  };

  const themeCards: { mode: AppearanceMode; title: string; preview: string }[] = [
    { mode: "light", title: "Light", preview: "bg-white border-slate-200" },
    { mode: "dark", title: "Dark", preview: "bg-slate-800 border-slate-600" },
    { mode: "system", title: "System", preview: "bg-gradient-to-r from-white to-slate-800 border-slate-300" },
  ];

  return (
    <div>
      <SectionHeader title="Appearance" subtitle="Customize how the app looks for you" />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Theme</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {themeCards.map((c) => (
          <button
            key={c.mode}
            type="button"
            onClick={() => setAppearanceMode(c.mode)}
            className={cn(
              "relative rounded-xl border-2 p-4 text-left transition duration-300",
              appearanceMode === c.mode ? "border-brand-600 shadow-md ring-2 ring-brand-500/20" : "border-slate-200 hover:border-slate-300 dark:border-slate-600",
            )}
          >
            {appearanceMode === c.mode ? (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <div className={cn("mb-3 h-14 rounded-lg border", c.preview)} />
            <p className="font-semibold text-slate-900 dark:text-slate-100">{c.title}</p>
            <p className="text-xs text-slate-500">
              {c.mode === "light" ? "Default bright interface." : c.mode === "dark" ? "Dark background." : "Follows your device."}
            </p>
          </button>
        ))}
      </div>

      <Divider />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Compact sidebar</h3>
          <p className="text-sm text-slate-500">Collapses sidebar to icons only when enabled.</p>
        </div>
        <SwitchToggle checked={ap.compactSidebar} onChange={setCompact} />
      </div>

      <Divider />

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Date format</span>
          <select
            className="h-11 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            value={ap.dateFormat}
            onChange={(e) => setAp((p) => ({ ...p, dateFormat: e.target.value as AppearancePrefs["dateFormat"] }))}
          >
            <option value="mdy">MM/DD/YYYY</option>
            <option value="dmy">DD/MM/YYYY</option>
            <option value="ymd">YYYY-MM-DD</option>
          </select>
        </label>
        <div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Time format</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {(
              [
                { v: "12" as const, label: "12-hour (AM/PM)" },
                { v: "24" as const, label: "24-hour" },
              ]
            ).map((o) => (
              <label key={o.v} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="timefmt"
                  checked={ap.timeFormat === o.v}
                  onChange={() => setAp((p) => ({ ...p, timeFormat: o.v }))}
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button
          type="button"
          onClick={() => {
            saveAppearancePrefs(ap);
            toast.success("Appearance saved");
          }}
        >
          Save Appearance
        </Button>
      </div>
    </div>
  );
};
