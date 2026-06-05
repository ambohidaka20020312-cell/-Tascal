import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Task } from "../../store/taskStore";
import Button from "../common/Button";
import { useCompleteTask, useDeleteTask, useUpdateTask, useSubtasks } from "../../hooks/useTasks";
import { useViewport } from "../../hooks/useViewport";
import OverrunAlert from "../ai/OverrunAlert";
import { useFocusStore } from "../../store/focusStore";
import CategoryBadge from "./CategoryBadge";
import TaskNotesPanel from "./TaskNotesPanel";
import SubtaskList from "./SubtaskList";

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDatetime);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 3) return "soon";
  return "none";
}

function getDaysUntilDue(dueDatetime: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDatetime);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const startFocus = useFocusStore((s) => s.startFocus);

  // Only fetch subtasks for parent tasks (parent_task_id == null)
  const isParentTask = task.parent_task_id == null;
  const { data: subtasks } = useSubtasks(task.id, isParentTask && showSubtasks);
  const subtaskCount = subtasks?.length ?? 0;

  const { deviceType } = useViewport();
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
      completeTask.mutate({ id: task.id, actual_minutes: mins });
      setShowCompleteModal(false);
      setActualMinutes("");
    }
  };

  const handleDelete = () => {
    if (confirm(t('task.delete') + "?")) {
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

  return (
    <>
      <article
        aria-label={task.title}
        style={{ opacity: isDragging && draggedId === task.id ? 0.5 : 1 }}
        className={[
          "group border-b border-[var(--border)] -mx-4 px-4 transition-colors hover:bg-[var(--bg-secondary)]",
          task.status === "completed" ? "opacity-40" : "",
          selectable && selected ? "bg-[var(--bg-secondary)]" : "",
          isDropTarget ? "border-t-2 border-t-[var(--text-muted)]" : "",
        ].join(" ")}
      >
        <div className={`flex items-start gap-3 ${isPhoneSmall ? "py-3" : "py-4"}`}>
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

                {/* Due date badges — monochrome, opacity-only emphasis */}
                {dueDateState === "overdue" && (
                  <span
                    className={`${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide font-semibold`}
                    style={{ color: "var(--text-primary)", opacity: 0.9 }}
                    aria-label="期限超過"
                  >
                    · 期限超過
                  </span>
                )}
                {dueDateState === "today" && (
                  <span
                    className={`${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide font-medium`}
                    style={{ color: "var(--text-primary)", opacity: 0.75 }}
                    aria-label="今日締切"
                  >
                    · 今日締切
                  </span>
                )}
                {dueDateState === "soon" && task.due_datetime && (
                  <span
                    className={`${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide`}
                    style={{ color: "var(--text-muted)", opacity: 0.85 }}
                    aria-label={`あと${getDaysUntilDue(task.due_datetime)}日`}
                  >
                    · あと{getDaysUntilDue(task.due_datetime)}日
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
                      {isTabletOrAbove && task.due_datetime && (
                        <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                          {t('task.due_date')}: {task.due_datetime.split("T")[0]}
                        </p>
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
                    onClick={() => setShowCompleteModal(true)}
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
                onClick={handleDelete}
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
    </>
  );
}
