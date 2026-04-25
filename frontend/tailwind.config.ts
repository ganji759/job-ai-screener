import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — vivid indigo/violet. Keeps "tech" trust, adds joy/warmth vs plain blue.
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        // Accent — fuchsia/pink. Use sparingly for highlights, CTAs, celebratory states.
        accent: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75",
        },
        // Mint — fresh success green with warmth (not the old emerald-900 corporate tone).
        mint: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        // Sunset — warm amber used for in-progress / pending states. More joyful than amber-800.
        sunset: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
      backgroundImage: {
        // Utility gradients for joyful cards / hero sections.
        "joy-light": "linear-gradient(135deg, #fef3f2 0%, #fffbeb 28%, #f0fdfa 60%, #eef2ff 100%)",
        "joy-dark": "linear-gradient(135deg, #0b0720 0%, #120d2e 40%, #1e1347 75%, #112042 100%)",
        "brand-soft": "linear-gradient(135deg, #eef2ff 0%, #f5d0fe 100%)",
        "brand-bold": "linear-gradient(135deg, #6366f1 0%, #d946ef 100%)",
      },
      boxShadow: {
        "brand-sm": "0 1px 2px 0 rgb(99 102 241 / 0.10)",
        brand: "0 8px 24px -6px rgb(99 102 241 / 0.28)",
        "accent-glow": "0 0 0 0 rgb(217 70 239 / 0.0), 0 10px 30px -10px rgb(217 70 239 / 0.45)",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "gradient-shift": "gradient-shift 12s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
