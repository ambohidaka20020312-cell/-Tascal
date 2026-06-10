import { useState, useEffect, useRef, useCallback } from "react";
import { format, addDays, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useTaskStore } from "../store/taskStore";
import { useAuthStore } from "../store/authStore";
import { useTasksQuery, useBulkComplete, useBulkDelete, useOverdueTasks } from "../hooks/useTasks";
import { aiApi, taskApi } from "../utils/api";
import { useAdGate } from "../hooks/useAdGate";
import { useViewport } from "../hooks/useViewport";
import { useDailyBriefing } from "../hooks/useDailyBriefing";
import { useDragSort } from "../hooks/useDragSort";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { parseNaturalLanguageTask, ParsedTask } from "../utils/nlpTaskParser";
import TaskCard from "../components/tasks/TaskCard";
import TaskForm from "../components/tasks/TaskForm";
import TaskSearch from "../components/tasks/TaskSearch";
import Button from "../components/common/Button";
import CategoryFilter from "../components/tasks/CategoryFilter";
import ExportModal from "../components/tasks/ExportModal";
import { useCategories } from "../hooks/useCategories";
import DailyBriefingPanel from "../components/ai/DailyBriefingPanel";
import ReplanButton from "../components/ai/ReplanButton";
import TaskSuggestions from "../components/ai/TaskSuggestions";
import AdBanner from "../components/ads/AdBanner";
import VideoAdGate from "../components/ads/VideoAdGate";
import OverdueBanner from "../components/tasks/OverdueBanner";
import StatsBar from "../components/dashboard/StatsBar";

type FilterStatus = "all" | "pending" | "in_progress" | "completed" | "overrun" | "overdue";

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

function priorityLabel(p: ParsedTask["priority"]) {
  switch (p) {
    case "urgent": return "最優先";
    case "high": return "高";
    case "low": return "低";
    default: return "中";
  }
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { tasks, selectedDate, setSelectedDate, reorderTasks } = useTaskStore();
  const user = useAuthStore((s) => s.user);
  const { needsAd, incrementCount } = useAdGate();
  const [showAdGate, setShowAdGate] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [taskFormInit, setTaskFormInit] = useState<Partial<ParsedTask>>({});
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [briefingDismissed, setBriefingDismissed] = useState(false);
  const [replanLoading, setReplanLoading] = useState(false);
  const [replanMessage, setReplanMessage] = useState<string | null>(null);
  const { briefing } = useDailyBriefing();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Filter chip state
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);

  const { data: categories = [] } = useCategories();

  // Bulk select state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const bulkComplete = useBulkComplete();
  const bulkDelete = useBulkDelete();

  const handleSelectTask = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleBulkComplete = async () => {
    if (selectedIds.size === 0) return;
    await bulkComplete.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件のタスクを削除しますか？`)) return;
    await bulkDelete.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  const handleCancelBulk = () => {
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  // Quick-add state
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickAddText, setQuickAddText] = useState("");
  const [quickAddParsed, setQuickAddParsed] = useState<ParsedTask | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const filterChipRef = useRef<HTMLButtonElement>(null);
  const selectedDateChipRef = useRef<HTMLButtonElement>(null);

  const { deviceType, isLandscape } = useViewport();
  const isPhoneSmall = deviceType === "phone-small";
  const isTabletOrAbove =
    deviceType === "tablet" || deviceType === "desktop" || deviceType === "ultrawide";

  const { isLoading, isError, refetch: refetchTasks } = useTasksQuery(selectedDate, filterCategoryId);

  // Pull-to-refresh (mobile)
  const pageRef = useRef<HTMLDivElement>(null);
  const { refreshing, pulling, pullDistance } = usePullToRefresh(pageRef, {
    onRefresh: async () => { await refetchTasks(); },
    threshold: 50,
  });
  const { data: overdueTasks = [] } = useOverdueTasks();

  const { handlers: dragHandlers, dragIndex, overIndex, isDragging, draggedId, onKeyDown: dragKeyDown } = useDragSort(tasks, (reordered) => {
    reorderTasks(reordered);
    taskApi.reorder(reordered.map((t) => t.id)).catch(() => {
      // silently ignore reorder persistence errors
    });
  });

  // Voice input: parse result and open TaskForm pre-filled
  const handleVoiceResult = useCallback((transcript: string) => {
    const parsed = parseNaturalLanguageTask(transcript);
    setTaskFormInit(parsed);
    setShowTaskForm(true);
  }, []);

  const { isSupported: voiceSupported, isListening, start: startListening, stop: stopListening } =
    useSpeechInput(handleVoiceResult);

  // Custom event listeners for global keyboard shortcuts
  useEffect(() => {
    const onOpenTaskForm = () => {
      openTaskForm();
    };
    const onPrefillTaskForm = (e: Event) => {
      const detail = (e as CustomEvent<Partial<ParsedTask>>).detail;
      setTaskFormInit(detail ?? {});
      setShowTaskForm(true);
    };
    const onCloseOverlays = () => {
      setQuickAddVisible(false);
      setQuickAddText("");
      setQuickAddParsed(null);
      setShowTaskForm(false);
    };
    const onFocusFilter = () => {
      searchRef.current?.focus();
    };
    const onSetFilterAll = () => setFilterStatus("all");
    const onSetFilterTodo = () => setFilterStatus("pending");
    const onSetFilterInProgress = () => setFilterStatus("in_progress");
    const onSetFilterDone = () => setFilterStatus("completed");
    const onSetFilterOverdue = () => setFilterStatus("overdue");

    window.addEventListener("open-task-form", onOpenTaskForm);
    window.addEventListener("prefill-task-form", onPrefillTaskForm);
    window.addEventListener("close-overlays", onCloseOverlays);
    window.addEventListener("focus-filter", onFocusFilter);
    window.addEventListener("set-filter:all", onSetFilterAll);
    window.addEventListener("set-filter:todo", onSetFilterTodo);
    window.addEventListener("set-filter:in_progress", onSetFilterInProgress);
    window.addEventListener("set-filter:done", onSetFilterDone);
    window.addEventListener("set-filter:overdue", onSetFilterOverdue);

    return () => {
      window.removeEventListener("open-task-form", onOpenTaskForm);
      window.removeEventListener("prefill-task-form", onPrefillTaskForm);
      window.removeEventListener("close-overlays", onCloseOverlays);
      window.removeEventListener("focus-filter", onFocusFilter);
      window.removeEventListener("set-filter:all", onSetFilterAll);
      window.removeEventListener("set-filter:todo", onSetFilterTodo);
      window.removeEventListener("set-filter:in_progress", onSetFilterInProgress);
      window.removeEventListener("set-filter:done", onSetFilterDone);
      window.removeEventListener("set-filter:overdue", onSetFilterOverdue);
    };
  }, []);

  // Focus quick-add input when shown
  useEffect(() => {
    if (quickAddVisible) {
      setTimeout(() => quickAddRef.current?.focus(), 50);
    }
  }, [quickAddVisible]);

  // Scroll selected date chip into view on load and when selectedDate changes
  useEffect(() => {
    if (selectedDateChipRef.current) {
      selectedDateChipRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedDate]);

  const handleQuickAddChange = (value: string) => {
    setQuickAddText(value);
    if (value.trim()) {
      setQuickAddParsed(parseNaturalLanguageTask(value));
    } else {
      setQuickAddParsed(null);
    }
  };

  const handleQuickAddConfirm = () => {
    if (!quickAddParsed || !quickAddText.trim()) return;
    setTaskFormInit(quickAddParsed);
    setQuickAddVisible(false);
    setQuickAddText("");
    setQuickAddParsed(null);
    setShowTaskForm(true);
  };

  const handleQuickAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleQuickAddConfirm();
    } else if (e.key === "Escape") {
      setQuickAddVisible(false);
      setQuickAddText("");
      setQuickAddParsed(null);
    }
  };

  const plan = user?.effective_plan ?? "free";

  const openTaskForm = () => {
    if (needsAd(plan)) {
      setShowAdGate(true);
      return;
    }
    incrementCount();
    setTaskFormInit({});
    setShowTaskForm(true);
  };

  const handleAdComplete = () => {
    setShowAdGate(false);
    incrementCount();
    setTaskFormInit({});
    setShowTaskForm(true);
  };

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

  const handleReplan = async () => {
    const overrunTask = tasks.find((t) => t.status === "overrun");
    if (!overrunTask) return;
    setReplanLoading(true);
    setReplanMessage(null);
    try {
      const res = await aiApi.replan(overrunTask.id, overrunTask.actual_minutes ?? overrunTask.estimated_minutes ?? 0);
      const data = res.data.data ?? res.data;
      setReplanMessage(data.message ?? data.advice ?? "再計画が完了しました。");
    } catch {
      setReplanMessage("再計画に失敗しました。再度お試しください。");
    } finally {
      setReplanLoading(false);
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

  // Filter chip counts
  const chipCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overrun: tasks.filter((t) => t.status === "overrun").length,
    overdue: overdueTasks.length,
  };

  const filteredTasks = filterStatus === "overdue"
    ? overdueTasks.filter((t) => {
        const q = searchQuery.toLowerCase();
        return (
          !q ||
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false)
        );
      })
    : tasks.filter((t) => {
        const matchesStatus = filterStatus === "all" || t.status === filterStatus;
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false);
        return matchesStatus && matchesSearch;
      });

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
    <div ref={pageRef} className="max-w-2xl mx-auto space-y-5 mb-16 md:mb-0">
      {/* Pull-to-refresh indicator */}
      {(pulling || refreshing) && (
        <div
          className="flex items-center justify-center text-[var(--text-muted)] transition-all"
          style={{ height: pulling ? Math.min(pullDistance, 50) : 0, overflow: "hidden" }}
        >
          {refreshing ? (
            <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--text-muted)] rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </div>
      )}

      {/* Overdue tasks banner */}
      <OverdueBanner />

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
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-8 w-10 bg-[var(--bg-tertiary)] rounded mb-1" />
                <div className="h-2.5 w-8 bg-[var(--bg-tertiary)] rounded" />
              </div>
            ))
          ) : (
            [
              { value: completedCount, label: "DONE" },
              { value: totalCount, label: "TOTAL" },
              { value: `${achievementRate}%`, label: "RATE" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-light tracking-tight text-[var(--text-primary)]">{value}</p>
                <p className="text-[10px] tracking-[0.2em] text-[var(--text-subtle)] mt-0.5">{label}</p>
              </div>
            ))
          )}
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
          <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-shortcuts"))}
            aria-label="キーボードショートカット一覧"
            title="キーボードショートカット一覧"
            className="w-5 h-5 flex items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:border-[var(--text-muted)] transition-colors text-[10px] font-medium leading-none"
          >
            ?
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="hidden sm:block border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
          </div>
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
                ref={isSelected ? selectedDateChipRef : undefined}
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

      {/* 今日の進捗ヒーローストリップ */}
      {!isLoading && totalCount > 0 && (() => {
        const overrunTasks = tasks.filter((t) => t.status === "overrun");
        const hasOverrun = overrunTasks.length > 0;
        const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const overrunMinutes = overrunTasks.reduce((sum, t) => {
          if (t.estimated_minutes && t.actual_minutes && t.actual_minutes > t.estimated_minutes) {
            return sum + (t.actual_minutes - t.estimated_minutes);
          }
          return sum + (t.estimated_minutes ?? 0);
        }, 0);

        return (
          <div className={`rounded-xl border-l-4 px-4 py-3 ${hasOverrun ? "border-l-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40" : "border-l-green-400 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40"}`}>
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                {hasOverrun ? (
                  <span className="text-amber-500 text-base">⚠</span>
                ) : (
                  <span className="text-green-500 text-base">✓</span>
                )}
                <span className={`text-sm font-medium ${hasOverrun ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>
                  {hasOverrun ? "狂わない一日モード" : "順調です"}
                </span>
              </div>
              <span className="text-xs text-[var(--text-subtle)]">
                {completedCount} / {totalCount} 完了
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${hasOverrun ? "bg-amber-400" : "bg-green-400"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {hasOverrun && (
              <div className="mt-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                  {overrunMinutes > 0 ? `${overrunMinutes}分超過しています` : `${overrunTasks.length}件のタスクが超過中です`}
                </p>
                {replanMessage ? (
                  <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 leading-relaxed">{replanMessage}</p>
                ) : (
                  <button
                    onClick={handleReplan}
                    disabled={replanLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-white rounded-lg text-xs font-medium tracking-wide transition-colors"
                  >
                    {replanLoading ? (
                      <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    残りタスクを再計画する
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Two-column layout on tablet+ or landscape mobile */}
      <div className={`grid gap-5 items-start ${isTabletOrAbove || isLandscape ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* Left: Task list */}
        <div className="space-y-3">
          {/* Task list header with voice + add buttons */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)]">
              {tasks.length > 0 ? `${tasks.length} ${t("dashboard.tasks_label")}` : t("dashboard.no_tasks")}
            </span>
            <div className="flex items-center gap-2">
              {/* Voice input button — only shown if Speech API is available */}
              {voiceSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  aria-label={isListening ? "録音を停止" : "音声でタスクを追加"}
                  title={isListening ? "録音を停止" : "音声でタスクを追加"}
                  className={[
                    "relative flex items-center justify-center w-6 h-6 rounded-full transition-colors",
                    isListening
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {/* Pulsing ring when recording */}
                  {isListening && (
                    <span className="absolute inset-0 rounded-full border border-[var(--text-primary)] animate-ping opacity-60" />
                  )}
                  {/* Red dot indicator */}
                  {isListening && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] animate-pulse" />
                  )}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowExportModal(true)}
                aria-label="タスクをエクスポート"
                title="エクスポート"
                className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
              <button
                onClick={openTaskForm}
                className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {t("dashboard.add")}
              </button>
              {tasks.length > 0 && (
                <button
                  onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
                  className={[
                    "text-[10px] tracking-[0.15em] uppercase transition-colors",
                    bulkMode
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  選択
                </button>
              )}
            </div>
          </div>
          {/* Stats bar */}
          <StatsBar />

          {/* Search input */}
          <TaskSearch value={searchQuery} onChange={setSearchQuery} inputRef={searchRef} />
          {searchQuery && (
            <p className="text-[11px] text-[var(--text-subtle)] tracking-wide">
              {filteredTasks.length}件のタスクが見つかりました
            </p>
          )}

          {/* Daily briefing panel */}
          <DailyBriefingPanel />

          {/* Filter chips */}
          {tasks.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
              {(
                [
                  { key: "all", label: "すべて" },
                  { key: "pending", label: "未着手" },
                  { key: "in_progress", label: "進行中" },
                  { key: "completed", label: "完了" },
                  { key: "overrun", label: "期限超過" },
                  { key: "overdue", label: "期日超過" },
                ] as { key: FilterStatus; label: string }[]
              ).map(({ key, label }, idx) => {
                const count = chipCounts[key];
                const active = filterStatus === key;
                return (
                  <button
                    key={key}
                    ref={idx === 0 ? filterChipRef : undefined}
                    onClick={() => setFilterStatus(key)}
                    className={[
                      "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] tracking-wide transition-colors",
                      active
                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                        : "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]",
                    ].join(" ")}
                  >
                    {label}
                    <span
                      className={[
                        "inline-flex items-center justify-center rounded-full w-4 h-4 text-[9px] font-medium",
                        active
                          ? "bg-[var(--bg-primary)] text-[var(--text-primary)] opacity-70"
                          : "bg-[var(--bg-secondary)] text-[var(--text-subtle)]",
                      ].join(" ")}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Category filter */}
          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              selected={filterCategoryId}
              onSelect={setFilterCategoryId}
            />
          )}

          {/* Quick-add text input */}
          {quickAddVisible && (
            <div className="mb-2">
              <input
                ref={quickAddRef}
                type="text"
                value={quickAddText}
                onChange={(e) => handleQuickAddChange(e.target.value)}
                onKeyDown={handleQuickAddKeyDown}
                placeholder="タスクを追加... (例: 明日の会議資料を作る 1時間 高優先度)"
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-subtle)]"
              />
              {quickAddParsed && quickAddText.trim() && (
                <div className="mt-1.5 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text-muted)] space-y-0.5">
                  <div className="flex gap-3 flex-wrap">
                    <span>
                      <span className="text-[var(--text-subtle)] tracking-wide">タイトル</span>{" "}
                      <span className="text-[var(--text-primary)]">{quickAddParsed.title || "—"}</span>
                    </span>
                    {quickAddParsed.estimated_minutes && (
                      <span>
                        <span className="text-[var(--text-subtle)] tracking-wide">時間</span>{" "}
                        <span className="text-[var(--text-primary)]">{quickAddParsed.estimated_minutes}分</span>
                      </span>
                    )}
                    <span>
                      <span className="text-[var(--text-subtle)] tracking-wide">優先度</span>{" "}
                      <span className="text-[var(--text-primary)]">{priorityLabel(quickAddParsed.priority)}</span>
                    </span>
                    {quickAddParsed.scheduled_date && (
                      <span>
                        <span className="text-[var(--text-subtle)] tracking-wide">日付</span>{" "}
                        <span className="text-[var(--text-primary)]">{quickAddParsed.scheduled_date}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleQuickAddConfirm}
                      className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-primary)] hover:opacity-70 transition-opacity"
                    >
                      確定 (Enter)
                    </button>
                    <span className="text-[var(--border)]">·</span>
                    <button
                      onClick={() => { setQuickAddVisible(false); setQuickAddText(""); setQuickAddParsed(null); }}
                      className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
                    >
                      キャンセル (Esc)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[3, 4, 5, 3, 4].map((widthClass, i) => (
                <div
                  key={i}
                  className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] p-4 animate-pulse"
                >
                  {/* Title row: priority dot + title bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--bg-tertiary)] flex-shrink-0" />
                    <div
                      className="h-4 bg-[var(--bg-tertiary)] rounded"
                      style={{ width: `${widthClass * 16}%` }}
                    />
                  </div>
                  {/* Metadata row */}
                  <div className="flex gap-3 ml-4">
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-16" />
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-10 text-[var(--text-muted)] text-sm">
              タスクの取得に失敗しました
            </div>
          ) : filteredTasks.length === 0 ? (
            /* New-user / empty state */
            tasks.length === 0 && !searchQuery && filterStatus === "all" && filterCategoryId == null ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-20 h-20 border border-[var(--border)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-[var(--text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-[var(--text-primary)] text-lg font-light tracking-wide mb-2">
                  今日のタスクはまだありません
                </p>
                <p className="text-[var(--text-subtle)] text-sm mb-7 leading-relaxed max-w-xs">
                  最初のタスクを追加して、AIに1日を最適化してもらいましょう
                </p>
                <button
                  onClick={openTaskForm}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white dark:text-[#0f0f0f] rounded-xl text-sm font-medium tracking-wide hover:opacity-90 transition-opacity mb-8"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  タスクを追加
                </button>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { icon: "🤖", label: "AIが優先順位を提案" },
                    { icon: "⏱", label: "見積もり時間を学習" },
                    { icon: "🔄", label: "超過したら自動再計画" },
                  ].map(({ icon, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-full text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)]"
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-14 flex flex-col items-center">
                <div className="w-16 h-16 border border-[var(--border)] rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-[var(--text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-[var(--text-primary)] text-base font-light tracking-wide mb-1">
                  タスクが見つかりません
                </p>
                <p className="text-[var(--text-subtle)] text-xs leading-relaxed">
                  フィルターを変更するか、新しいタスクを追加してください
                </p>
              </div>
            )
          ) : (
            <div className="space-y-2 pb-24 sm:pb-4">
              {filteredTasks.map((task, index) => (
                <div
                  key={task.id}
                  {...(bulkMode ? {} : dragHandlers(index))}
                  className={[
                    "group/drag relative transition-opacity",
                    !bulkMode && dragIndex === index ? "opacity-50 cursor-grabbing" : !bulkMode ? "cursor-grab" : "",
                    "",
                  ].join(" ")}
                >
                  {/* Drag handle — hidden in bulk mode */}
                  {!bulkMode && (
                    <span
                      aria-hidden="true"
                      className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/drag:opacity-100 text-[var(--text-subtle)] text-xs select-none pointer-events-none transition-opacity z-10"
                      style={{ lineHeight: 1 }}
                    >
                      ⠿
                    </span>
                  )}
                  <TaskCard
                    task={task}
                    selectable={bulkMode}
                    selected={selectedIds.has(task.id)}
                    onSelect={handleSelectTask}
                    categoryName={task.category_id != null ? categories.find((c) => c.id === task.category_id)?.name : undefined}
                    isDragging={isDragging}
                    draggedId={draggedId}
                    isDropTarget={!bulkMode && overIndex === index && dragIndex !== index}
                    onKeyDown={bulkMode ? undefined : dragKeyDown}
                  />
                  {!bulkMode && task.status === "in_progress" && task.estimated_minutes != null && task.estimated_minutes > 0 && (
                    <div className="flex justify-end px-1 -mt-1 mb-1">
                      <ReplanButton
                        taskId={task.id}
                        estimatedMinutes={task.estimated_minutes}
                      />
                    </div>
                  )}
                </div>
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

      {/* Mobile FAB — visible only on mobile, above bottom nav */}
      <button
        onClick={openTaskForm}
        aria-label="タスクを追加"
        className="sm:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-[var(--accent)] text-white dark:text-[#0f0f0f] shadow-lg flex items-center justify-center transition-transform active:scale-95"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Bulk action floating bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="fixed left-0 right-0 bottom-20 md:bottom-4 flex justify-center px-4 z-40 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-lg">
            <button
              onClick={handleBulkComplete}
              disabled={bulkComplete.isPending}
              className="text-xs tracking-wide text-[var(--text-primary)] hover:opacity-70 transition-opacity disabled:opacity-40 border border-[var(--border)] px-3 py-1.5 rounded-lg"
            >
              {bulkComplete.isPending ? "…" : `${selectedIds.size}件を完了にする`}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
              className="text-xs tracking-wide text-[var(--text-primary)] hover:opacity-70 transition-opacity disabled:opacity-40 border border-[var(--border)] px-3 py-1.5 rounded-lg"
            >
              {bulkDelete.isPending ? "…" : `${selectedIds.size}件を削除する`}
            </button>
            <button
              onClick={handleCancelBulk}
              className="text-xs tracking-wide text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors px-2 py-1.5"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {showAdGate && (
        <VideoAdGate onComplete={handleAdComplete} onClose={() => setShowAdGate(false)} />
      )}

      {showTaskForm && (
        <TaskForm
          onClose={() => { setShowTaskForm(false); setTaskFormInit({}); }}
          defaultDate={selectedDate}
          initialTitle={taskFormInit.title}
          initialPriority={taskFormInit.priority}
          initialEstimatedMinutes={taskFormInit.estimated_minutes}
          initialScheduledDate={taskFormInit.scheduled_date}
          initialDescription={taskFormInit.description_hint}
        />
      )}

      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />

      {/* AI task suggestions based on past patterns */}
      <TaskSuggestions />

      {/* Ad slot for free plan users — shown at the bottom of the dashboard */}
      <AdBanner slot="1234567890" format="auto" className="mt-4 min-h-[90px]" />
    </div>
  );
}
