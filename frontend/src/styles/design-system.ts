export const designSystem = {
  colors: {
    primary: "#2563EB",
    primaryDark: "#1D4ED8",
    primaryLight: "#EFF6FF",
    accent: "#7C3AED",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    surface: "#FFFFFF",
    background: "#F8FAFC",
    border: "#E2E8F0",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#94A3B8",
  },
  darkColors: {
    primary: "#3B82F6",
    primaryLight: "#1E3A5F",
    surface: "#1E293B",
    background: "#0F172A",
    border: "#334155",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
    textMuted: "#475569",
  },
} as const;

export type DesignSystem = typeof designSystem;
