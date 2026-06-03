import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrgStore } from "../store/orgStore";

interface TaskItem {
  id: number;
  title: string;
  priority: string;
  status: string;
  assigned_to: number | null;
  department_id: number | null;
}

interface Assignment {
  task_id: number;
  task_title: string;
  assigned_to: number | null;
  department_id: number | null;
}

interface DistributeResult {
  assignments: Assignment[];
  ai_message: string;
}

export default function OrgTaskDistributionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { members } = useOrgStore();

  const [unassignedTasks, setUnassignedTasks] = useState<TaskItem[]>([]);
  const [distributeResult, setDistributeResult] = useState<DistributeResult | null>(null);
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
  const token = localStorage.getItem("access_token");

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (!slug) return;
    const fetchTasks = async () => {
      try {
        const res = await fetch(`${apiBase}/org/${slug}/tasks?assigned_to=`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("タスクの取得に失敗しました");
        const data = await res.json();
        const tasks: TaskItem[] = data.data.filter((t: TaskItem) => t.assigned_to === null);
        setUnassignedTasks(tasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [slug, apiBase, token]);

  const handleDistribute = async () => {
    if (!slug) return;
    setDistributing(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/org/${slug}/tasks/distribute`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("AI振り分けに失敗しました");
      const data = await res.json();
      setDistributeResult(data.data);
      setPendingAssignments(data.data.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setDistributing(false);
    }
  };

  const handleAssignmentChange = (taskId: number, newUserId: number | null) => {
    setPendingAssignments((prev) =>
      prev.map((a) => (a.task_id === taskId ? { ...a, assigned_to: newUserId } : a))
    );
  };

  const handleApply = async () => {
    if (!slug || !pendingAssignments.length) return;
    setApplying(true);
    setError(null);
    try {
      // Apply each assignment via PATCH /tasks/:id
      await Promise.all(
        pendingAssignments.map((a) =>
          fetch(`${apiBase}/tasks/${a.task_id}`, {
            method: "PATCH",
            headers: authHeaders,
            body: JSON.stringify({
              assigned_to: a.assigned_to,
              department_id: a.department_id,
            }),
          })
        )
      );
      setSuccessMsg("タスクの振り分けを確定しました！");
      setTimeout(() => navigate(`/org/${slug}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "適用に失敗しました");
    } finally {
      setApplying(false);
    }
  };

  const priorityColor: Record<string, string> = {
    urgent: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-gray-100 text-gray-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => navigate(`/org/${slug}`)}
              className="text-indigo-600 hover:underline text-sm mb-2 block"
            >
              ← ダッシュボードへ戻る
            </button>
            <h1 className="text-2xl font-bold text-gray-900">AIタスク振り分け</h1>
          </div>
          {!distributeResult && (
            <button
              onClick={handleDistribute}
              disabled={distributing || unassignedTasks.length === 0}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
            >
              {distributing ? "AI分析中..." : "AI振り分け実行"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">{successMsg}</div>
        )}

        {/* Unassigned Tasks List */}
        {!distributeResult && (
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              未割り当てタスク ({unassignedTasks.length}件)
            </h2>
            {unassignedTasks.length === 0 ? (
              <p className="text-gray-400">振り分け対象のタスクがありません。</p>
            ) : (
              <div className="space-y-2">
                {unassignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
                  >
                    <span className="text-gray-800 font-medium">{task.title}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        priorityColor[task.priority] || priorityColor["medium"]
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Distribution Result */}
        {distributeResult && (
          <section>
            {/* AI Message */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">AI</span>
                <div>
                  <p className="font-semibold text-indigo-900 mb-1">AIによる配分コメント</p>
                  <p className="text-indigo-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {distributeResult.ai_message}
                  </p>
                </div>
              </div>
            </div>

            {/* Assignment List with manual override */}
            <h2 className="text-lg font-semibold text-gray-700 mb-3">振り分け結果 (手動調整可能)</h2>
            <div className="space-y-3 mb-6">
              {pendingAssignments.map((a) => (
                <div
                  key={a.task_id}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4"
                >
                  <span className="text-gray-800 font-medium flex-1">{a.task_title}</span>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">担当者:</label>
                    <select
                      value={a.assigned_to ?? ""}
                      onChange={(e) =>
                        handleAssignmentChange(
                          a.task_id,
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">未割り当て</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name || m.email || `User ${m.user_id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDistributeResult(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
              >
                {applying ? "適用中..." : "確定して適用"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
