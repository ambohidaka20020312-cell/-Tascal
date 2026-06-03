import { useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { EventClickArg, EventInput, DatesSetArg } from "@fullcalendar/core";
import { useQuery } from "@tanstack/react-query";
import { calendarApi, taskApi } from "../utils/api";
import { Task } from "../store/taskStore";
import Modal from "../components/common/Modal";

// FullCalendar v6 bundles its own CSS automatically via the plugins.

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#6b7280",
};

const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "未着手",
  in_progress: "進行中",
  completed: "完了",
  overrun: "超過",
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  urgent: "緊急",
  high: "高",
  medium: "中",
  low: "低",
};

interface NewTaskForm {
  title: string;
  priority: Task["priority"];
  estimated_minutes: string;
  description: string;
}

export default function CalendarPage() {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState<NewTaskForm>({
    title: "",
    priority: "medium",
    estimated_minutes: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data: calendarTasks, refetch } = useQuery<Task[]>({
    queryKey: ["calendar-tasks", dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!dateRange.start || !dateRange.end) return [];
      const res = await calendarApi.getTasks(dateRange.start, dateRange.end);
      return (res.data.data ?? res.data) as Task[];
    },
    enabled: Boolean(dateRange.start && dateRange.end),
  });

  const events: EventInput[] = (calendarTasks ?? []).map((task) => ({
    id: String(task.id),
    title: task.title,
    start: task.scheduled_date ?? task.due_datetime ?? undefined,
    end: task.due_datetime ?? undefined,
    backgroundColor: PRIORITY_COLOR[task.priority],
    borderColor: PRIORITY_COLOR[task.priority],
    textColor: "#fff",
    extendedProps: { task },
  }));

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setDateRange({
      start: arg.startStr,
      end: arg.endStr,
    });
  }, []);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const task = arg.event.extendedProps.task as Task;
    setSelectedTask(task);
  }, []);

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setNewTaskDate(arg.dateStr);
    setNewTaskForm({ title: "", priority: "medium", estimated_minutes: "", description: "" });
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
        scheduled_date: newTaskDate,
      });
      setNewTaskDate(null);
      refetch();
    } catch {
      // keep modal open on error
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[var(--bg-primary)] p-4 md:p-8 mb-16 md:mb-0">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Page header */}
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[var(--text-subtle)] mb-1">CALENDAR</p>
          <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)]">カレンダー</h1>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5 tracking-wide hidden sm:block">日付をクリックしてタスクを追加、タスクをクリックして詳細を確認</p>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5 tracking-wide sm:hidden">日付をタップしてタスクを追加</p>
        </div>

        {/* Calendar */}
        <div className="border border-[var(--border)] rounded-xl p-2 sm:p-4 overflow-hidden bg-[var(--bg-primary)]">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            views={{
              timeGridWeek: { buttonText: "週" },
              dayGridMonth: { buttonText: "月" },
              timeGridDay: { buttonText: "日" },
            }}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridWeek,dayGridMonth,timeGridDay",
            }}
            windowResizeDelay={0}
            buttonText={{
              today: "今日",
              month: "月",
              week: "週",
              day: "日",
            }}
            locale="ja"
            events={events}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
            longPressDelay={500}
          />
        </div>
      </div>

      {/* Task detail modal */}
      <Modal
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        title="タスク詳細"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-800 leading-snug">
                {selectedTask.title}
              </h3>
              <span
                className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: PRIORITY_COLOR[selectedTask.priority] }}
              >
                {PRIORITY_LABEL[selectedTask.priority]}
              </span>
            </div>

            {selectedTask.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{selectedTask.description}</p>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-gray-400 text-xs font-medium">ステータス</dt>
                <dd className="text-gray-800 font-medium mt-0.5">{STATUS_LABEL[selectedTask.status]}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs font-medium">予定日</dt>
                <dd className="text-gray-800 font-medium mt-0.5">
                  {selectedTask.scheduled_date ?? "未設定"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs font-medium">見積もり時間</dt>
                <dd className="text-gray-800 font-medium mt-0.5">
                  {selectedTask.estimated_minutes != null
                    ? `${selectedTask.estimated_minutes}分`
                    : "未設定"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs font-medium">実績時間</dt>
                <dd className="text-gray-800 font-medium mt-0.5">
                  {selectedTask.actual_minutes != null
                    ? `${selectedTask.actual_minutes}分`
                    : "—"}
                </dd>
              </div>
              {selectedTask.due_datetime && (
                <div className="col-span-2">
                  <dt className="text-gray-400 text-xs font-medium">締め切り</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">
                    {new Date(selectedTask.due_datetime).toLocaleString("ja-JP")}
                  </dd>
                </div>
              )}
            </dl>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New task modal */}
      <Modal
        isOpen={newTaskDate !== null}
        onClose={() => setNewTaskDate(null)}
        title={`タスクを追加 — ${newTaskDate ?? ""}`}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              タスク名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newTaskForm.title}
              onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="タスクのタイトル"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
            <textarea
              value={newTaskForm.description}
              onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="詳細（任意）"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">優先度</label>
              <select
                value={newTaskForm.priority}
                onChange={(e) =>
                  setNewTaskForm((f) => ({ ...f, priority: e.target.value as Task["priority"] }))
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">緊急</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">見積もり（分）</label>
              <input
                type="number"
                value={newTaskForm.estimated_minutes}
                onChange={(e) =>
                  setNewTaskForm((f) => ({ ...f, estimated_minutes: e.target.value }))
                }
                placeholder="例: 60"
                min="1"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setNewTaskDate(null)}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
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
