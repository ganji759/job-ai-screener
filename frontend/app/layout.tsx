import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import { ToastStack } from "../components/ui/Toast";

export const metadata: Metadata = {
  title: "HERON — Hiring Evaluation & Ranking for Optimized Networks",
  description: "AI-powered candidate screening, transparent scoring, and automated interview scheduling for modern recruiters.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <ToastStack />
          <Toaster
            position="top-right"
            toastOptions={{
              className: "!rounded-2xl !border !border-brand-200 !bg-white !text-slate-800 !shadow-brand",
              success: { iconTheme: { primary: "#2563eb", secondary: "#ffffff" } },
              error: { iconTheme: { primary: "#dc2626", secondary: "#ffffff" } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
