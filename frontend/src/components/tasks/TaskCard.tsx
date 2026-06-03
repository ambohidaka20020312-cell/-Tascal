import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Task } from "../../store/taskStore";
import Button from "../common/Button";
import { useCompleteTask, useDeleteTask } from "../../hooks/useTasks";
import { useViewport } from "../../hooks/useViewport";
import OverrunAlert from "../ai/OverrunAlert";
import { useFocusStore } from "../../store/focusStore";

interface TaskCardProps {
  task: Task;
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

export default function TaskCard({ task }: TaskCardProps) {
  const { t } = useTranslation();
  const [actualMinutes, setActualMinutes] = useState<string>("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const startFocus = useFocusStore((s) => s.startFocus);

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

  return (
    <>
      <div
        className={[
          "group border-b border-[var(--border)] -mx-4 px-4 transition-colors hover:bg-[var(--bg-secondary)]",
          task.status === "completed" ? "opacity-40" : "",
        ].join(" ")}
      >
        <div className={`flex-1 ${isPhoneSmall ? "py-3" : "py-4"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Priority dot + label row */}
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${priority.dotClass}`} />
                <span className={`${priority.labelClass} ${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide`}>
                  {t(priority.labelKey)}
                </span>
                <span className={`${status.className} ${isPhoneSmall ? "text-[10px]" : "text-xs"} tracking-wide`}>
                  · {t(status.labelKey)}
                </span>
              </div>

              <h3
                className={[
                  "font-medium text-[var(--text-primary)] truncate tracking-wide",
                  isPhoneSmall ? "text-sm" : "",
                  task.status === "completed" ? "line-through text-[var(--text-subtle)]" : "",
                ].join(" ")}
              >
                {task.title}
              </h3>

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
            </div>

            <div className="flex flex-col gap-1 shrink-0">
              {task.status !== "completed" && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowCompleteModal(true)}
                    loading={completeTask.isPending}
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
                variant="danger"
                onClick={handleDelete}
                loading={deleteTask.isPending}
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

      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-primary)] rounded-xl p-6 w-full max-w-sm border border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4 tracking-wide">{t('task.complete')}</h3>
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
