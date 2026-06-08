import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "../components/layout/AppLayout";
import { adminApi } from "../utils/api";

interface UserRow {
  id: number;
  email: string;
  name: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface UserDetail extends UserRow {
  is_admin: boolean;
  revenuecat_user_id: string | null;
  onboarding_completed: boolean;
  analytics_opt_out: boolean;
  digest_unsubscribed: boolean;
  trial_used: boolean;
  trial_started_at: string | null;
}

interface Meta {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

const PLAN_OPTIONS = [
  { value: "", label: "すべてのプラン" },
  { value: "free", label: "Free" },
  { value: "personal_pro", label: "Personal Pro" },
  { value: "business", label: "Business" },
  { value: "enterprise", label: "Enterprise" },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  personal_pro: "Personal Pro",
  business: "Business",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-700 text-slate-300",
  personal_pro: "bg-blue-700 text-blue-200",
  business: "bg-purple-700 text-purple-200",
  enterprise: "bg-amber-700 text-amber-200",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[plan] ?? "bg-slate-700 text-slate-300"}`}>
      {PLAN_LABELS[plan] ?? plan}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-slate-700/50">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className="text-slate-200 text-sm break-all">{value ?? "—"}</span>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, per_page: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editPlan, setEditPlan] = useState("");

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (search) params.search = search;
    if (planFilter) params.plan = planFilter;
    adminApi
      .getUsers(params)
      .then((res) => {
        setUsers(res.data.data);
        setMeta(res.data.meta);
      })
      .finally(() => setLoading(false));
  }, [page, search, planFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openDetail = (id: number) => {
    setDetailLoading(true);
    adminApi
      .getUser(id)
      .then((res) => {
        setSelectedUser(res.data.data);
        setEditPlan(res.data.data.plan);
      })
      .finally(() => setDetailLoading(false));
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    setUpdating(true);
    adminApi
      .updateUser(selectedUser.id, { plan: editPlan })
      .then((res) => {
        setSelectedUser((prev) => prev ? { ...prev, ...res.data.data } : null);
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, plan: editPlan } : u))
        );
      })
      .finally(() => setUpdating(false));
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">ユーザー管理</h1>
            <p className="text-slate-400 text-sm mt-1">全ユーザーの検索・編集</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <input
              type="text"
              placeholder="メール・名前で検索..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
            />
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {PLAN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="px-4 py-3 text-left font-medium">メール</th>
                    <th className="px-4 py-3 text-left font-medium">名前</th>
                    <th className="px-4 py-3 text-left font-medium">プラン</th>
                    <th className="px-4 py-3 text-left font-medium">Stripe Customer ID</th>
                    <th className="px-4 py-3 text-left font-medium">Stripe Subscription ID</th>
                    <th className="px-4 py-3 text-left font-medium">登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div className="inline-block w-5 h-5 border border-slate-600 border-t-slate-300 rounded-full animate-spin" />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        ユーザーが見つかりません
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                        onClick={() => openDetail(user.id)}
                      >
                        <td className="px-4 py-3 text-slate-400 font-mono">{user.id}</td>
                        <td className="px-4 py-3 text-slate-200">{user.email}</td>
                        <td className="px-4 py-3 text-slate-300">{user.name || "—"}</td>
                        <td className="px-4 py-3"><PlanBadge plan={user.plan} /></td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs truncate max-w-[140px]">
                          {user.stripe_customer_id || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs truncate max-w-[140px]">
                          {user.stripe_subscription_id || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString("ja-JP") : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                <p className="text-slate-400 text-xs">
                  {meta.total} 件中 {(meta.page - 1) * meta.per_page + 1}–{Math.min(meta.page * meta.per_page, meta.total)} 件
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm transition-colors"
                  >
                    前へ
                  </button>
                  <span className="px-3 py-1 text-slate-300 text-sm">{page} / {meta.pages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                    disabled={page >= meta.pages}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm transition-colors"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {(selectedUser || detailLoading) && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="w-6 h-6 border border-slate-600 border-t-slate-300 rounded-full animate-spin" />
              </div>
            ) : selectedUser ? (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                  <h2 className="text-white font-semibold">ユーザー詳細 #{selectedUser.id}</h2>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-slate-400 hover:text-white text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="px-5 py-4 space-y-0">
                  <DetailRow label="ID" value={selectedUser.id} />
                  <DetailRow label="メール" value={selectedUser.email} />
                  <DetailRow label="名前" value={selectedUser.name || "—"} />
                  <DetailRow label="現在のプラン" value={<PlanBadge plan={selectedUser.plan} />} />
                  <DetailRow label="管理者" value={selectedUser.is_admin ? "はい" : "いいえ"} />
                  <DetailRow label="Stripe Customer ID" value={selectedUser.stripe_customer_id} />
                  <DetailRow label="Stripe Subscription ID" value={selectedUser.stripe_subscription_id} />
                  <DetailRow label="RevenueCat User ID" value={selectedUser.revenuecat_user_id} />
                  <DetailRow label="オンボーディング完了" value={selectedUser.onboarding_completed ? "はい" : "いいえ"} />
                  <DetailRow label="トライアル使用済み" value={selectedUser.trial_used ? "はい" : "いいえ"} />
                  <DetailRow
                    label="トライアル開始日"
                    value={selectedUser.trial_started_at ? new Date(selectedUser.trial_started_at).toLocaleDateString("ja-JP") : "—"}
                  />
                  <DetailRow
                    label="登録日"
                    value={selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString("ja-JP") : "—"}
                  />
                </div>

                {/* Plan change */}
                <div className="px-5 py-4 border-t border-slate-700 bg-slate-800/50 rounded-b-xl">
                  <p className="text-slate-300 text-sm font-medium mb-3">プラン変更</p>
                  <div className="flex gap-3">
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      {PLAN_OPTIONS.filter((o) => o.value !== "").map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleUpdateUser}
                      disabled={updating || editPlan === selectedUser.plan}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {updating ? "更新中..." : "更新"}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
