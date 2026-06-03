import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrgStore } from "../store/orgStore";
import MemberLoadBar from "../components/org/MemberLoadBar";
import PriorityMatrix from "../components/tasks/PriorityMatrix";
import DelegatedTaskInbox from "../components/org/DelegatedTaskInbox";
import { skillApi } from "../utils/api";
import { Task } from "../store/taskStore";

interface DeptSummary {
  department_id: number;
  department_name: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  member_count: number;
}

interface MemberLoad {
  user_id: number;
  name?: string;
  role: string;
  active_tasks: number;
  total_minutes?: number;
  task_count?: number;
}

interface DashboardData {
  org: { name: string; plan: string; slug: string };
  department_summaries: DeptSummary[];
  member_loads: MemberLoad[];
  total_members: number;
}

interface DelegatedTask {
  id: number;
  title: string;
  priority: string;
  estimated_minutes: number;
  required_skills: string[];
  delegation_level: number;
  due_datetime?: string;
}

type Tab = "overview" | "matrix" | "inbox";

export default function OrgDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setOrg, setDepartments, setMembers } = useOrgStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [receivedTasks, setReceivedTasks] = useState<DelegatedTask[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!slug) return;

    const fetchDashboard = async () => {
      try {
        const [dashRes, orgRes, deptsRes, membersRes] = await Promise.all([
          fetch(`${apiBase}/org/${slug}/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiBase}/org/${slug}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiBase}/org/${slug}/departments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiBase}/org/${slug}/members`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!dashRes.ok) throw new Error("ダッシュボードの取得に失敗しました");

        const dashData = await dashRes.json();
        setDashboard(dashData.data);

        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrg(orgData.data);

          try {
            const res = await skillApi.getReceivedTasks(orgData.data.id);
            setReceivedTasks(res.data?.data ?? []);
          } catch {
          }
        }
        if (deptsRes.ok) {
          const deptsData = await deptsRes.json();
          setDepartments(deptsData.data);
        }
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData.data);
        }

        const tasksRes = await fetch(`${apiBase}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setAllTasks(tasksData.data ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [slug, apiBase, token, setOrg, setDepartments, setMembers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error || "データが見つかりません"}</p>
      </div>
    );
  }

  const planLabel = dashboard.org.plan === "enterprise" ? "Enterprise" : "Business";

  const memberLoadBarData = dashboard.member_loads.map((m) => ({
    id: m.user_id,
    name: m.name ?? `User ${m.user_id}`,
    totalMinutes: m.total_minutes ?? m.active_tasks * 30,
    taskCount: m.task_count ?? m.active_tasks,
  }));

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "概要" },
    { key: "matrix", label: "優先度マトリクス" },
    { key: "inbox", label: `受信タスク${receivedTasks.length > 0 ? ` (${receivedTasks.length})` : ""}` },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dashboard.org.name}</h1>
            <span className="inline-block mt-1 px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded-full">
              {planLabel} プラン
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/org/${slug}/distribute`)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              AIでタスクを振り分ける
            </button>
          </div>
        </div>
        <p className="mt-2 text-gray-500">メンバー数: {dashboard.total_members}</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === t.key
                ? "bg-white border border-b-white border-gray-200 text-indigo-700 -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">部署別進捗</h2>
            {dashboard.department_summaries.length === 0 ? (
              <p className="text-gray-400">部署がまだありません。</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboard.department_summaries.map((dept) => (
                  <div key={dept.department_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 text-lg mb-3">{dept.department_name}</h3>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>タスク</span>
                      <span>
                        {dept.completed_tasks} / {dept.total_tasks} 完了
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                      <div
                        className="bg-indigo-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${dept.completion_rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">メンバー: {dept.member_count}名</span>
                      <span className="font-medium text-indigo-700">{dept.completion_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">メンバー別タスク負荷</h2>
            {memberLoadBarData.length === 0 ? (
              <p className="text-gray-400">メンバーがいません。</p>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <MemberLoadBar members={memberLoadBarData} />
                <p className="mt-4 text-xs text-gray-400">※ 数値は進行中・未着手のタスク数</p>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "matrix" && (
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">優先度マトリクス（アイゼンハワー）</h2>
          <PriorityMatrix
            tasks={allTasks}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
          />
        </section>
      )}

      {activeTab === "inbox" && (
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">受信タスク</h2>
          <DelegatedTaskInbox
            tasks={receivedTasks}
            role="manager"
            onAssign={(taskId, userId) => {
              console.log("assign", taskId, userId);
            }}
            onAccept={(taskId) => {
              console.log("accept", taskId);
            }}
          />
        </section>
      )}
    </div>
  );
}
