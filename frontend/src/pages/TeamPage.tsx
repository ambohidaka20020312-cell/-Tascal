import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useToast } from "../components/common/Toast";
import {
  useOrg,
  useOrgMembers,
  useCreateOrg,
  useInviteMember,
  useRemoveMember,
} from "../hooks/useOrg";

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
  const [name, setName] = useState("");
  const createOrg = useCreateOrg();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createOrg.mutate(name.trim());
  };

  return (
    <div className="max-w-md mx-auto space-y-6 py-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-wide">チーム管理</h1>
      <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">チームを作成</h2>
        <p className="text-xs text-[var(--text-muted)]">
          チーム名を入力してチームを作成してください。最大5名のメンバーを招待できます。
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="チーム名"
            className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-muted)]"
          />
          <button
            type="submit"
            disabled={!name.trim() || createOrg.isPending}
            className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createOrg.isPending ? "作成中..." : "作成"}
          </button>
        </form>
        {createOrg.isError && (
          <p className="text-xs text-[var(--color-danger,#e53e3e)]">作成に失敗しました。再度お試しください。</p>
        )}
      </section>
    </div>
  );
}

export default function TeamPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { data: org, isLoading, isError, refetch } = useOrg();
  const { data: members = [], isLoading: membersLoading } = useOrgMembers(org?.id ?? 0);
  const inviteMember = useInviteMember(org?.id ?? 0);
  const removeMember = useRemoveMember(org?.id ?? 0);

  const [inviteEmail, setInviteEmail] = useState("");

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
        <p className="text-sm text-[var(--text-muted)]">チーム情報を取得できませんでした</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!org) {
    return <CreateOrgForm />;
  }

  const isOwner = org.owner_id === user?.id;
  const memberCount = members.length;
  const atLimit = memberCount >= MAX_MEMBERS;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (atLimit) {
      toast(`メンバーが上限に達しています（${MAX_MEMBERS}名）`, "error");
      return;
    }
    try {
      await inviteMember.mutateAsync(inviteEmail.trim());
      toast("招待しました", "success");
      setInviteEmail("");
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 404) {
        toast("ユーザーが見つかりません", "error");
      } else if (e?.response?.status === 400) {
        toast(`メンバーが上限に達しています（${MAX_MEMBERS}名）`, "error");
      } else {
        toast("招待に失敗しました", "error");
      }
    }
  };

  const handleRemove = async (userId: number) => {
    try {
      await removeMember.mutateAsync(userId);
      if (userId === user?.id) {
        toast("チームを退出しました", "success");
      }
    } catch {
      toast("操作に失敗しました", "error");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-wide">
        {org.name}
      </h1>

      {/* Member list */}
      <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">メンバー管理</h2>
          <span className="text-xs text-[var(--text-muted)]">
            {memberCount} / {MAX_MEMBERS} 名
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
                {m.role === "owner" ? "オーナー" : "メンバー"}
              </span>
              {isOwner && m.id !== user?.id && (
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={removeMember.isPending}
                  aria-label={`${m.name}を削除`}
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">メンバーを招待</h2>
          {atLimit && (
            <p className="text-xs text-[var(--text-muted)]">
              メンバーが上限に達しています（{MAX_MEMBERS}名）
            </p>
          )}
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="メールアドレス"
              disabled={atLimit}
              className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-muted)] disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!inviteEmail.trim() || inviteMember.isPending || atLimit}
              className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {inviteMember.isPending ? "送信中..." : "招待"}
            </button>
          </form>
        </section>
      )}

      {/* Leave team (member only) */}
      {!isOwner && user && (
        <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">チームを退出</h2>
          <p className="text-xs text-[var(--text-muted)]">チームから退出します。この操作は取り消せません。</p>
          <button
            onClick={() => handleRemove(user.id)}
            disabled={removeMember.isPending}
            className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {removeMember.isPending ? "処理中..." : "チームを退出"}
          </button>
        </section>
      )}
    </div>
  );
}
