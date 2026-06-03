import { useState } from "react";

interface DelegatedTask {
  id: number;
  title: string;
  priority: string;
  estimated_minutes: number;
  required_skills: string[];
  delegation_level: number;
  due_datetime?: string;
}

interface Props {
  tasks: DelegatedTask[];
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

export default function DelegatedTaskInbox({ tasks, onAssign, onAccept, role }: Props) {
  const [assignTargets, setAssignTargets] = useState<Record<number, string>>({});

  const handleAssign = (taskId: number) => {
    const val = assignTargets[taskId];
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
      {tasks.map((task) => {
        const pc = priorityConfig[task.priority] ?? priorityConfig.low;
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
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="UserID"
                      value={assignTargets[task.id] ?? ""}
                      onChange={(e) =>
                        setAssignTargets((prev) => ({ ...prev, [task.id]: e.target.value }))
                      }
                      className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      onClick={() => handleAssign(task.id)}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      振り分け
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
