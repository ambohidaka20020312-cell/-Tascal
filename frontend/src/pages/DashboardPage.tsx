import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { useTaskStore } from "../store/taskStore";
import { useTasksQuery } from "../hooks/useTasks";
import { aiApi } from "../utils/api";
import { useViewport } from "../hooks/useViewport";
import { useDailyBriefing } from "../hooks/useDailyBriefing";
import TaskCard from "../components/tasks/TaskCard";
import TaskForm from "../components/tasks/TaskForm";
import Button from "../components/common/Button";

interface AiOptimizeResult {
  message?: string;
  advice?: string;
}

/** Generate an array of date strings centered around `center` */
function getDateChips(center: string, count = 7): string[] {
  const base = new Date(center + "T00:00:00");
  const half = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) =>
    addDays(subDays(base, half), i).toISOString().split("T")[0]
  );
}

export default function DashboardPage() {
  const { tasks, selectedDate, setSelectedDate } = useTaskStore();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [briefingDismissed, setBriefingDismissed] = useState(false);
  const { briefing } = useDailyBriefing();

  const { deviceType, isLandscape } = useViewport();
  const isPhoneSmall = deviceType === "phone-small";
  const isTabletOrAbove =
    deviceType === "tablet" || deviceType === "desktop" || deviceType === "ultrawide";

  const { isLoading, isError } = useTasksQuery(selectedDate);

  const handleAiOptimize = async () => {
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const res = await aiApi.optimize(selectedDate);
      const data: AiOptimizeResult = res.data.data ?? res.data;
      setAiAdvice(data.message ?? data.advice ?? "最適化が完了しました。");
    } catch {
      setAiAdvice("AI最適化に失敗しました。再度お試しください。");
    } finally {
      setAiLoading(false);
    }
  };

  const todayLabel = format(new Date(selectedDate + "T00:00:00"), "M月d日 (E)", {
    locale: ja,
  });

  const pendingCount = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  ).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.length;
  const achievementRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const today = new Date().toISOString().split("T")[0];
  const dateChips = getDateChips(selectedDate);

  const briefingText = briefing
    ? (() => {
        const h = Math.floor(briefing.total_estimated_minutes / 60);
        const m = briefing.total_estimated_minutes % 60;
        const timeStr = h > 0 ? `${h}時間${m}分` : `${m}分`;
        const topHint = briefing.top_task ? `「${briefing.top_task.title}」から始めましょう。` : "";
        return `🌅 今日は${briefing.task_count}件・${timeStr}。${topHint}`;
      })()
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5 mb-16 md:mb-0">
      {/* Daily briefing banner */}
      {briefing && !briefingDismissed && briefingText && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="flex-1 text-sm text-amber-900">{briefingText}</p>
          <button
            onClick={() => setBriefingDismissed(true)}
            className="shrink-0 text-amber-400 hover:text-amber-600 text-lg leading-none mt-0.5"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      )}

      {/* Tablet+: stats summary header */}
      {isTabletOrAbove && (
        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{completedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">完了</p>
          </div>
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{totalCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">合計</p>
          </div>
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-primary-600">{achievementRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">達成率</p>
          </div>
        </div>
      )}

      {/* Date selector — horizontal chip strip on mobile, date input on tablet+ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className={`font-bold text-gray-800 ${isPhoneSmall ? "text-lg" : "text-xl"}`}>{todayLabel}</h2>
            {!isTabletOrAbove && (
              <p className={`text-gray-500 ${isPhoneSmall ? "text-xs" : "text-sm"}`}>
                未完了: {pendingCount}件 / 完了: {completedCount}件
              </p>
            )}
          </div>
          {/* Date input visible on sm+ */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="hidden sm:block border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Mobile date chips — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden scrollbar-none -mx-4 px-4">
          {dateChips.map((d) => {
            const isSelected = d === selectedDate;
            const isToday = d === today;
            const label = format(new Date(d + "T00:00:00"), "d", { locale: ja });
            const dayLabel = format(new Date(d + "T00:00:00"), "E", { locale: ja });
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={[
                  "flex flex-col items-center shrink-0 rounded-xl px-3 py-2 min-w-touch transition-colors",
                  isSelected
                    ? "bg-primary-600 text-white"
                    : isToday
                    ? "bg-primary-50 text-primary-700 border border-primary-200"
                    : "bg-white text-gray-600 border border-gray-200",
                ].join(" ")}
              >
                <span className="text-[10px] font-medium">{dayLabel}</span>
                <span className="text-base font-bold leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-column layout on tablet+ or landscape mobile */}
      <div className={`grid gap-5 items-start ${isTabletOrAbove || isLandscape ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* Left: Task list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">タスク一覧</h3>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowTaskForm(true)}
            >
              + タスク追加
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-10 text-red-500 text-sm">
              タスクの取得に失敗しました
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-14">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-500 text-sm">タスクがありません</p>
              <p className="text-gray-400 text-xs mt-1">「+ タスク追加」からタスクを作成しましょう</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Right: AI panel */}
        <div className="space-y-3">
          <Button
            variant="secondary"
            className="w-full border-dashed border-primary-500 text-primary-600 hover:bg-indigo-50"
            onClick={handleAiOptimize}
            loading={aiLoading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AIでタスクを最適化
          </Button>

          {aiAdvice && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-700 mb-1">AIアドバイス</p>
                  <p className="text-sm text-indigo-900 whitespace-pre-wrap">{aiAdvice}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          defaultDate={selectedDate}
        />
      )}
    </div>
  );
}
