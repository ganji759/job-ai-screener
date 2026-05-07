import { Suspense } from "react";
import { OrgSettingsSection } from "../../../../components/settings/OrgSettingsSection";

export const metadata = { title: "Organisation — HERON" };

export default function OrgSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-slate-200/80 bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,0.08)] dark:border-slate-700/60 dark:bg-slate-900">
        <Suspense
          fallback={
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          }
        >
          <OrgSettingsSection />
        </Suspense>
      </div>
    </div>
  );
}
