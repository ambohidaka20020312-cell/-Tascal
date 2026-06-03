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

const priorityConfig: Record<
  Task["priority"],
  { labelKey: string; className: string; barColor: string }
> = {
  urgent: { labelKey: "task.priority_urgent", className: "bg-red-100 text-red-700", barColor: "bg-red-500" },
  high: { labelKey: "task.priority_high", className: "bg-orange-100 text-orange-700", barColor: "bg-orange-400" },
  medium: { labelKey: "task.priority_medium", className: "bg-blue-100 text-blue-700", barColor: "bg-blue-400" },
  low: { labelKey: "task.priority_low", className: "bg-gray-100 text-gray-600", barColor: "bg-gray-300" },
};

const statusConfig: Record<Task["status"], { labelKey: string; className: string }> = {
  pending: { labelKey: "task.start", className: "text-gray-500" },
  in_progress: { labelKey: "task.pause", className: "text-blue-600" },
  completed: { labelKey: "task.complete", className: "text-green-600" },
  overrun: { labelKey: "ai.overrun_message", className: "text-red-600" },
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
          "bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex min-h-touch",
          task.status === "completed" ? "opacity-60" : "",
        ].join(" ")}
      >
        <div className={`w-1 shrink-0 ${priority.barColor}`} />

        <div className={`flex-1 ${isPhoneSmall ? "p-2.5" : "p-4"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${priority.className} ${isPhoneSmall ? "text-[10px]" : "text-xs"}`}
                >
                  {t(priority.labelKey)}
                </span>
                <span className={`font-medium ${status.className} ${isPhoneSmall ? "text-[10px]" : "text-xs"}`}>
                  {t(status.labelKey)}
                </span>
              </div>

              <h3
                className={[
                  "font-semibold text-gray-800 truncate",
                  isPhoneSmall ? "text-sm" : "",
                  task.status === "completed" ? "line-through text-gray-400" : "",
                ].join(" ")}
              >
                {task.title}
              </h3>

              {isPhoneSmall ? (
                <>
                  {(task.description || task.estimated_minutes != null) && (
                    <button
                      onClick={() => setExpanded((e) => !e)}
                      className="text-[10px] text-primary-500 mt-0.5"
                    >
                      {expanded ? t('common.close') : t('task.description')}
                    </button>
                  )}
                  {expanded && (
                    <>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                      )}
                      {task.estimated_minutes != null && (
                        <p className="text-[10px] text-gray-400 mt-1">
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
                    <p className={`text-gray-500 mt-1 ${isTabletOrAbove ? "line-clamp-2" : "truncate"} text-sm`}>
                      {task.description}
                    </p>
                  )}
                  {task.estimated_minutes != null && (
                    <p className="text-xs text-gray-400 mt-1">
                      {t('task.estimated_time')}: {task.estimated_minutes}{t('common.minutes')}
                      {task.actual_minutes != null && ` / ${t('task.actual_time')}: ${task.actual_minutes}${t('common.minutes')}`}
                    </p>
                  )}
                  {isTabletOrAbove && task.due_datetime && (
                    <p className="text-xs text-gray-400 mt-0.5">
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
                      🎯 {t('task.focus')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startFocus(task.id, "pomodoro")}
                    >
                      🍅
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">{t('task.complete')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('task.actual_time')}（{t('common.minutes')}）
            </p>
            <input
              type="number"
              min={1}
              value={actualMinutes}
              onChange={(e) => setActualMinutes(e.target.value)}
              placeholder="45"
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
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
