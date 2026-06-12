import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { adminApi } from "../utils/api";

interface AdminStats {
  users: {
    total: number;
    free: number;
    personal_pro: number;
    business: number;
    enterprise: number;
    individual_total: number;
    team_total: number;
    new_today: number;
    new_this_month: number;
  };
  revenue: {
    mrr_estimate: number;
    personal_pro_count: number;
    business_count: number;
  };
}

interface RecentUser {
  id: number;
  email: string;
  name: string;
  plan: string;
  created_at: string;
}

function formatCurrency(amount: number) {
  return "¥" + amount.toLocaleString("ja-JP");
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: "bg-slate-700 text-slate-300",
    personal_pro: "bg-blue-700 text-blue-200",
    business: "bg-purple-700 text-purple-200",
    enterprise: "bg-amber-700 text-amber-200",
  };
  const labels: Record<string, string> = {
    free: "Free",
    personal_pro: "Personal Pro",
    business: "Business",
    enterprise: "Enterprise",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[plan] ?? "bg-slate-700 text-slate-300"}`}>
      {labels[plan] ?? plan}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getUsers({ page: 1 })])
      .then(([statsRes, usersRes]) => {
        setStats(statsRes.data.data);
        setRecentUsers(usersRes.data.data.slice(0, 10));
      })
      .catch(() => setError("データの取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-6 h-6 border border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 text-red-400">{error}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">管理ダッシュボード</h1>
              <p className="text-slate-400 text-sm mt-1">プラットフォーム全体の統計</p>
            </div>
            <Link
              to="/app/admin/users"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ユーザー管理
            </Link>
          </div>

          {stats && (
            <>
              {/* MRR Card */}
              <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl p-6 mb-6 border border-blue-700">
                <p className="text-blue-300 text-sm font-medium mb-1">MRR概算</p>
                <p className="text-4xl font-bold text-white">{formatCurrency(stats.revenue.mrr_estimate)}</p>
                <p className="text-blue-300 text-xs mt-2">
                  Personal Pro: {stats.revenue.personal_pro_count}件 × ¥480 ＋
                  Business: {stats.revenue.business_count}件 × ¥1,480
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">総ユーザー数</p>
                  <p className="text-2xl font-bold text-white">{stats.users.total.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">無料</p>
                  <p className="text-2xl font-bold text-slate-300">{stats.users.free.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">Personal Pro</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.users.personal_pro.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">Team</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {(stats.users.business + stats.users.enterprise).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">今月の新規</p>
                  <p className="text-2xl font-bold text-green-400">{stats.users.new_this_month.toLocaleString()}</p>
                </div>
              </div>

              {/* Individual vs Team breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-slate-300 font-medium mb-3">個人ユーザー</h3>
                  <p className="text-3xl font-bold text-white mb-2">{stats.users.individual_total.toLocaleString()}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Free</span>
                      <span>{stats.users.free.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Personal Pro</span>
                      <span>{stats.users.personal_pro.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-slate-300 font-medium mb-3">法人ユーザー</h3>
                  <p className="text-3xl font-bold text-white mb-2">{stats.users.team_total.toLocaleString()}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Business</span>
                      <span>{stats.users.business.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Enterprise</span>
                      <span>{stats.users.enterprise.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's new */}
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-6 inline-block">
                <p className="text-slate-400 text-xs mb-1">本日の新規登録</p>
                <p className="text-xl font-bold text-green-400">{stats.users.new_today} 人</p>
              </div>
            </>
          )}

          {/* Recent Users */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-white font-medium">最近のユーザー</h2>
              <Link to="/app/admin/users" className="text-blue-400 hover:text-blue-300 text-sm">
                全員を見る →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700">
                    <th className="px-5 py-3 text-left font-medium">ID</th>
                    <th className="px-5 py-3 text-left font-medium">メール</th>
                    <th className="px-5 py-3 text-left font-medium">名前</th>
                    <th className="px-5 py-3 text-left font-medium">プラン</th>
                    <th className="px-5 py-3 text-left font-medium">登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3 text-slate-400 font-mono">{user.id}</td>
                      <td className="px-5 py-3 text-slate-200">{user.email}</td>
                      <td className="px-5 py-3 text-slate-300">{user.name || "—"}</td>
                      <td className="px-5 py-3"><PlanBadge plan={user.plan} /></td>
                      <td className="px-5 py-3 text-slate-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString("ja-JP") : "—"}
                      </td>
                    </tr>
                  ))}
                  {recentUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        ユーザーがいません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
