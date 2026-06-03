import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        return `今日は${briefing.task_count}件・${timeStr}。${topHint}`;
      })()
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5 mb-16 md:mb-0">
      {/* Daily briefing banner */}
      {briefing && !briefingDismissed && briefingText && (
        <div className="flex items-start gap-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3">
          <p className="flex-1 text-sm text-[var(--text-muted)] tracking-wide">{briefingText}</p>
          <button
            onClick={() => setBriefingDismissed(true)}
            className="shrink-0 text-[var(--text-subtle)] hover:text-[var(--text-primary)] text-lg leading-none mt-0.5"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      )}

      {/* Tablet+: stats row */}
      {isTabletOrAbove && (
        <div className="flex gap-8 border-b border-[var(--border)] pb-6">
          {[
            { value: completedCount, label: "DONE" },
            { value: totalCount, label: "TOTAL" },
            { value: `${achievementRate}%`, label: "RATE" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-light tracking-tight text-[var(--text-primary)]">{value}</p>
              <p className="text-[10px] tracking-[0.2em] text-[var(--text-subtle)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Date selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className={`font-bold text-[var(--text-primary)] tracking-wider ${isPhoneSmall ? "text-xl" : "text-2xl"}`}>{todayLabel}</h2>
            {!isTabletOrAbove && (
              <p className={`text-[var(--text-subtle)] tracking-wide ${isPhoneSmall ? "text-xs" : "text-sm"}`}>
                {t("dashboard.pending")}: {pendingCount} / {t("dashboard.done_count")}: {completedCount}
              </p>
            )}
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="hidden sm:block border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Mobile date chips */}
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
                    ? "bg-[var(--accent)] text-white dark:text-[#0f0f0f] border-transparent"
                    : isToday
                    ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--text-subtle)]"
                    : "bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border)]",
                ].join(" ")}
              >
                <span className="text-[10px] font-medium tracking-wider uppercase">{dayLabel}</span>
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)]">
              {tasks.length > 0 ? `${tasks.length} ${t("dashboard.tasks_label")}` : t("dashboard.no_tasks")}
            </span>
            <button
              onClick={() => setShowTaskForm(true)}
              className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {t("dashboard.add")}
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] p-4 animate-pulse">
                  <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-10 text-[var(--text-muted)] text-sm">
              タスクの取得に失敗しました
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-14 flex flex-col items-center">
              <div className="w-16 h-16 border border-[var(--border)] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-[var(--text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-[var(--text-primary)] text-base font-light tracking-wide mb-1">
                今日のタスクはまだありません
              </p>
              <p className="text-[var(--text-subtle)] text-xs mb-6 leading-relaxed">
                新しいタスクを追加して、<br />生産的な1日を始めましょう
              </p>
              <button
                onClick={() => setShowTaskForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 border border-[var(--border)] text-[var(--text-muted)] text-sm tracking-wide hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                タスクを追加
              </button>
            </div>
          ) : (
            <div className="space-y-2">
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
            className="w-full"
            onClick={handleAiOptimize}
            loading={aiLoading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t("dashboard.ai_optimize")}
          </Button>

          {aiAdvice && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 border border-[var(--border)] rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-[var(--text-subtle)] mb-1">{t("dashboard.ai_advice")}</p>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{aiAdvice}</p>
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
