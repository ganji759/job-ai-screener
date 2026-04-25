import { Suspense } from "react";
import { SettingsPageClient } from "../../../components/settings/SettingsPageClient";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading settings…</div>}>
        <SettingsPageClient />
      </Suspense>
    </div>
  );
}
