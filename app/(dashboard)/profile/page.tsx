"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Upload } from "lucide-react";
import { useMeQuery, useUpdateMeMutation } from "../../../store/api/authApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Textarea } from "../../../components/ui/Textarea";
import { Button } from "../../../components/ui/Button";
import toast from "react-hot-toast";
import { compressImageFileToJpegDataUrl } from "../../../lib/utils";

export default function ProfilePage() {
  const { data: user } = useMeQuery();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("Umurava");
  const [title, setTitle] = useState("Recruiter");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarFromLink, setAvatarFromLink] = useState("");
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setAvatarUrl(user?.avatarUrl ?? null);
  }, [user?.avatarUrl, user?.email, user?.name]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarUrl]);

  const initials = (user?.name ?? "RC")
    .split(" ")
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  const handleLocalUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image file should be 8MB or less.");
      return;
    }
    try {
      const dataUrl = await compressImageFileToJpegDataUrl(file);
      if (dataUrl.length > 7_500_000) {
        toast.error("Image is still too large after processing. Try a smaller file.");
        return;
      }
      setAvatarUrl(dataUrl);
      setAvatarLoadError(false);
      toast.success("Profile photo selected.");
    } catch {
      toast.error("Could not process this image. Try another file.");
    }
  };

  const applyImageLink = () => {
    const link = avatarFromLink.trim();
    if (!link) return;
    if (!/^https?:\/\/.+/i.test(link)) {
      toast.error("Please enter a valid image URL.");
      return;
    }
    const img = new Image();
    img.onload = () => {
      setAvatarUrl(link);
      setAvatarFromLink("");
      setAvatarLoadError(false);
      toast.success("Image URL applied.");
    };
    img.onerror = () => {
      toast.error("Image URL could not be loaded. Please use a direct image link (jpg/png/webp).");
    };
    img.src = link;
  };

  const saveProfile = async () => {
    if (avatarUrl?.startsWith("data:image/") && avatarUrl.length > 900_000) {
      toast.error("Selected photo is too large to save. Please choose a smaller image.");
      return;
    }
    try {
      await updateMe({ name: name.trim(), avatarUrl }).unwrap();
      toast.success("Profile updated.");
    } catch (error: unknown) {
      const err = error as { data?: unknown; status?: string | number };
      let parsed: string | undefined;
      if (typeof err.data === "string") parsed = err.data;
      else if (err.data && typeof err.data === "object" && "error" in err.data) {
        parsed = String((err.data as { error: string }).error);
      }
      if (parsed === "Network Error" || err.status === "FETCH_ERROR") {
        toast.error("Could not reach the server. If you uploaded a photo, ensure the API is running and try again.");
        return;
      }
      toast.error(parsed ?? "Failed to update profile.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="Manage your account and personal information." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 h-24 w-24 overflow-hidden rounded-full bg-brand-600">
              {avatarUrl && !avatarLoadError ? (
                <img
                  src={avatarUrl}
                  alt="Profile avatar"
                  className="h-full w-full object-cover"
                  onError={() => {
                    setAvatarLoadError(true);
                    toast.error("Profile image could not be displayed. Falling back to initials.");
                  }}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">{initials}</span>
              )}
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user?.name ?? "Recruiter"}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
            <span className="mt-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-slate-700 dark:text-slate-100">Recruiter</span>
            <div className="mt-4 w-full space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleLocalUpload(file);
                }}
              />
              <Button type="button" variant="secondary" className="w-full rounded-lg" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Upload from device
              </Button>
              <div className="flex items-center gap-2">
                <Input value={avatarFromLink} onChange={(e) => setAvatarFromLink(e.target.value)} placeholder="Paste image URL..." />
                <Button type="button" variant="secondary" className="rounded-lg px-3" onClick={applyImageLink}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Remove photo and use initials
                </button>
              ) : null}
            </div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Personal Information</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Input label="Job Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="md:col-span-2">
              <Textarea label="Bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>
          <Button className="mt-5 rounded-lg" onClick={() => void saveProfile()} loading={isLoading}>
            Save Changes
          </Button>
        </Card>
      </div>
    </div>
  );
}
