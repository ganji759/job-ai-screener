"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Download, LogOut, Trash2 } from "lucide-react";
import { useMeQuery, useDeleteAccountMutation } from "../../store/api/authApi";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { axiosInstance } from "../../lib/axios";
import { clearToken } from "../../lib/auth";
import { Divider, SectionHeader, fieldClass } from "./primitives";
import { cn } from "../../lib/utils";

function csvEscape(s: unknown): string {
  const t = String(s ?? "");
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

export const AccountSettingsSection = () => {
  const router = useRouter();
  const { data: user } = useMeQuery();
  const [deleteAccount, { isLoading: deleting }] = useDeleteAccountMutation();

  const [exporting, setExporting] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const exportData = async () => {
    setExporting(true);
    try {
      const jobsRes = await axiosInstance.get<{ jobs: { _id: string; title: string; status: string; createdAt: string }[] }>("/jobs", {
        params: { limit: 500, page: 1 },
      });
      const jobs = jobsRes.data.jobs ?? [];
      const scrRes = await axiosInstance.get<{ screenings: Record<string, unknown>[] }>("/screenings");
      const screenings = scrRes.data.screenings ?? [];

      const applicantRows: string[][] = [["applicant_id", "job_id", "name", "email", "status", "createdAt"]];
      for (const job of jobs) {
        const apRes = await axiosInstance.get<{ applicants: { _id: string; jobId: string; status: string; createdAt: string; profile: { firstName?: string; lastName?: string; email?: string } }[] }>(
          "/applicants",
          { params: { jobId: job._id, limit: 5000, page: 1 } },
        );
        const applicants = apRes.data.applicants ?? [];
        for (const a of applicants) {
          const name = `${a.profile?.firstName ?? ""} ${a.profile?.lastName ?? ""}`.trim();
          applicantRows.push([a._id, a.jobId, name, a.profile?.email ?? "", a.status, a.createdAt]);
        }
      }

      const jobRows: string[][] = [["job_id", "title", "status", "createdAt"]];
      for (const j of jobs) {
        jobRows.push([j._id, j.title, j.status, j.createdAt]);
      }

      const scrRows: string[][] = [["screening_id", "jobId", "status", "shortlistSize"]];
      for (const s of screenings) {
        scrRows.push([
          String(s._id ?? s.screeningId ?? ""),
          String(s.jobId ?? ""),
          String(s.status ?? s.displayStatus ?? ""),
          String(s.shortlistSize ?? s.shortlistedCount ?? ""),
        ]);
      }

      const blob = new Blob(
        [
          "# JOBS\n",
          toCsv(jobRows),
          "\n\n# APPLICANTS\n",
          toCsv(applicantRows),
          "\n\n# SCREENINGS\n",
          toCsv(scrRows),
        ],
        { type: "text/csv;charset=utf-8" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `umurava-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const logout = () => {
    clearToken();
    setLogoutOpen(false);
    router.push("/login");
  };

  const removeAccount = async () => {
    if (!user?.email) return;
    try {
      await deleteAccount({ email: confirmEmail.trim() }).unwrap();
      toast.success("Account deleted");
      clearToken();
      router.push("/login");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { error?: string } }).data?.error ?? "Failed")
          : "Could not delete account";
      toast.error(msg);
    }
  };

  return (
    <div>
      <SectionHeader title="Account Settings" subtitle="Manage your account and data" />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Account Information</h3>
      <dl className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-800/50">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-slate-500">Account type</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{user?.role === "admin" ? "Admin" : "Recruiter"}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-slate-500">Member since</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{memberSince}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-slate-500">Account ID</dt>
          <dd className="max-w-[200px] truncate font-mono text-xs text-slate-800 dark:text-slate-200">{user?.id ?? "—"}</dd>
        </div>
      </dl>

      <Divider />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Export My Data</h3>
      <p className="mt-1 text-sm text-slate-500">Download all your jobs, applicants, and screening data as a CSV export.</p>
      <Button type="button" variant="secondary" className="mt-4" loading={exporting} onClick={() => void exportData()}>
        <Download className="h-4 w-4" />
        Export Data
      </Button>

      <Divider />

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Logout</h3>
      <p className="mt-1 text-sm text-slate-500">Sign out of your current session.</p>
      <Button type="button" variant="secondary" className="mt-4" onClick={() => setLogoutOpen(true)}>
        <LogOut className="h-4 w-4" />
        Logout
      </Button>

      <Divider />

      <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
        <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button type="button" variant="danger" className="mt-4" onClick={() => { setDeleteOpen(true); setConfirmEmail(""); }}>
          <Trash2 className="h-4 w-4" />
          Delete Account
        </Button>
      </div>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Are you sure you want to logout?</h3>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setLogoutOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={logout}>
            Logout
          </Button>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete your account?</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Type your email address to confirm.</p>
        <input
          className={cn(fieldClass, "mt-4")}
          autoComplete="off"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder={user?.email ?? "you@company.com"}
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deleting}
            disabled={!user?.email || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()}
            onClick={() => void removeAccount()}
          >
            Confirm delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};
