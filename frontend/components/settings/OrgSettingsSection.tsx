"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Building2, Crown, Mail, MoreHorizontal, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { SectionHeader, Divider, fieldClass } from "./primitives";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import {
  useGetOrgQuery,
  useUpdateOrgMutation,
  useInviteMemberMutation,
  useUpdateMemberMutation,
  useRemoveMemberMutation,
  type OrgMember,
} from "../../store/api/orgApi";
import { useMeQuery } from "../../store/api/authApi";
import { cn } from "../../lib/utils";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  recruiter: "Recruiter",
  viewer: "Viewer",
};

const ROLE_BADGE_VARIANT: Record<string, "success" | "info" | "neutral" | "warning"> = {
  owner: "success",
  admin: "info",
  recruiter: "neutral",
  viewer: "warning",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

function RoleIcon({ role }: { role: string }) {
  if (role === "owner") return <Crown className="h-3.5 w-3.5" />;
  if (role === "admin") return <Shield className="h-3.5 w-3.5" />;
  return null;
}

function MemberInitials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
    : name.slice(0, 2);
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold uppercase text-white">
      {initials.toUpperCase()}
    </div>
  );
}

export function OrgSettingsSection() {
  const { data: org, isLoading } = useGetOrgQuery();
  const { data: me } = useMeQuery();
  const [updateOrg, { isLoading: isSaving }] = useUpdateOrgMutation();
  const [inviteMember, { isLoading: isInviting }] = useInviteMemberMutation();
  const [updateMember] = useUpdateMemberMutation();
  const [removeMember] = useRemoveMemberMutation();

  const [orgName, setOrgName] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [memberMenuOpen, setMemberMenuOpen] = useState<string | null>(null);

  // Sync local state when org data loads
  const displayName = orgName || org?.name || "";

  const myMember = org?.members.find((m) => m.email === me?.email);
  const canManage = myMember?.orgRole === "owner" || myMember?.orgRole === "admin";

  const handleSaveOrg = async () => {
    if (!displayName.trim()) return;
    try {
      await updateOrg({ name: displayName.trim() }).unwrap();
      toast.success("Organisation updated.");
    } catch {
      toast.error("Failed to update organisation.");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    try {
      await inviteMember({ email: inviteEmail.trim(), name: inviteName.trim(), orgRole: inviteRole }).unwrap();
      toast.success(`Invite sent to ${inviteEmail}.`);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("recruiter");
    } catch {
      toast.error("Failed to send invite.");
    }
  };

  const handleRoleChange = async (member: OrgMember, newRole: string) => {
    try {
      await updateMember({ memberId: member.id, orgRole: newRole }).unwrap();
      toast.success(`${member.name}'s role updated to ${ROLE_LABELS[newRole]}.`);
    } catch {
      toast.error("Failed to update role.");
    }
    setMemberMenuOpen(null);
  };

  const handleRemove = async (member: OrgMember) => {
    if (!confirm(`Remove ${member.name} from the organisation?`)) return;
    try {
      await removeMember(member.id).unwrap();
      toast.success(`${member.name} removed.`);
    } catch {
      toast.error("Failed to remove member.");
    }
    setMemberMenuOpen(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Organisation"
        subtitle="Manage your organisation details and team members."
      />

      {/* Org info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Organisation name</span>
          <input
            className={fieldClass}
            value={displayName}
            onChange={(e) => setOrgName(e.target.value)}
            disabled={!canManage}
            placeholder="Acme Corp"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan</span>
          <div className="flex h-11 items-center gap-2 rounded-lg border border-[#e5e7eb] bg-slate-50 px-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Building2 className="h-4 w-4 text-slate-400" />
            {PLAN_LABELS[org?.plan ?? "free"] ?? "Free"}
            <span className="ml-auto text-xs text-slate-400">{org?.seats ?? 3} seats</span>
          </div>
        </label>
      </div>

      {canManage && (
        <div className="mt-4 flex gap-3">
          <Button onClick={handleSaveOrg} loading={isSaving} size="sm">
            Save changes
          </Button>
        </div>
      )}

      <Divider />

      {/* Members */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Users className="h-4 w-4 text-slate-400" />
            Team members
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {org?.members.length ?? 0}
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">Members can access jobs, applicants, and screenings in your organisation.</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        )}
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
        {org?.members.map((member) => {
          const isMe = member.email === me?.email;
          const isOwner = member.orgRole === "owner";
          const canEdit = canManage && !isMe && !isOwner;

          return (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3">
              <MemberInitials name={member.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {member.name}
                  </span>
                  {isMe && (
                    <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Mail className="h-3 w-3" />
                  {member.email}
                </div>
              </div>
              <Badge variant={ROLE_BADGE_VARIANT[member.orgRole] ?? "neutral"}>
                <RoleIcon role={member.orgRole} />
                {ROLE_LABELS[member.orgRole] ?? member.orgRole}
              </Badge>

              {canEdit && (
                <div className="relative">
                  <button
                    onClick={() => setMemberMenuOpen(memberMenuOpen === member.id ? null : member.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {memberMenuOpen === member.id && (
                    <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Change role
                      </div>
                      {(["admin", "recruiter", "viewer"] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleChange(member, role)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700",
                            member.orgRole === role ? "font-semibold text-indigo-600" : "text-slate-700 dark:text-slate-200",
                          )}
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      ))}
                      <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
                      <button
                        onClick={() => handleRemove(member)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} size="sm">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Invite a team member</h3>
            <p className="mt-1 text-sm text-slate-500">They'll receive an email with instructions to join your organisation.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Full name</span>
            <input
              className={fieldClass}
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Jane Smith"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Work email</span>
            <input
              type="email"
              className={fieldClass}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="jane@company.com"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</span>
            <select
              className={fieldClass}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="recruiter">Recruiter</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={isInviting}
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || !inviteName.trim()}
            >
              <Mail className="h-4 w-4" />
              Send invite
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
