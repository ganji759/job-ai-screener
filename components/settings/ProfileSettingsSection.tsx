"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useMeQuery, useUpdateMeMutation } from "../../store/api/authApi";
import { Button } from "../ui/Button";
import { cn, compressImageFileToJpegDataUrl } from "../../lib/utils";
import { defaultExtraProfile, loadExtraProfile, saveExtraProfile, type ExtraProfile } from "../../lib/settingsStorage";
import { Divider, SectionHeader, fieldClass } from "./primitives";

const CODES = ["+1", "+44", "+250", "+254", "+27", "+91", "+86", "+33", "+49", "+81", "+61"];

function splitName(full: string): { first: string; last: string } {
  const p = full.trim().split(/\s+/);
  if (!p.length) return { first: "", last: "" };
  if (p.length === 1) return { first: p[0], last: "" };
  return { first: p[0], last: p.slice(1).join(" ") };
}

export const ProfileSettingsSection = () => {
  const { data: user } = useMeQuery();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [extra, setExtra] = useState<ExtraProfile>(defaultExtraProfile);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState(false);

  useEffect(() => {
    const loaded = loadExtraProfile();
    setExtra(loaded);
  }, []);

  useEffect(() => {
    if (!user) return;
    const loaded = loadExtraProfile();
    const { first, last } = splitName(user.name);
    setFirstName(loaded.firstName || first);
    setLastName(loaded.lastName || last);
    setEmail(user.email);
    setAvatarUrl(user.avatarUrl ?? null);
    setAvatarErr(false);
    setExtra(loaded);
  }, [user?.id, user?.name, user?.email, user?.avatarUrl]);

  const initials = (user?.name ?? "RC")
    .split(" ")
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  const onPickFile = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      toast.error("Please choose a JPG or PNG image.");
      return;
    }
    try {
      const dataUrl = await compressImageFileToJpegDataUrl(file);
      setAvatarUrl(dataUrl);
      setAvatarErr(false);
    } catch {
      toast.error("Could not process this image.");
    }
  };

  const save = async () => {
    const name = `${firstName.trim()} ${lastName.trim()}`.trim() || user?.name || "Recruiter";
    const nextExtra: ExtraProfile = {
      ...extra,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: extra.phone,
      phoneCountryCode: extra.phoneCountryCode,
      jobTitle: extra.jobTitle,
      company: extra.company,
      location: extra.location,
      emailVerified: extra.emailVerified,
    };
    try {
      await updateMe({ name, avatarUrl }).unwrap();
      saveExtraProfile(nextExtra);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Could not save profile.");
    }
  };

  const cancel = () => {
    if (!user) return;
    const loaded = loadExtraProfile();
    setExtra(loaded);
    const { first, last } = splitName(user.name);
    setFirstName(loaded.firstName || first);
    setLastName(loaded.lastName || last);
    setEmail(user.email);
    setAvatarUrl(user.avatarUrl ?? null);
    setAvatarErr(false);
  };

  return (
    <div>
      <SectionHeader title="Profile Information" subtitle="Update your personal details and public profile" />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center sm:items-start">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-brand-600">
            {avatarUrl && !avatarErr ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setAvatarErr(true)} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-bold text-white">{initials}</span>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && void onPickFile(e.target.files[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-3 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Change Photo
          </button>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-red-600 hover:underline"
            onClick={() => {
              setAvatarUrl(null);
              setAvatarErr(false);
            }}
          >
            Remove Photo
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name</span>
              <input className={fieldClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</span>
              <input className={fieldClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</span>
            <div className="flex flex-wrap items-center gap-2">
              <input className={fieldClass} value={email} readOnly disabled />
              {extra.emailVerified ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Verified</span>
              ) : null}
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</span>
            <div className="flex gap-2">
              <select
                className={cn(fieldClass, "!max-w-[120px]")}
                value={extra.phoneCountryCode}
                onChange={(e) => setExtra((x) => ({ ...x, phoneCountryCode: e.target.value }))}
              >
                {CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className={fieldClass}
                value={extra.phone}
                onChange={(e) => setExtra((x) => ({ ...x, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Job Title / Role</span>
            <input
              className={fieldClass}
              value={extra.jobTitle}
              onChange={(e) => setExtra((x) => ({ ...x, jobTitle: e.target.value }))}
              placeholder="Senior Recruiter"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Company / Organization</span>
            <input className={fieldClass} value={extra.company} onChange={(e) => setExtra((x) => ({ ...x, company: e.target.value }))} />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</span>
            <input className={fieldClass} value={extra.location} onChange={(e) => setExtra((x) => ({ ...x, location: e.target.value }))} />
          </label>
        </div>
      </div>

      <Divider />

      <div className="flex flex-wrap gap-3">
        <Button type="button" loading={isLoading} onClick={() => void save()}>
          Save Changes
        </Button>
        <Button type="button" variant="secondary" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
