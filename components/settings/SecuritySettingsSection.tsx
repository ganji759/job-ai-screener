"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, Monitor } from "lucide-react";
import { useChangePasswordMutation } from "../../store/api/authApi";
import { Button } from "../ui/Button";
import { defaultSecurityPrefs, loadSecurityPrefs, saveSecurityPrefs } from "../../lib/settingsStorage";
import { Divider, SectionHeader, SwitchToggle } from "./primitives";
import { cn } from "../../lib/utils";

type SessionRow = { id: string; device: string; location: string; when: string; current: boolean };

const initialSessions: SessionRow[] = [
  { id: "s1", device: "Chrome · Windows", location: "Nairobi, Kenya", when: new Date().toLocaleString(), current: true },
  { id: "s2", device: "Safari · macOS", location: "Kigali, Rwanda", when: "Apr 12, 2026, 9:14 AM", current: false },
];

function passwordStrength(p: string): { level: "weak" | "fair" | "strong"; pct: number } {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const pct = (score / 5) * 100;
  if (score <= 2) return { level: "weak", pct };
  if (score <= 4) return { level: "fair", pct };
  return { level: "strong", pct };
}

const PasswordInput = ({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-11 w-full rounded-lg border border-[#e5e7eb] bg-white py-2 pl-3 pr-11 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
            error && "border-red-400",
          )}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
};

export const SecuritySettingsSection = () => {
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [sec, setSec] = useState(defaultSecurityPrefs);
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  useEffect(() => {
    setSec(loadSecurityPrefs());
  }, []);

  const strength = passwordStrength(newPw);
  const strengthColor =
    strength.level === "weak" ? "bg-red-500" : strength.level === "fair" ? "bg-amber-500" : "bg-emerald-500";
  const strengthLabel = strength.level === "weak" ? "Weak" : strength.level === "fair" ? "Fair" : "Strong";

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!newPw.trim()) {
      setErrors({});
      return false;
    }
    if (!currentPw) e.current = "Current password is required";
    const newValid =
      newPw.length >= 8 && /[A-Z]/.test(newPw) && /[a-z]/.test(newPw) && /\d/.test(newPw) && /[^A-Za-z0-9]/.test(newPw);
    if (!newValid) e.new = "Min 8 characters with uppercase, lowercase, number, and special character";
    if (newPw && confirmPw !== newPw) e.confirm = "Passwords do not match";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const updatePw = async () => {
    if (!newPw.trim()) {
      toast.error("Enter a new password.");
      return;
    }
    if (!validate()) {
      toast.error("Fix validation errors before updating.");
      return;
    }
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw }).unwrap();
      toast.success("Password updated");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setErrors({});
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { error?: string } }).data?.error ?? "Failed")
          : "Failed to update password";
      toast.error(msg);
    }
  };

  const toggleOtp = (v: boolean) => {
    const next = { ...sec, otpRequired: v };
    setSec(next);
    saveSecurityPrefs(next);
    toast.success(v ? "OTP requirement enabled" : "Preference saved — login may still require OTP");
  };

  return (
    <div>
      <SectionHeader title="Security Settings" subtitle="Manage your password and account security" />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Change Password</h3>
      <div className="mt-4 max-w-lg space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</span>
          <PasswordInput
            value={currentPw}
            onChange={(v) => {
              setCurrentPw(v);
              setErrors((x) => ({ ...x, current: undefined }));
            }}
            placeholder="••••••••"
            error={errors.current}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</span>
          <PasswordInput value={newPw} onChange={(v) => { setNewPw(v); setErrors({}); }} placeholder="••••••••" error={errors.new} />
          {newPw ? (
            <div className="space-y-1 pt-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className={cn("h-full transition-all duration-300", strengthColor)} style={{ width: `${strength.pct}%` }} />
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Strength: {strengthLabel}</p>
            </div>
          ) : null}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</span>
          <PasswordInput value={confirmPw} onChange={(v) => { setConfirmPw(v); setErrors({}); }} placeholder="••••••••" error={errors.confirm} />
        </label>
        <Button type="button" loading={isLoading} onClick={() => void updatePw()}>
          Update Password
        </Button>
      </div>

      <Divider />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Two-Factor Authentication (OTP)</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {sec.otpRequired ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">OTP Enabled</span>
        ) : (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">OTP Disabled</span>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Your account is secured with OTP verification on every login.</p>
      <div className="mt-4 flex items-center gap-3">
        <SwitchToggle checked={sec.otpRequired} onChange={toggleOtp} />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Require OTP on every login</span>
      </div>

      <Divider />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active Sessions</h3>
      <ul className="mt-4 space-y-3">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/50">
            <div className="flex min-w-0 items-start gap-3">
              <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.device}</p>
                <p className="text-xs text-slate-500">{s.location}</p>
                <p className="text-xs text-slate-400">{s.when}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {s.current ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Current session</span> : null}
              {!s.current ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-brand-600 hover:underline"
                  onClick={() => setSessions((list) => list.filter((x) => x.id !== s.id))}
                >
                  Revoke
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-4 text-sm font-semibold text-red-600 hover:underline"
        onClick={() => setSessions((list) => list.filter((x) => x.current))}
      >
        Revoke all other sessions
      </button>
    </div>
  );
};
