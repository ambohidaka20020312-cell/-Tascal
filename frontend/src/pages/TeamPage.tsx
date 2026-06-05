import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { useToast } from "../components/common/Toast";
import {
  useOrg,
  useOrgMembers,
  useCreateOrg,
  useInviteMember,
  useRemoveMember,
} from "../hooks/useOrg";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";
import type { Department } from "../types/team";

const MAX_MEMBERS = 5;

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)] shrink-0">
      {initials}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-3 animate-pulse">
      <div className="h-4 w-32 bg-[var(--bg-tertiary)] rounded" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)]" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-24 bg-[var(--bg-tertiary)] rounded" />
              <div className="h-3 w-36 bg-[var(--bg-tertiary)] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateOrgForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const createOrg = useCreateOrg();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createOrg.mutate(name.trim());
  };

  return (
    <div className="max-w-md mx-auto space-y-6 py-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-wide">{t("team.title")}</h1>
      <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("team.create_title")}</h2>
        <p className="text-xs text-[var(--text-muted)]">
          {t("team.create_desc")}
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("team.create_placeholder")}
            className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-muted)]"
          />
          <button
            type="submit"
            disabled={!name.trim() || createOrg.isPending}
            className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createOrg.isPending ? t("team.creating") : t("team.create_btn")}
          </button>
        </form>
        {createOrg.isError && (
          <p className="text-xs text-[var(--color-danger,#e53e3e)]">{t("team.create_error")}</p>
        )}
      </section>
    </div>
  );
}

// ── Department tab ────────────────────────────────────────────────────────────

function useDepartments(orgId: number) {
  return useQuery<Department[]>({
    queryKey: ["departments", orgId],
    queryFn: async () => {
      const res = await api.get(`/org/${orgId}/departments`);
      return (res.data as { data: Department[] }).data ?? [];
    },
    enabled: orgId > 0,
  });
}

function useCreateDepartment(orgId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post(`/org/${orgId}/departments`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", orgId] }),
  });
}

function useDeleteDepartment(orgId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deptId: number) =>
      api.delete(`/org/${orgId}/departments/${deptId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", orgId] }),
  });
}

interface DepartmentsTabProps {
  orgId: number;
}

function DepartmentsTab({ orgId }: DepartmentsTabProps) {
  const { data: departments = [], isLoading } = useDepartments(orgId);
  const { data: members = [] } = useOrgMembers(orgId);
  const createDept = useCreateDepartment(orgId);
  const deleteDept = useDeleteDepartment(orgId);
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [assignModalDept, setAssignModalDept] = useState<Department | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | "">("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createDept.mutateAsync(newName.trim());
      setNewName("");
    } catch {
      toast("部署の作成に失敗しました", "error");
    }
  };

  const handleAssign = async () => {
    if (!assignModalDept || selectedMemberId === "") return;
    try {
      await api.post(
        `/org/${orgId}/departments/${assignModalDept.id}/members`,
        { user_id: selectedMemberId }
      );
      toast("メンバーを割り当てました", "success");
      setAssignModalDept(null);
      setSelectedMemberId("");
    } catch {
      toast("割り当てに失敗しました", "error");
    }
  };

  if (isLoading) return <SkeletonCard />;

  return (
    <div className="space-y-4">
      {/* Create department */}
      <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">部署を作成</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="部署名を入力"
            className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-muted)]"
          />
          <button
            type="submit"
            disabled={!newName.trim() || createDept.isPending}
            className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createDept.isPending ? "作成中..." : "作成"}
          </button>
        </form>
      </section>

      {/* Department list */}
      {departments.length > 0 && (
        <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">部署一覧</h2>
          <ul className="space-y-2">
            {departments.map((dept) => (
              <li
                key={dept.id}
                className="flex items-center gap-3 py-1.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{dept.name}</p>
                </div>
                <button
                  onClick={() => setAssignModalDept(dept)}
                  className="text-xs px-2 py-1 border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  メンバー割り当て
                </button>
                <button
                  onClick={() => deleteDept.mutate(dept.id)}
                  disabled={deleteDept.isPending}
                  className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
                  aria-label={`${dept.name} を削除`}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Assign member modal */}
      {assignModalDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAssignModalDept(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {assignModalDept.name} にメンバーを割り当て
            </h3>
            <select
              value={selectedMemberId}
              onChange={(e) =>
                setSelectedMemberId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-muted)]"
            >
              <option value="">メンバーを選択</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setAssignModalDept(null)}
                className="flex-1 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAssign}
                disabled={selectedMemberId === ""}
                className="flex-1 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                割り当て
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Members tab ───────────────────────────────────────────────────────────────

interface MembersTabProps {
  orgId: number;
  ownerId: number;
}

function MembersTab({ orgId, ownerId }: MembersTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { data: members = [] } = useOrgMembers(orgId);
  const inviteMember = useInviteMember(orgId);
  const removeMember = useRemoveMember(orgId);

  const [inviteEmail, setInviteEmail] = useState("");

  const isOwner = ownerId === user?.id;
  const memberCount = members.length;
  const atLimit = memberCount >= MAX_MEMBERS;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (atLimit) {
      toast(t("team.at_limit", { max: MAX_MEMBERS }), "error");
      return;
    }
    try {
      await inviteMember.mutateAsync(inviteEmail.trim());
      toast(t("team.toast_invited"), "success");
      setInviteEmail("");
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 404) {
        toast(t("team.toast_not_found"), "error");
      } else if (e?.response?.status === 400) {
        toast(t("team.at_limit", { max: MAX_MEMBERS }), "error");
      } else {
        toast(t("team.toast_invite_fail"), "error");
      }
    }
  };

  const handleRemove = async (userId: number) => {
    try {
      await removeMember.mutateAsync(userId);
      if (userId === user?.id) {
        toast(t("team.toast_left"), "success");
      }
    } catch {
      toast(t("team.toast_remove_fail"), "error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Member list */}
      <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("team.members")}</h2>
          <span className="text-xs text-[var(--text-muted)]">
            {memberCount} / {MAX_MEMBERS}
          </span>
        </div>

        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <InitialsAvatar name={m.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{m.email}</p>
              </div>
              <span className={[
                "text-xs px-2 py-0.5 rounded-full border shrink-0",
                m.role === "owner"
                  ? "border-[var(--border)] text-[var(--text-primary)] bg-[var(--bg-tertiary)]"
                  : "border-[var(--border)] text-[var(--text-muted)]",
              ].join(" ")}>
                {m.role === "owner" ? t("team.role_owner") : t("team.role_member")}
              </span>
              {isOwner && m.id !== user?.id && (
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={removeMember.isPending}
                  aria-label={t("team.remove_label", { name: m.name })}
                  className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Invite section (owner only) */}
      {isOwner && (
        <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("team.invite")}</h2>
          {atLimit && (
            <p className="text-xs text-[var(--text-muted)]">
              {t("team.at_limit", { max: MAX_MEMBERS })}
            </p>
          )}
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t("team.email_placeholder")}
              disabled={atLimit}
              className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-muted)] disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!inviteEmail.trim() || inviteMember.isPending || atLimit}
              className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {inviteMember.isPending ? t("team.sending") : t("team.invite_btn")}
            </button>
          </form>
        </section>
      )}

      {/* Leave team (member only) */}
      {!isOwner && user && (
        <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("team.leave")}</h2>
          <p className="text-xs text-[var(--text-muted)]">{t("team.leave_desc")}</p>
          <button
            onClick={() => handleRemove(user.id)}
            disabled={removeMember.isPending}
            className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {removeMember.isPending ? t("team.leaving") : t("team.leave_btn")}
          </button>
        </section>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "members" | "departments";

export default function TeamPage() {
  const { t } = useTranslation();
  const { data: org, isLoading, isError, refetch } = useOrg();
  const { data: members = [], isLoading: membersLoading } = useOrgMembers(org?.id ?? 0);

  const [tab, setTab] = useState<Tab>("members");

  if (isLoading || (org && membersLoading)) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-6">
        <div className="h-6 w-32 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-[var(--text-muted)]">{t("team.load_error")}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          {t("team.retry")}
        </button>
      </div>
    );
  }

  if (!org) {
    return <CreateOrgForm />;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-wide">
          {org.name}
        </h1>
        <span className="text-xs text-[var(--text-muted)]">
          {members.length} / {MAX_MEMBERS} 名
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {(["members", "departments"] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={[
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
              tab === t_
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            ].join(" ")}
          >
            {t_ === "members" ? "メンバー" : "部署"}
          </button>
        ))}
      </div>

      {tab === "members" ? (
        <MembersTab orgId={org.id} ownerId={org.owner_id} />
      ) : (
        <DepartmentsTab orgId={org.id} />
      )}
    </div>
  );
}
