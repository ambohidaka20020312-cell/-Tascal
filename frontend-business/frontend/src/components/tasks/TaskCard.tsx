import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Task } from "../../store/taskStore";
import Button from "../common/Button";
import { useCompleteTask, useDeleteTask, useUpdateTask, useSubtasks } from "../../hooks/useTasks";
import { useViewport } from "../../hooks/useViewport";
import OverrunAlert from "../ai/OverrunAlert";
import { useFocusStore } from "../../store/focusStore";
import { useMiniTimerStore } from "../../store/miniTimerStore";
import CategoryBadge from "./CategoryBadge";
import TaskNotesPanel from "./TaskNotesPanel";
import SubtaskList from "./SubtaskList";
import { haptics } from "../../utils/haptics";
import { useLongPress } from "../../hooks/useLongPress";

interface TaskCardProps {
  task: Task;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: number, checked: boolean) => void;
  categoryName?: string;
  isDragging?: boolean;
  draggedId?: number | null;
  isDropTarget?: boolean;
  onKeyDown?: (id: number, e: KeyboardEvent) => void;
}

// Monochrome priority dots — color by shade, not hue
const priorityConfig: Record<
  Task["priority"],
  { labelKey: string; dotClass: string; labelClass: string }
> = {
  urgent: { labelKey: "task.priority_urgent", dotClass: "bg-ink", labelClass: "text-[var(--text-primary)] font-medium" },
  high: { labelKey: "task.priority_high", dotClass: "bg-ink-muted", labelClass: "text-[var(--text-muted)]" },
  medium: { labelKey: "task.priority_medium", dotClass: "bg-ink-subtle", labelClass: "text-[var(--text-muted)]" },
  low: { labelKey: "task.priority_low", dotClass: "bg-ink-faint", labelClass: "text-[var(--text-subtle)]" },
};

const statusConfig: Record<Task["status"], { labelKey: string; className: string }> = {
  pending: { labelKey: "task.start", className: "text-[var(--text-subtle)]" },
  in_progress: { labelKey: "task.pause", className: "text-[var(--text-muted)]" },
  completed: { labelKey: "task.complete", className: "text-[var(--text-subtle)]" },
  overrun: { labelKey: "ai.overrun_message", className: "text-[var(--text-primary)]" },
};

/** Returns due date state relative to today */
function getDueDateState(dueDatetime: string | null): "overdue" | "today" | "soon" | "none" {
  if (!dueDatetime) return "none";
  const now = new Date();
  const due = new Date(dueDatetime);
  if (due < now) return "overdue";
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  if (due <= todayEnd) return "today";
  const soonEnd = new Date(); soonEnd.setDate(soonEnd.getDate() + 3); soonEnd.setHours(23, 59, 59, 999);
  if (due <= soonEnd) return "soon";
  return "none";
}

function getDaysUntilDue(dueDatetime: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDatetime); due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** "今日15:30" or "6/10 15:30" or "6/10" */
function formatDueLabel(dueDatetime: string): string {
  const due = new Date(dueDatetime);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
  const hasTime = due.getHours() !== 23 || due.getMinutes() !== 59;
  const timeStr = hasTime
    ? ` ${String(due.getHours()).padStart(2, "0")}:${String(due.getMinutes()).padStart(2, "0")}`
    : "";
  if (dueDay.getTime() === today.getTime()) return `今日${timeStr}`;
  return `${due.getMonth() + 1}/${due.getDate()}${timeStr}`;
}

/** "あと2h30m" style countdown for same-day deadlines */
function getCountdown(dueDatetime: string): string | null {
  const due = new Date(dueDatetime);
  const diffMs = due.getTime() - Date.now();
  if (diffMs <= 0 || diffMs > 24 * 60 * 60 * 1000) return null;
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return h > 0 ? `あと${h}h${m}m` : `あと${m}分`;
}

export default function TaskCard({ task, selectable, selected, onSelect, categoryName, isDragging, draggedId, isDropTarget, onKeyDown: _onKeyDown }: TaskCardProps) {
  const { t } = useTranslation();
  const [actualMinutes, setActualMinutes] = useState<string>("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState(
    task.estimated_minutes != null ? String(task.estimated_minutes) : ""
  );

  // Swipe gesture state
  const [swipeX, setSwipeX] = useState(0);
  const [swipeState, setSwipeState] = useState<"idle" | "delete" | "complete">("idle");
  const [deleteConfirmPending, setDeleteConfirmPending] = useState(false);
  const swipeTouchStartX = useRef(0);
  const swipeTouchStartY = useRef(0);
  const swipeTracking = useRef(false);
  const SWIPE_THRESHOLD = 60;

  // Long press action sheet
  const [showActionSheet, setShowActionSheet] = useState(false);

  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const startFocus = useFocusStore((s) => s.startFocus);
  const {
    activeTaskId: timerTaskId,
    isRunning: timerRunning,
    startTimer,
    pauseTimer: pauseMiniTimer,
    resumeTimer: resumeMiniTimer,
  } = useMiniTimerStore();

  // Only fetch subtasks for parent tasks (parent_task_id == null)
  const isParentTask = task.parent_task_id == null;
  const { data: subtasks } = useSubtasks(task.id, isParentTask && showSubtasks);
  const subtaskCount = subtasks?.length ?? 0;

  const { deviceType } = useViewport();
  const isPhone = deviceType === "phone-small" || deviceType === "phone" || deviceType === "phone-large";
  const isPhoneSmall = deviceType === "phone-small";
  const isTabletOrAbove =
    deviceType === "tablet" || deviceType === "desktop" || deviceType === "ultrawide";

  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  const isOverrunning =
    task.status === "in_progress" &&
    task.estimated_minutes != null &&
    task.actual_minutes != null &&
    task.actual_minutes > task.estimated_minutes;

  const dueDateState = getDueDateState(task.due_datetime);

  const handleComplete = () => {
    const mins = parseInt(actualMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      haptics.success();
      completeTask.mutate({ id: task.id, actual_minutes: mins });
      setShowCompleteModal(false);
      setActualMinutes("");
    }
  };

  const handleDelete = useCallback(() => {
    haptics.error();
    deleteTask.mutate(task.id);
  }, [deleteTask, task.id]);

  const handleDeleteWithConfirm = () => {
    if (confirm(t('task.delete') + "?")) {
      haptics.error();
      deleteTask.mutate(task.id);
    }
  };

  const handleEditSave = () => {
    if (!editTitle.trim()) return;
    updateTask.mutate({
      id: task.id,
      title: editTitle.trim(),
      estimated_minutes: editEstimatedMinutes ? parseInt(editEstimatedMinutes, 10) : null,
    });
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditTitle(task.title);
    setEditEstimatedMinutes(task.estimated_minutes != null ? String(task.estimated_minutes) : "");
    setIsEditing(false);
  };

  // ── Swipe gesture handlers ──
  const onSwipeTouchStart = (e: React.TouchEvent) => {
    swipeTouchStartX.current = e.touches[0].clientX;
    swipeTouchStartY.current = e.touches[0].clientY;
    swipeTracking.current = true;
  };

  const onSwipeTouchMove = (e: React.TouchEvent) => {
    if (!swipeTracking.current) return;
    const dx = e.touches[0].clientX - swipeTouchStartX.current;
    const dy = e.touches[0].clientY - swipeTouchStartY.current;

    // Cancel if more vertical than horizontal
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      swipeTracking.current = false;
      setSwipeX(0);
      setSwipeState("idle");
      return;
    }

    if (Math.abs(dx) > 5) {
      setSwipeX(dx);
      if (dx > SWIPE_THRESHOLD) setSwipeState("complete");
      else if (dx < -SWIPE_THRESHOLD) setSwipeState("delete");
      else setSwipeState("idle");
    }
  };

  const onSwipeTouchEnd = () => {
    if (!swipeTracking.current) return;
    swipeTracking.current = false;

    if (swipeState === "complete" && task.status !== "completed") {
      haptics.success();
      setShowCompleteModal(true);
    } else if (swipeState === "delete") {
      if (deleteConfirmPending) {
        haptics.error();
        handleDelete();
        setDeleteConfirmPending(false);
      } else {
        haptics.light();
        setDeleteConfirmPending(true);
        // Auto-cancel after 3s
        setTimeout(() => setDeleteConfirmPending(false), 3000);
      }
    }

    setSwipeX(0);
    setSwipeState("idle");
  };

  // ── Long press for action sheet (mobile only) ──
  const longPressHandlers = useLongPress(() => {
    setShowActionSheet(true);
  }, { delay: 500 });

  const swipeBg =
    swipeState === "complete"
      ? "bg-green-500"
      : swipeState === "delete" || deleteConfirmPending
        ? "bg-red-500"
        : "bg-transparent";

  return (
    <>
      <article
        aria-label={task.title}
        style={{ opacity: isDragging && draggedId === task.id ? 0.5 : 1 }}
        className={[
          "group border-b border-[var(--border)] -mx-4 relative overflow-hidden",
          task.status === "completed" ? "opacity-40" : "",
          selectable && selected ? "bg-[var(--bg-secondary)]" : "",
          isDropTarget ? "border-t-2 border-t-[var(--text-muted)]" : "",
        ].join(" ")}
      >
        {/* Swipe background layer */}
        {isPhone && (
          <div
            className={`absolute inset-0 flex items-center ${swipeState === "complete" ? "justify-start pl-5" : "justify-end pr-5"} ${swipeBg} transition-colors`}
            aria-hidden="true"
          >
            {swipeState === "complete" && (
              <span className="text-white text-xl font-bold">✓</span>
            )}
            {(swipeState === "delete" || deleteConfirmPending) && (
              <span className="text-white text-xl font-bold">
                {deleteConfirmPending ? "もう一度でに削除" : "🗑️"}
              </span>
            )}
          </div>
        )}

        {/* Card content — slides with swipe */}
        <div
          className="relative bg-[var(--bg-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
          style={{
            transform: isPhone ? `translateX(${swipeX}px)` : undefined,
            transition: swipeTracking.current ? "none" : "transform 200ms ease-out",
            touchAction: isPhone ? "pan-y" : undefined,
          }}
          onTouchStart={isPhone ? (e) => { onSwipeTouchStart(e); longPressHandlers.onTouchStart(); } : undefined}
          onTouchMove={isPhone ? onSwipeTouchMove : undefined}
          onTouchEnd={isPhone ? (_e) => { onSwipeTouchEnd(); longPressHandlers.onTouchEnd(); } : undefined}
        >
          <div className={`flex items-start gap-3 px-4 ${isPhoneSmall ? "py-3" : "py-4"}`}>
            {selectable && (
              <div className="shrink-0 pt-0.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  aria-label={`${task.title}を選択`}
                  onClick={() => onSelect?.(task.id, !selected)}
                  className={[
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                    selected
                      ? "bg-[var(--text-primary)] border-[var(--text-primary)]"
                      : "border-[var(--border)] hover:border-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {selected && (
                    <svg className="w-2.5 h-2.5 text-[var(--bg-primary)]" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </button>
              </div>
            )}
            <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Priority dot + label row */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span aria-hidden="true" className={`inline-block w-2 h-2 rounded-full shrink-0 ${priority.dotClass}`} />
                  <span className="sr-only">{t(priority.labelKey)}優先度</span>
                  <span aria-hidden="true" className={`${priority.labelClass} ${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide`}>
                    {t(priority.labelKey)}
                  </span>
                  <span className={`${status.className} ${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide`}>
                    · {t(status.labelKey)}
                  </span>

                  {/* Fixed-time badge (meetings / appointments) */}
                  {task.is_fixed && (
                    <span
                      className={`${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide text-[var(--text-muted)] border border-[var(--border)] rounded px-1 py-0`}
                      aria-label="時間固定タスク"
                    >
                      🔒 {task.fixed_start_time ? `${task.fixed_start_time}〜` : "固定"}
                    </span>
                  )}

                  {/* Hard deadline badges */}
                  {task.due_datetime && dueDateState === "overdue" && (
                    <span
                      className={`${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide font-semibold text-[var(--text-primary)]`}
                      aria-label="期限超過"
                    >
                      · ⚑ 期限超過 {formatDueLabel(task.due_datetime)}
                    </span>
                  )}
                  {task.due_datetime && dueDateState === "today" && (
                    <span
                      className={`${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide font-medium text-[var(--text-primary)]`}
                      style={{ opacity: 0.85 }}
                      aria-label="今日締切"
                    >
                      · ⚑ {formatDueLabel(task.due_datetime)}
                      {getCountdown(task.due_datetime) && (
                        <span className="ml-1 text-[var(--text-subtle)]">({getCountdown(task.due_datetime)})</span>
                      )}
                    </span>
                  )}
                  {task.due_datetime && dueDateState === "soon" && (
                    <span
                      className={`${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide text-[var(--text-muted)]`}
                      aria-label={`あと${getDaysUntilDue(task.due_datetime)}日`}
                    >
                      · ⚑ {formatDueLabel(task.due_datetime)}（あと{getDaysUntilDue(task.due_datetime)}日）
                    </span>
                  )}

                  {/* Deadline type badge — only for flexible/someday with no hard deadline */}
                  {!task.due_datetime && task.deadline_type === "flexible" && (
                    <span className={`${isPhoneSmall ? "text-[10px]" : "text-xs"} text-[var(--text-subtle)] tracking-wide`}>
                      · 別日OK
                    </span>
                  )}
                  {!task.due_datetime && task.deadline_type === "someday" && (
                    <span className={`${isPhoneSmall ? "text-[10px]" : "text-xs"} text-[var(--text-subtle)] tracking-wide`}>
                      · いつでも
                    </span>
                  )}

                  {categoryName && <CategoryBadge name={categoryName} />}
                </div>

                {/* Inline edit mode */}
                {isEditing ? (
                  <div className="mt-1 space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave();
                        if (e.key === "Escape") handleEditCancel();
                      }}
                      autoFocus
                      className="w-full border-0 border-b border-[var(--border)] bg-transparent px-0 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] tracking-wide"
                      style={{ fontSize: "14px" }}
                      aria-label={t('task.title')}
                    />
                    <input
                      type="number"
                      min={1}
                      value={editEstimatedMinutes}
                      onChange={(e) => setEditEstimatedMinutes(e.target.value)}
                      placeholder={`${t('task.estimated_time')}（${t('common.minutes')}）`}
                      className="w-full border-0 border-b border-[var(--border)] bg-transparent px-0 py-1 text-xs text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                      style={{ fontSize: "12px" }}
                      aria-label={`${t('task.estimated_time')}（${t('common.minutes')}）`}
                    />
                    <div className="flex items-center gap-3 pt-0.5">
                      <button
                        onClick={handleEditSave}
                        disabled={updateTask.isPending || !editTitle.trim()}
                        className="text-xs text-[var(--text-primary)] hover:opacity-70 disabled:opacity-30 transition-opacity tracking-wide"
                      >
                        {updateTask.isPending ? "…" : "✓ 保存"}
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="text-xs text-[var(--text-subtle)] hover:opacity-70 transition-opacity tracking-wide"
                      >
                        ✗ キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <h3
                        className={[
                          "font-medium text-[var(--text-primary)] truncate tracking-wide cursor-pointer",
                          isPhoneSmall ? "text-sm" : "",
                          task.status === "completed" ? "line-through text-[var(--text-subtle)]" : "",
                        ].join(" ")}
                        onClick={() => task.status !== "completed" && setIsEditing(true)}
                      >
                        {task.title}
                      </h3>
                      {task.status !== "completed" && (
                        <button
                          onClick={() => setIsEditing(true)}
                          aria-label={`${task.title}を編集`}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
                          style={{ fontSize: "14px", lineHeight: 1 }}
                        >
                          ✎
                        </button>
                      )}
                    </div>

                    {isPhoneSmall ? (
                      <>
                        {(task.description || task.estimated_minutes != null) && (
                          <button
                            onClick={() => setExpanded((e) => !e)}
                            className="text-[10px] text-[var(--text-muted)] mt-0.5 tracking-wide"
                          >
                            {expanded ? t('common.close') : t('task.description')}
                          </button>
                        )}
                        {expanded && (
                          <>
                            {task.description && (
                              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{task.description}</p>
                            )}
                            {task.estimated_minutes != null && (
                              <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                                {t('task.estimated_time')}: {task.estimated_minutes}{t('common.minutes')}
                                {task.actual_minutes != null && ` / ${t('task.actual_time')}: ${task.actual_minutes}${t('common.minutes')}`}
                              </p>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {task.description && (
                          <p className={`text-[var(--text-muted)] mt-1 ${isTabletOrAbove ? "line-clamp-2" : "truncate"} text-sm`}>
                            {task.description}
                          </p>
                        )}
                        {task.estimated_minutes != null && (
                          <p className="text-xs text-[var(--text-subtle)] mt-1">
                            {t('task.estimated_time')}: {task.estimated_minutes}{t('common.minutes')}
                            {task.actual_minutes != null && ` / ${t('task.actual_time')}: ${task.actual_minutes}${t('common.minutes')}`}
                          </p>
                        )}
                        {isTabletOrAbove && task.estimated_minutes == null && !task.due_datetime && task.deadline_type === "today" && (
                          <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">目標時間未設定</p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                {task.status !== "completed" && (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => { haptics.light(); setShowCompleteModal(true); }}
                      loading={completeTask.isPending}
                      aria-label={`${t('task.complete')} ${task.title}`}
                    >
                      {t('task.complete')}
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startFocus(task.id, "normal")}
                      >
                        {t('task.focus')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startFocus(task.id, "pomodoro")}
                      >
                        ◎
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={
                          timerTaskId === task.id
                            ? timerRunning
                              ? "タイマーを一時停止"
                              : "タイマーを再開"
                            : "タイマーを開始"
                        }
                        onClick={() => {
                          if (timerTaskId === task.id) {
                            timerRunning ? pauseMiniTimer() : resumeMiniTimer();
                          } else {
                            startTimer(task.id, task.title);
                          }
                        }}
                        style={{
                          opacity: timerTaskId === task.id ? 1 : undefined,
                          fontWeight: timerTaskId === task.id ? 700 : undefined,
                        }}
                      >
                        {timerTaskId === task.id && timerRunning ? "⏱" : "⏱"}
                      </Button>
                    </div>
                  </>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowNotes((v) => !v)}
                  aria-label={`${task.title}のメモ`}
                  aria-expanded={showNotes}
                >
                  📝
                </Button>
                {isParentTask && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowSubtasks((v) => !v)}
                    aria-label={`${task.title}のサブタスク`}
                    aria-expanded={showSubtasks}
                  >
                    ↳{subtaskCount > 0 ? ` ${subtaskCount}` : ""}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleDeleteWithConfirm}
                  loading={deleteTask.isPending}
                  aria-label={`${t('task.delete')} ${task.title}`}
                  aria-keyshortcuts="Delete"
                >
                  {t('task.delete')}
                </Button>
              </div>
            </div>

            {isOverrunning && task.actual_minutes != null && (
              <div className="mt-3">
                <OverrunAlert task={task} actualMinutes={task.actual_minutes} />
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Delete confirm hint */}
        {deleteConfirmPending && (
          <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-white bg-red-500 py-1">
            もう一度左にスワイプで削除
          </div>
        )}
      </article>

      {showNotes && (
        <TaskNotesPanel taskId={task.id} onClose={() => setShowNotes(false)} />
      )}

      {isParentTask && showSubtasks && (
        <SubtaskList parentId={task.id} parentTitle={task.title} />
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-modal-title"
            className="bg-[var(--bg-primary)] rounded-xl p-6 w-full max-w-sm border border-[var(--border)]"
          >
            <h3 id="complete-modal-title" className="font-semibold text-[var(--text-primary)] mb-4 tracking-wide">{t('task.complete')}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {t('task.actual_time')}（{t('common.minutes')}）
            </p>
            <input
              type="number"
              min={1}
              value={actualMinutes}
              onChange={(e) => setActualMinutes(e.target.value)}
              placeholder="45"
              className="w-full border-0 border-b border-[var(--border)] bg-transparent px-0 py-2 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] mb-4"
              style={{ fontSize: "16px" }}
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCompleteModal(false)}
              >
                {t('task.cancel')}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleComplete}
                disabled={!actualMinutes || parseInt(actualMinutes) <= 0}
              >
                {t('task.complete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Long press action sheet (mobile only) */}
      {showActionSheet && isPhone && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowActionSheet(false)}>
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="タスクのアクション"
            className="relative bg-[var(--bg-primary)] rounded-t-2xl shadow-xl w-full"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>
            <p className="px-4 pb-3 text-sm font-semibold text-[var(--text-primary)] tracking-wide truncate">{task.title}</p>
            <div className="divide-y divide-[var(--border)]">
              <button
                className="w-full text-left px-5 py-4 text-sm text-[var(--text-primary)] active:bg-[var(--bg-secondary)]"
                onClick={() => { setShowActionSheet(false); setIsEditing(true); }}
              >
                ✎ 編集
              </button>
              {task.status !== "completed" && (
                <button
                  className="w-full text-left px-5 py-4 text-sm text-[var(--text-primary)] active:bg-[var(--bg-secondary)]"
                  onClick={() => { setShowActionSheet(false); haptics.light(); setShowCompleteModal(true); }}
                >
                  ✓ 完了にする
                </button>
              )}
              <button
                className="w-full text-left px-5 py-4 text-sm text-[var(--text-primary)] active:bg-[var(--bg-secondary)]"
                onClick={() => { setShowActionSheet(false); setShowNotes(true); }}
              >
                📝 メモ
              </button>
              {isParentTask && (
                <button
                  className="w-full text-left px-5 py-4 text-sm text-[var(--text-primary)] active:bg-[var(--bg-secondary)]"
                  onClick={() => { setShowActionSheet(false); setShowSubtasks(true); }}
                >
                  ↳ サブタスク
                </button>
              )}
              <button
                className="w-full text-left px-5 py-4 text-sm text-red-500 active:bg-[var(--bg-secondary)]"
                onClick={() => {
                  setShowActionSheet(false);
                  haptics.error();
                  deleteTask.mutate(task.id);
                }}
              >
                🗑️ 削除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
