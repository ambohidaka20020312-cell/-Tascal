import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrgStore } from "../store/orgStore";
import MemberLoadBar from "../components/org/MemberLoadBar";

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
  ai_recommended_user_id?: number | null;
  ai_skill_match_score?: number | null;
  estimated_minutes?: number;
  // 手動調整フラグ
  manually_overridden?: boolean;
  // 変更理由タグ
  change_reason?: string | null;
}

interface DistributeResult {
  assignments: Assignment[];
  ai_message: string;
}

// メンバーの空き状況（リアルタイム負荷計算用）
interface MemberLoad {
  id: number;
  name: string;
  totalMinutes: number;
  taskCount: number;
  remaining_minutes: number;
  active_task_count: number;
}

const CHANGE_REASON_OPTIONS = [
  { value: "available", label: "手が空いている" },
  { value: "requested", label: "本人希望" },
  { value: "training", label: "スキル研修目的" },
  { value: "other", label: "その他" },
];

function AvailabilityBadge({ remainingMinutes }: { remainingMinutes: number }) {
  if (remainingMinutes >= 120) {
    return (
      <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">
        ⚡ 空き有り
      </span>
    );
  }
  if (remainingMinutes < 30) {
    return (
      <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap">
        🔴 余裕なし
      </span>
    );
  }
  return null;
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

  // 各メンバーの初期負荷（API取得想定、モックは0始まり）
  const [memberBaseLoad, setMemberBaseLoad] = useState<Record<number, { minutes: number; taskCount: number }>>({});

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

  // メンバーの初期負荷をAPIから取得（今日のタスク状況）
  useEffect(() => {
    if (!slug || members.length === 0) return;
    const fetchMemberLoads = async () => {
      try {
        const res = await fetch(`${apiBase}/org/${slug}/members/load`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const loadMap: Record<number, { minutes: number; taskCount: number }> = {};
          (data.data as Array<{ user_id: number; total_minutes: number; task_count: number }>)
            .forEach((item) => {
              loadMap[item.user_id] = { minutes: item.total_minutes, taskCount: item.task_count };
            });
          setMemberBaseLoad(loadMap);
        }
      } catch {
        // 取得失敗時は0として扱う（フォールバック）
      }
    };
    fetchMemberLoads();
  }, [slug, members, apiBase, token]);

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
      const result: DistributeResult = data.data;
      setDistributeResult(result);
      setPendingAssignments(
        result.assignments.map((a) => ({ ...a, manually_overridden: false, change_reason: null }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setDistributing(false);
    }
  };

  const handleAssignmentChange = (taskId: number, newUserId: number | null) => {
    setPendingAssignments((prev) =>
      prev.map((a) =>
        a.task_id === taskId
          ? {
              ...a,
              assigned_to: newUserId,
              manually_overridden: newUserId !== a.ai_recommended_user_id,
              change_reason: newUserId !== a.ai_recommended_user_id ? a.change_reason : null,
            }
          : a
      )
    );
  };

  const handleChangeReason = (taskId: number, reason: string) => {
    setPendingAssignments((prev) =>
      prev.map((a) => (a.task_id === taskId ? { ...a, change_reason: reason } : a))
    );
  };

  const handleApply = async () => {
    if (!slug || !pendingAssignments.length) return;
    setApplying(true);
    setError(null);
    try {
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

  // リアルタイムでメンバー負荷バーを計算
  // pendingAssignmentsが変わるたびに各メンバーへの割り当て分を加算
  const memberLoads: MemberLoad[] = useMemo(() => {
    const assignedMinutesMap: Record<number, number> = {};
    const assignedTaskCountMap: Record<number, number> = {};

    pendingAssignments.forEach((a) => {
      if (a.assigned_to != null) {
        assignedMinutesMap[a.assigned_to] =
          (assignedMinutesMap[a.assigned_to] ?? 0) + (a.estimated_minutes ?? 0);
        assignedTaskCountMap[a.assigned_to] =
          (assignedTaskCountMap[a.assigned_to] ?? 0) + 1;
      }
    });

    return members.map((m) => {
      const base = memberBaseLoad[m.user_id] ?? { minutes: 0, taskCount: 0 };
      const addedMinutes = assignedMinutesMap[m.user_id] ?? 0;
      const addedTasks = assignedTaskCountMap[m.user_id] ?? 0;
      const totalMinutes = base.minutes + addedMinutes;
      const totalTasks = base.taskCount + addedTasks;
      // 残り時間: 8時間稼働想定から現在の総担当時間を引く
      const remaining = Math.max(480 - totalMinutes, 0);
      return {
        id: m.user_id,
        name: m.name || m.email || `User ${m.user_id}`,
        totalMinutes,
        taskCount: totalTasks,
        remaining_minutes: remaining,
        active_task_count: totalTasks,
      };
    });
  }, [members, pendingAssignments, memberBaseLoad]);

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
        <div className="flex items-center justify-between mb-6">
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

        {/* MemberLoadBar — 常時表示、振り分けのたびにリアルタイム更新 */}
        {memberLoads.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              メンバー負荷状況
              {distributeResult && (
                <span className="ml-2 text-xs text-indigo-500 font-normal">
                  （振り分け結果を反映中）
                </span>
              )}
            </h2>
            <MemberLoadBar members={memberLoads} maxMinutes={480} />
          </div>
        )}

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
            {/* AI Message — あくまで「提案」として明示 */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="font-semibold text-indigo-900 mb-0.5">AIによる配分提案</p>
                  <p className="text-xs text-indigo-600 mb-2">
                    以下はAIの提案です。最終判断は部署責任者が行ってください。
                  </p>
                  <p className="text-indigo-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {distributeResult.ai_message}
                  </p>
                </div>
              </div>
            </div>

            {/* Assignment List with manual override */}
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              振り分け結果 <span className="text-sm font-normal text-gray-400">（手動調整可能）</span>
            </h2>
            <div className="space-y-3 mb-6">
              {pendingAssignments.map((a) => {
                const currentMember = memberLoads.find((m) => m.id === a.assigned_to);
                const isManual = a.manually_overridden;

                return (
                  <div
                    key={a.task_id}
                    className="bg-white rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 font-medium">{a.task_title}</p>
                        {/* AI推奨スコア（参考値として表示） */}
                        {a.ai_skill_match_score != null && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            スキルマッチスコア（参考）: {a.ai_skill_match_score}%
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end min-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <label className="text-sm text-gray-500 whitespace-nowrap">担当者:</label>
                          <div className="flex items-center gap-1.5">
                            {/* AI推奨 or 手動調整済みバッジ */}
                            {isManual ? (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">
                                ✏️ 手動調整済み
                              </span>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium whitespace-nowrap">
                                🤖 推奨
                              </span>
                            )}
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
                              {memberLoads.map((m) => {
                                const isRecommended = m.id === a.ai_recommended_user_id;
                                return (
                                  <option key={m.id} value={m.id}>
                                    {isRecommended ? "🤖 " : ""}
                                    {m.name}
                                    {" "}(残{m.remaining_minutes}分 / {m.active_task_count}件)
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {/* 選択中メンバーの空き状況バッジ */}
                        {currentMember && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <AvailabilityBadge remainingMinutes={currentMember.remaining_minutes} />
                            <span>進行中: {currentMember.active_task_count}件</span>
                          </div>
                        )}

                        {/* 変更理由タグ（手動変更時のみ表示） */}
                        {isManual && (
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className="text-xs text-gray-400">変更理由:</span>
                            {CHANGE_REASON_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => handleChangeReason(a.task_id, opt.value)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                  a.change_reason === opt.value
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDistributeResult(null);
                  setPendingAssignments([]);
                }}
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
