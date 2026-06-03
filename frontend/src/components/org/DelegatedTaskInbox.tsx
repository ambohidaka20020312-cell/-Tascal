import { useState } from "react";

interface MemberAvailability {
  user_id: number;
  name: string;
  email?: string;
  remaining_minutes: number;
  active_task_count: number;
  skill_match_score?: number; // 0-100, AI推奨スコア（参考値）
  is_ai_recommended?: boolean;
}

interface DelegatedTask {
  id: number;
  title: string;
  priority: string;
  estimated_minutes: number;
  required_skills: string[];
  delegation_level: number;
  due_datetime?: string;
  ai_recommended_user_id?: number | null;
  ai_skill_match_score?: number | null; // 0-100（参考値）
}

interface Props {
  tasks: DelegatedTask[];
  members?: MemberAvailability[];
  onAssign: (taskId: number, userId: number) => void;
  onAccept: (taskId: number) => void;
  role: "manager" | "member";
}

const priorityConfig: Record<string, { label: string; badge: string }> = {
  urgent: { label: "緊急", badge: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "高", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  medium: { label: "中", badge: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low: { label: "低", badge: "bg-gray-100 text-gray-600 border-gray-200" },
};

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

function AvailabilityBadge({ remainingMinutes }: { remainingMinutes: number }) {
  if (remainingMinutes >= 120) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
        ⚡ 空き有り
      </span>
    );
  }
  if (remainingMinutes < 30) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
        🔴 余裕なし
      </span>
    );
  }
  return null;
}

export default function DelegatedTaskInbox({ tasks, members = [], onAssign, onAccept, role }: Props) {
  const [selectedMembers, setSelectedMembers] = useState<Record<number, string>>({});
  // 手動調整済みフラグ: タスクIDごとに、AI推奨と異なる担当者を選択した場合にtrueになる
  const [manuallyOverridden, setManuallyOverridden] = useState<Record<number, boolean>>({});

  const handleMemberSelect = (taskId: number, value: string, aiRecommendedUserId?: number | null) => {
    setSelectedMembers((prev) => ({ ...prev, [taskId]: value }));
    const selectedUserId = value ? parseInt(value, 10) : NaN;
    const isOverride = !isNaN(selectedUserId) && selectedUserId !== aiRecommendedUserId;
    setManuallyOverridden((prev) => ({ ...prev, [taskId]: isOverride }));
  };

  const handleAssign = (taskId: number) => {
    const val = selectedMembers[taskId];
    const userId = parseInt(val ?? "", 10);
    if (!isNaN(userId) && userId > 0) {
      onAssign(taskId, userId);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        受信タスクはありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* AI提案の注意書き（managerロールのみ表示） */}
      {role === "manager" && (
        <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5 text-sm text-indigo-700">
          <span className="text-base leading-tight">🤖</span>
          <p>
            担当者の「推奨」はAIによる提案です。スキルマッチスコアは参考値であり、
            <strong>最終判断は部署責任者</strong>が行ってください。
          </p>
        </div>
      )}

      {tasks.map((task) => {
        const pc = priorityConfig[task.priority] ?? priorityConfig.low;
        const selectedVal = selectedMembers[task.id];
        const selectedUserId = selectedVal ? parseInt(selectedVal, 10) : NaN;
        const isManual = manuallyOverridden[task.id] ?? false;

        return (
          <div
            key={task.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${pc.badge}`}
                  >
                    {pc.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    委任レベル {task.delegation_level}
                  </span>
                  {task.due_datetime && (
                    <span className="text-xs text-gray-400">
                      期限: {new Date(task.due_datetime).toLocaleDateString("ja-JP")}
                    </span>
                  )}
                  {/* AI推奨スコア（参考値として表示） */}
                  {task.ai_skill_match_score != null && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                      🤖 スキルマッチ {task.ai_skill_match_score}%（参考）
                    </span>
                  )}
                </div>
                <p className="font-medium text-gray-900 truncate">{task.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  予定時間: {formatMinutes(task.estimated_minutes)}
                </p>
                {task.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {task.required_skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {role === "manager" ? (
                  <div className="flex flex-col gap-2 items-end">
                    {members.length > 0 ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          {/* AI推奨 or 手動調整済みバッジ */}
                          {selectedVal && (
                            isManual ? (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">
                                ✏️ 手動調整済み
                              </span>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium whitespace-nowrap">
                                🤖 推奨
                              </span>
                            )
                          )}
                          <select
                            value={selectedVal ?? ""}
                            onChange={(e) =>
                              handleMemberSelect(task.id, e.target.value, task.ai_recommended_user_id)
                            }
                            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[170px]"
                          >
                            <option value="">担当者を選択</option>
                            {members.map((m) => {
                              const isRecommended = m.user_id === task.ai_recommended_user_id;
                              const displayName = m.name || m.email || `User ${m.user_id}`;
                              return (
                                <option key={m.user_id} value={m.user_id}>
                                  {isRecommended ? "🤖 " : ""}
                                  {displayName}
                                  {" "}(残{m.remaining_minutes}分 / {m.active_task_count}件)
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        {/* 選択中メンバーの空き状況バッジ */}
                        {!isNaN(selectedUserId) && (() => {
                          const sel = members.find((m) => m.user_id === selectedUserId);
                          return sel ? (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <AvailabilityBadge remainingMinutes={sel.remaining_minutes} />
                              <span>進行中: {sel.active_task_count}件</span>
                            </div>
                          ) : null;
                        })()}
                      </>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        placeholder="UserID"
                        value={selectedVal ?? ""}
                        onChange={(e) =>
                          setSelectedMembers((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    )}
                    {/* 振り分けボタンは常に表示・有効（スコアが低くても非活性にしない） */}
                    <button
                      onClick={() => handleAssign(task.id)}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      この人に割り当て
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAccept(task.id)}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    承認
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
