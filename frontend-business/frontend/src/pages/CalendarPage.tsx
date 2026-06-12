import { useState, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { EventClickArg, EventDropArg, EventMountArg } from "@fullcalendar/core";
import { useQueryClient } from "@tanstack/react-query";
import { taskApi } from "../utils/api";
import { Task } from "../store/taskStore";
import Modal from "../components/common/Modal";
import { isJapanHoliday, getHolidayName } from "../utils/japanHolidays";
import { useCalendarTasks } from "../hooks/useCalendarTasks";

// ─── CSS overrides injected into page ───────────────────────────────────────
const calendarStyles = `
  .fc { background: var(--bg-primary); color: var(--text-primary); }
  .fc-toolbar-title { font-size: 1.1rem; font-weight: 600; }
  .fc-button {
    background: var(--bg-secondary) !important;
    border-color: var(--border) !important;
    color: var(--text-primary) !important;
    box-shadow: none !important;
  }
  .fc-button:hover { opacity: 0.85; }
  .fc-button-active,
  .fc-button-primary:not(:disabled).fc-button-active {
    background: var(--accent, #6366f1) !important;
    color: white !important;
    border-color: var(--accent, #6366f1) !important;
  }
  .fc-daygrid-day { background: var(--bg-primary); }
  .fc-day-today { background: var(--bg-secondary) !important; }
  .fc-col-header-cell { background: var(--bg-secondary); border-color: var(--border); }
  .fc-scrollgrid { border-color: var(--border) !important; }
  .fc-theme-standard td,
  .fc-theme-standard th { border-color: var(--border); }
  .fc-list-day-cushion { background: var(--bg-secondary) !important; }
  .fc-list-event:hover td { background: var(--bg-secondary) !important; }
  .fc-timegrid-slot { border-color: var(--border); }
  .fc-event-completed { opacity: 0.5; }
  .fc-event { cursor: pointer; }
  .fc-day-holiday .fc-daygrid-day-number { color: #ef4444; }
`;

// ─── Constants ───────────────────────────────────────────────────────────────
const PRIORITY_LABEL: Record<Task["priority"], string> = {
  urgent: "緊急",
  high: "高",
  medium: "中",
  low: "低",
};

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#22c55e",
};

const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "未着手",
  in_progress: "進行中",
  completed: "完了",
  overrun: "超過",
};

interface NewTaskForm {
  title: string;
  priority: Task["priority"];
  estimated_minutes: string;
  description: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);

  const { events, handleDatesSet, updateTaskDate, updateTaskDuration, refetch } =
    useCalendarTasks();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState<NewTaskForm>({
    title: "",
    priority: "medium",
    estimated_minutes: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const task = arg.event.extendedProps.task as Task;
    setSelectedTask(task);
  }, []);

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setNewTaskDate(arg.dateStr);
    setNewTaskForm({ title: "", priority: "medium", estimated_minutes: "", description: "" });
  }, []);

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const taskId = parseInt(info.event.id, 10);
      const startStr = info.event.startStr;
      const newDate = startStr.split("T")[0];
      const newDatetime = startStr.includes("T") ? startStr : undefined;
      try {
        await updateTaskDate(taskId, newDate, newDatetime);
      } catch {
        info.revert();
      }
    },
    [updateTaskDate],
  );

  const handleEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      const taskId = parseInt(info.event.id, 10);
      const start = info.event.start;
      const end = info.event.end;
      if (start && end) {
        const diffMs = end.getTime() - start.getTime();
        const minutes = Math.round(diffMs / 60000);
        try {
          await updateTaskDuration(taskId, minutes);
        } catch {
          info.revert();
        }
      }
    },
    [updateTaskDuration],
  );

  const handleEventDidMount = useCallback((info: EventMountArg) => {
    const task = info.event.extendedProps.task as Task;
    info.el.title = task.description || task.title;
  }, []);

  const handleCreateTask = async () => {
    if (!newTaskForm.title.trim() || !newTaskDate) return;
    setIsSaving(true);
    try {
      await taskApi.create({
        title: newTaskForm.title.trim(),
        description: newTaskForm.description,
        priority: newTaskForm.priority,
        estimated_minutes: newTaskForm.estimated_minutes
          ? parseInt(newTaskForm.estimated_minutes, 10)
          : null,
        scheduled_date: newTaskDate.split("T")[0],
      });
      setNewTaskDate(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
      refetch();
    } catch {
      // keep modal open on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    setIsCompleting(true);
    try {
      await taskApi.complete(selectedTask.id, selectedTask.actual_minutes ?? 0);
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
      refetch();
    } catch {
      // ignore
    } finally {
      setIsCompleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[var(--bg-primary)] p-4 md:p-8 mb-16 md:mb-0">
      {/* Inject custom CSS */}
      <style>{calendarStyles}</style>

      <div className="max-w-6xl mx-auto space-y-4">
        {/* Page header */}
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[var(--text-subtle)] mb-1">
            CALENDAR
          </p>
          <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)]">
            カレンダー
          </h1>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5 tracking-wide hidden sm:block">
            日付をクリックしてタスクを追加、タスクをドラッグして日程変更
          </p>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5 tracking-wide sm:hidden">
            日付をタップしてタスクを追加
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
          {(["urgent", "high", "medium", "low"] as Task["priority"][]).map((p) => (
            <span key={p} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: PRIORITY_COLOR[p] }}
              />
              {PRIORITY_LABEL[p]}
            </span>
          ))}
          <span className="flex items-center gap-1.5 ml-2 text-[var(--text-subtle)]">
            🔒 固定タスク
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-subtle)]">↻ 繰り返し</span>
        </div>

        {/* Calendar */}
        <div className="border border-[var(--border)] rounded-xl p-2 sm:p-4 overflow-hidden bg-[var(--bg-primary)]">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
            }}
            buttonText={{
              today: "今日",
              month: "月",
              week: "週",
              day: "日",
              list: "リスト",
            }}
            locale="ja"
            events={events}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            editable={true}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventDidMount={handleEventDidMount}
            windowResizeDelay={0}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={4}
            longPressDelay={500}
            nowIndicator={true}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            dayCellContent={(arg) => {
              const dateStr = arg.date.toISOString().slice(0, 10);
              const holidayName = isJapanHoliday(dateStr) ? getHolidayName(dateStr) : null;
              return (
                <div style={{ width: "100%" }}>
                  <span className="fc-daygrid-day-number">{arg.dayNumberText}</span>
                  {holidayName && (
                    <span
                      style={{
                        fontSize: "9px",
                        color: "#ef4444",
                        display: "block",
                        lineHeight: 1.2,
                        marginTop: 1,
                      }}
                    >
                      {holidayName}
                    </span>
                  )}
                </div>
              );
            }}
            dayCellClassNames={(arg) => {
              const dateStr = arg.date.toISOString().slice(0, 10);
              return isJapanHoliday(dateStr) ? ["fc-day-holiday"] : [];
            }}
          />
        </div>
      </div>

      {/* ── Task detail modal ─────────────────────────────────────────────── */}
      <Modal isOpen={selectedTask !== null} onClose={() => setSelectedTask(null)} title="タスク詳細">
        {selectedTask && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] leading-snug">
                {selectedTask.title}
                {selectedTask.recurrence && (
                  <span
                    className="ml-2 text-sm text-[var(--text-muted)]"
                    title="繰り返しタスク"
                  >
                    ↻
                  </span>
                )}
              </h3>
              <span
                className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: PRIORITY_COLOR[selectedTask.priority] }}
              >
                {PRIORITY_LABEL[selectedTask.priority]}
              </span>
            </div>

            {selectedTask.description && (
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {selectedTask.description}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-[var(--text-subtle)] text-xs font-medium">ステータス</dt>
                <dd className="text-[var(--text-primary)] font-medium mt-0.5">
                  {STATUS_LABEL[selectedTask.status]}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-subtle)] text-xs font-medium">予定日</dt>
                <dd className="text-[var(--text-primary)] font-medium mt-0.5">
                  {selectedTask.scheduled_date ?? "未設定"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-subtle)] text-xs font-medium">見積もり時間</dt>
                <dd className="text-[var(--text-primary)] font-medium mt-0.5">
                  {selectedTask.estimated_minutes != null
                    ? `${selectedTask.estimated_minutes}分`
                    : "未設定"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-subtle)] text-xs font-medium">実績時間</dt>
                <dd className="text-[var(--text-primary)] font-medium mt-0.5">
                  {selectedTask.actual_minutes != null
                    ? `${selectedTask.actual_minutes}分`
                    : "—"}
                </dd>
              </div>
              {selectedTask.due_datetime && (
                <div className="col-span-2">
                  <dt className="text-[var(--text-subtle)] text-xs font-medium">締め切り</dt>
                  <dd className="text-[var(--text-primary)] font-medium mt-0.5">
                    {new Date(selectedTask.due_datetime).toLocaleString("ja-JP")}
                  </dd>
                </div>
              )}
              {selectedTask.recurrence && (
                <div className="col-span-2">
                  <dt className="text-[var(--text-subtle)] text-xs font-medium">繰り返し</dt>
                  <dd className="text-[var(--text-primary)] font-medium mt-0.5">
                    {selectedTask.recurrence}
                  </dd>
                </div>
              )}
            </dl>

            <div className="pt-2 flex gap-2 justify-end">
              {selectedTask.status !== "completed" && (
                <button
                  onClick={handleCompleteTask}
                  disabled={isCompleting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {isCompleting ? "処理中…" : "完了にする"}
                </button>
              )}
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-[var(--bg-secondary)] hover:opacity-80 text-[var(--text-primary)] text-sm font-medium rounded-xl transition-colors border border-[var(--border)]"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── New task modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={newTaskDate !== null}
        onClose={() => setNewTaskDate(null)}
        title={`タスクを追加 — ${newTaskDate?.split("T")[0] ?? ""}`}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              タスク名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newTaskForm.title}
              onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="タスクのタイトル"
              className="w-full border border-[var(--border)] rounded-xl px-3 py-3 text-base bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">説明</label>
            <textarea
              value={newTaskForm.description}
              onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="詳細（任意）"
              rows={2}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-3 text-base bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                優先度
              </label>
              <select
                value={newTaskForm.priority}
                onChange={(e) =>
                  setNewTaskForm((f) => ({
                    ...f,
                    priority: e.target.value as Task["priority"],
                  }))
                }
                className="w-full border border-[var(--border)] rounded-xl px-3 py-3 text-base bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">緊急</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                見積もり（分）
              </label>
              <input
                type="number"
                value={newTaskForm.estimated_minutes}
                onChange={(e) =>
                  setNewTaskForm((f) => ({ ...f, estimated_minutes: e.target.value }))
                }
                placeholder="例: 60"
                min="1"
                className="w-full border border-[var(--border)] rounded-xl px-3 py-3 text-base bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setNewTaskDate(null)}
              className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] hover:opacity-80 text-[var(--text-primary)] text-sm font-medium rounded-xl transition-colors border border-[var(--border)]"
            >
              キャンセル
            </button>
            <button
              onClick={handleCreateTask}
              disabled={!newTaskForm.title.trim() || isSaving}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {isSaving ? "保存中…" : "追加する"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
