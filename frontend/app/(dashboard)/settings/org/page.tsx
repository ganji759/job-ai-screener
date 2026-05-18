import { Suspense } from "react";
import { OrgSettingsSection } from "../../../../components/settings/OrgSettingsSection";

export const metadata = { title: "Organisation — HERON" };

export default function OrgSettingsPage() {
  return (
    <div className="fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <div className="eyebrow mb-[10px]">Workspace · Account</div>
        <h1 className="display m-0" style={{ fontSize: 32 }}>Organisation.</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
          Team members, billing, and workspace details.
        </p>
      </div>
      <div className="panel panel-lg">
        <Suspense
          fallback={
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
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
