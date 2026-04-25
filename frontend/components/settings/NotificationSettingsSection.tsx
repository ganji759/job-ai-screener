"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Briefcase,
  ClipboardCheck,
  FileWarning,
  ListChecks,
  LogIn,
  Shield,
  Upload,
  UserCheck,
} from "lucide-react";
import { Button } from "../ui/Button";
import { defaultNotificationPrefs, loadNotificationPrefs, saveNotificationPrefs, type NotificationPrefs } from "../../lib/settingsStorage";
import { Divider, LockHint, SectionHeader, SwitchToggle } from "./primitives";
type RowProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
};

const Row = ({ icon, title, description, checked, onChange, locked }: RowProps) => (
  <div className="flex items-start gap-3 rounded-lg border border-transparent py-2 pr-2 transition hover:border-slate-100 hover:bg-slate-50/80 dark:hover:border-slate-700 dark:hover:bg-slate-800/40">
    <span className="mt-0.5 text-brand-600 dark:text-brand-400">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
        {locked ? <LockHint /> : null}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
    <SwitchToggle checked={locked ? true : checked} onChange={onChange} locked={locked} />
  </div>
);

export const NotificationSettingsSection = () => {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);

  useEffect(() => {
    setPrefs(loadNotificationPrefs());
  }, []);

  const patch = (partial: Partial<NotificationPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...partial };
      saveNotificationPrefs(next);
      return next;
    });
  };

  const save = () => {
    saveNotificationPrefs(prefs);
    toast.success("Preferences saved");
  };

  return (
    <div>
      <SectionHeader title="Notification Preferences" subtitle="Choose what you want to be notified about" />

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Screening Notifications</h3>
          <div className="space-y-1">
            <Row
              icon={<ClipboardCheck className="h-5 w-5" />}
              title="Screening completed"
              description="When a screening run finishes and results are ready."
              checked={prefs.screeningCompleted}
              onChange={(v) => patch({ screeningCompleted: v })}
            />
            <Row
              icon={<FileWarning className="h-5 w-5" />}
              title="Screening failed"
              description="When AI screening fails and needs a retry."
              checked={prefs.screeningFailed}
              onChange={(v) => patch({ screeningFailed: v })}
            />
            <Row
              icon={<ListChecks className="h-5 w-5" />}
              title="New shortlist ready for review"
              description="When a shortlist is ready for recruiter review."
              checked={prefs.shortlistReady}
              onChange={(v) => patch({ shortlistReady: v })}
            />
          </div>
        </div>

        <Divider />

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Job Notifications</h3>
          <div className="space-y-1">
            <Row
              icon={<Briefcase className="h-5 w-5" />}
              title="Job published successfully"
              description="Confirmation when a job becomes active."
              checked={prefs.jobPublished}
              onChange={(v) => patch({ jobPublished: v })}
            />
            <Row
              icon={<Briefcase className="h-5 w-5" />}
              title="Job status changed"
              description="Draft, active, or closed transitions."
              checked={prefs.jobStatusChanged}
              onChange={(v) => patch({ jobStatusChanged: v })}
            />
            <Row
              icon={<Briefcase className="h-5 w-5" />}
              title="Job closed"
              description="When a job posting is closed."
              checked={prefs.jobClosed}
              onChange={(v) => patch({ jobClosed: v })}
            />
          </div>
        </div>

        <Divider />

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Applicant Notifications</h3>
          <div className="space-y-1">
            <Row
              icon={<Upload className="h-5 w-5" />}
              title="New applicants uploaded"
              description="Bulk uploads and new profiles added to jobs."
              checked={prefs.applicantsUploaded}
              onChange={(v) => patch({ applicantsUploaded: v })}
            />
            <Row
              icon={<UserCheck className="h-5 w-5" />}
              title="Applicant status changed"
              description="Screening outcomes and status updates."
              checked={prefs.applicantStatusChanged}
              onChange={(v) => patch({ applicantStatusChanged: v })}
            />
          </div>
        </div>

        <Divider />

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">System Notifications</h3>
          <div className="space-y-1">
            <Row
              icon={<LogIn className="h-5 w-5" />}
              title="Login activity"
              description="Alerts when your account signs in."
              checked={prefs.loginActivity}
              onChange={() => {}}
              locked
            />
            <Row
              icon={<Shield className="h-5 w-5" />}
              title="Account changes"
              description="Security and profile updates to your workspace."
              checked={prefs.accountChanges}
              onChange={() => {}}
              locked
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button type="button" onClick={save}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
};
