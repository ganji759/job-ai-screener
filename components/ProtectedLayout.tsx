"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "../lib/api";
import { AppShell } from "./layout/AppShell";

export const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50/50">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" aria-hidden />
          <p className="text-sm font-medium">Loading secure workspace…</p>
        </div>
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
};
