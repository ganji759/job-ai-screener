"use client";

import { useState } from "react";
import { useMeQuery } from "../../../store/api/authApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Textarea } from "../../../components/ui/Textarea";
import { Button } from "../../../components/ui/Button";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: user } = useMeQuery();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("Umurava");
  const [title, setTitle] = useState("Recruiter");
  const [bio, setBio] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="Manage your account and personal information." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <span className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
              {(user?.name ?? "RC")
                .split(" ")
                .slice(0, 2)
                .map((s) => s.charAt(0).toUpperCase())
                .join("")}
            </span>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user?.name ?? "Recruiter"}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
            <span className="mt-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-slate-700 dark:text-slate-100">Recruiter</span>
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
          <Button className="mt-5" onClick={() => toast.success("Profile saved locally (API update ready).")}>
            Save Changes
          </Button>
        </Card>
      </div>
    </div>
  );
}
