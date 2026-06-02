import { useState } from "react";
import { Task } from "../../store/taskStore";
import { useReplan, ReplanResult } from "../../hooks/useAI";

interface OverrunAlertProps {
  task: Task;
  actualMinutes: number;
}

export default function OverrunAlert({ task, actualMinutes }: OverrunAlertProps) {
  const replan = useReplan();
  const [result, setResult] = useState<ReplanResult | null>(null);

  const overrunBy = task.estimated_minutes
    ? actualMinutes - task.estimated_minutes
    : null;

  const handleReplan = async () => {
    try {
      const data = await replan.mutateAsync({
        overrun_task_id: task.id,
        actual_minutes_so_far: actualMinutes,
      });
      setResult(data);
    } catch {
      // error handled below via replan.isError
    }
  };

  return (
    <div className="rounded-2xl border border-orange-300 bg-orange-50 p-4 space-y-3">
      {/* Warning header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-orange-800">
            タスクが超過しています
          </p>
          <p className="text-sm text-orange-700 mt-0.5">
            <span className="font-medium">{task.title}</span>
            {overrunBy !== null && overrunBy > 0 && (
              <> — 見積もりより <span className="font-bold">{overrunBy}分</span> 超過中</>
            )}
          </p>
          <p className="text-xs text-orange-500 mt-1">
            経過時間: {actualMinutes}分
            {task.estimated_minutes && ` / 見積もり: ${task.estimated_minutes}分`}
          </p>
        </div>
      </div>

      {/* Replan button */}
      {!result && (
        <button
          onClick={handleReplan}
          disabled={replan.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {replan.isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              再計画中…
            </>
          ) : (
            <>🤖 AIに再計画を依頼</>
          )}
        </button>
      )}

      {/* Error */}
      {replan.isError && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          再計画に失敗しました。もう一度お試しください。
        </p>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3 pt-1">
          {/* AI message */}
          <div className="bg-white rounded-xl border border-orange-200 px-4 py-3">
            <p className="text-sm text-orange-900 leading-relaxed whitespace-pre-wrap">
              {result.message}
            </p>
          </div>

          {/* Rescheduled tasks */}
          {result.rescheduled_tasks && result.rescheduled_tasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">
                再スケジュール済みタスク
              </p>
              <ul className="space-y-1.5">
                {result.rescheduled_tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 bg-white rounded-lg border border-orange-100 px-3 py-2"
                  >
                    <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="flex-1 text-sm text-gray-800 truncate">{t.title}</span>
                    {t.new_scheduled_start && (
                      <span className="text-xs text-orange-500 font-medium flex-shrink-0">
                        {t.new_scheduled_start}
                      </span>
                    )}
                    {t.estimated_minutes && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {t.estimated_minutes}m
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="text-xs text-orange-500 hover:text-orange-700 underline"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
