"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AppearanceMode = "light" | "dark" | "system";

interface ThemeContextValue {
  appearanceMode: AppearanceMode;
  setAppearanceMode: (mode: AppearanceMode) => void;
  resolvedTheme: "light" | "dark";
  /** Same as resolvedTheme (legacy for Header and other callers) */
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_MODE = "umurava_theme_mode";
const STORAGE_LEGACY = "umurava_theme";

export function resolveAppearance(mode: AppearanceMode): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(() => {
    if (typeof window === "undefined") return "system";
    const savedMode = localStorage.getItem(STORAGE_MODE) as AppearanceMode | null;
    const legacy = localStorage.getItem(STORAGE_LEGACY) as "light" | "dark" | null;
    if (savedMode === "light" || savedMode === "dark" || savedMode === "system") return savedMode;
    if (legacy === "light" || legacy === "dark") return legacy;
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const resolved = resolveAppearance(appearanceMode);
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.dataset.theme = resolved;
    localStorage.setItem(STORAGE_LEGACY, resolved);
    localStorage.setItem(STORAGE_MODE, appearanceMode);
  }, [appearanceMode]);

  useEffect(() => {
    if (appearanceMode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const resolved = resolveAppearance("system");
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      document.documentElement.dataset.theme = resolved;
      localStorage.setItem(STORAGE_LEGACY, resolved);
    };
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [appearanceMode]);

  const setAppearanceMode = useCallback((mode: AppearanceMode) => {
    setAppearanceModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setAppearanceModeState((prev) => {
      const r = resolveAppearance(prev);
      return r === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({
      appearanceMode,
      setAppearanceMode,
      resolvedTheme,
      theme: resolvedTheme,
      toggleTheme,
    }),
    [appearanceMode, setAppearanceMode, resolvedTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
