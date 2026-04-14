import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Profile, preferences, and system options." />
      <Card>
        <p className="text-sm leading-relaxed text-slate-600">
          Settings module ready for production extension. Connect notifications, branding, and API keys from here in a future
          iteration.
        </p>
      </Card>
    </div>
  );
}
