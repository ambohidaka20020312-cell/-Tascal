import { useOptimize, OptimizeResult } from "../../hooks/useAI";

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "緊急",
  high: "高",
  medium: "中",
  low: "低",
};

interface AiAdvicePanelProps {
  date?: string;
}

export default function AiAdvicePanel({ date }: AiAdvicePanelProps) {
  const optimize = useOptimize(date);

  const data = optimize.data as OptimizeResult | undefined;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <h2 className="text-base font-semibold text-gray-800">AIアドバイス</h2>
        </div>
        <button
          onClick={() => optimize.mutate()}
          disabled={optimize.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {optimize.isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              最適化中…
            </>
          ) : (
            <>✨ 今日を最適化</>
          )}
        </button>
      </div>

      {/* Error */}
      {optimize.isError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          エラーが発生しました。再度お試しください。
        </p>
      )}

      {/* Loading shimmer */}
      {optimize.isPending && (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      )}

      {/* Result */}
      {data && (
        <>
          {/* AI message bubble */}
          <div className="relative bg-indigo-50 rounded-2xl rounded-tl-none px-4 py-3">
            <div className="absolute -top-2 left-0 w-4 h-4 bg-indigo-50 [clip-path:polygon(0_100%,100%_100%,100%_0)]" />
            <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">
              {data.message}
            </p>
            {data.total_estimated_minutes > 0 && (
              <p className="mt-2 text-xs text-indigo-500 font-medium">
                合計見積もり: {Math.floor(data.total_estimated_minutes / 60)}h{" "}
                {data.total_estimated_minutes % 60}m
              </p>
            )}
          </div>

          {/* Recommended task list */}
          {data.tasks && data.tasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                推奨タスク順
              </p>
              <ol className="space-y-2">
                {data.tasks.map((task, idx) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      {task.scheduled_start && (
                        <p className="text-xs text-gray-400">{task.scheduled_start}</p>
                      )}
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                        PRIORITY_BADGE[task.priority] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {PRIORITY_LABEL[task.priority] ?? task.priority}
                    </span>
                    {task.estimated_minutes && (
                      <span className="flex-shrink-0 text-xs text-gray-400">
                        {task.estimated_minutes}m
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!optimize.isPending && !data && !optimize.isError && (
        <p className="text-sm text-gray-400 text-center py-4">
          「今日を最適化」を押してAIにタスクを分析してもらいましょう
        </p>
      )}
    </div>
  );
}
