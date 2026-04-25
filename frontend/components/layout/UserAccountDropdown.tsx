"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Settings, User } from "lucide-react";
import { useMeQuery } from "../../store/api/authApi";
import { clearToken } from "../../lib/auth";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

type Align = "start" | "center" | "end";
type Side = "top" | "right" | "bottom" | "left";

export const UserAccountDropdown = ({
  children,
  align = "end",
  side = "bottom",
}: {
  children: React.ReactNode;
  align?: Align;
  side?: Side;
}) => {
  const router = useRouter();
  const { data: user } = useMeQuery();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatarUrl]);

  const initials = (user?.name ?? "RC")
    .split(" ")
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
  const avatarUrl = user?.avatarUrl ?? null;

  const confirmLogout = () => {
    clearToken();
    setLogoutOpen(false);
    router.replace("/login");
  };

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side={side}
            align={align}
            sideOffset={8}
            className="z-[100] w-72 origin-top-right rounded-xl border border-slate-200/90 bg-white p-2 shadow-xl duration-200 dark:border-slate-600 dark:bg-slate-800"
          >
            <div className="pointer-events-none flex flex-col items-center gap-2 border-b border-slate-100 px-2 pb-3 pt-1 dark:border-slate-700">
              {avatarUrl && !avatarLoadError ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-600"
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#007AFF] text-lg font-bold text-white">
                  {initials}
                </span>
              )}
              <div className="text-center">
                <p className="text-sm font-bold text-[#1d1d1f] dark:text-slate-100">{user?.name ?? "Recruiter"}</p>
                <p className="mt-0.5 text-xs text-[#8e8e93] dark:text-slate-400">{user?.email ?? ""}</p>
              </div>
            </div>
            <DropdownMenu.Item
              className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[#3a3a3c] outline-none transition-colors duration-200 hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-slate-700"
              onSelect={() => router.push("/settings?section=profile")}
            >
              <User className="h-4 w-4" />
              My Profile
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[#3a3a3c] outline-none transition-colors duration-200 hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-slate-700"
              onSelect={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-2 h-px bg-slate-200 dark:bg-slate-600" />
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 outline-none transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-950/30"
              onSelect={(e) => {
                e.preventDefault();
                setLogoutOpen(true);
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-slate-100">Are you sure you want to logout?</h3>
        <p className="mt-2 text-sm text-[#8e8e93] dark:text-slate-400">You will need to sign in again to access your workspace.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setLogoutOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={confirmLogout}>
            Logout
          </Button>
        </div>
      </Modal>
    </>
  );
};
