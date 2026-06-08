import { useState, useCallback } from "react";
import { EventInput, DatesSetArg } from "@fullcalendar/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarApi, taskApi } from "../utils/api";
import { Task } from "../store/taskStore";

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#22c55e",
};

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function taskToEvent(task: Task): EventInput {
  const color = PRIORITY_COLOR[task.priority];
  const isCompleted = task.status === "completed";
  const isFixed = Boolean((task as Task & { is_fixed?: boolean }).is_fixed);
  const fixedStartTime = (task as Task & { fixed_start_time?: string }).fixed_start_time;
  const estimatedMinutes = task.estimated_minutes;

  // Build start datetime
  let start: string | undefined;
  if (task.scheduled_date) {
    if (fixedStartTime) {
      start = `${task.scheduled_date}T${fixedStartTime}`;
    } else {
      start = task.scheduled_date;
    }
  } else if (task.due_datetime) {
    start = task.due_datetime;
  }

  // Build end datetime for time views
  let end: string | undefined;
  if (start && start.includes("T") && estimatedMinutes) {
    const startDate = new Date(start);
    startDate.setMinutes(startDate.getMinutes() + estimatedMinutes);
    end = startDate.toISOString();
  } else if (task.due_datetime) {
    end = task.due_datetime;
  }

  const prefix = isFixed ? "🔒 " : task.recurrence ? "↻ " : "";

  return {
    id: String(task.id),
    title: prefix + task.title,
    start,
    end,
    allDay: !start?.includes("T"),
    backgroundColor: isCompleted ? hexToRgba(color, 0.3) : hexToRgba(color, 0.85),
    borderColor: color,
    textColor: "#fff",
    classNames: isCompleted ? ["fc-event-completed"] : [],
    extendedProps: { task },
  };
}

export function useCalendarTasks() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  const { data: events = [], isLoading, refetch } = useQuery<EventInput[]>({
    queryKey: ["calendar-tasks", dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!dateRange.start || !dateRange.end) return [];
      const res = await calendarApi.getTasks(dateRange.start, dateRange.end);
      const tasks = (res.data.data ?? res.data) as Task[];
      return tasks.map(taskToEvent);
    },
    enabled: Boolean(dateRange.start && dateRange.end),
    staleTime: 30_000,
  });

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setDateRange({ start: arg.startStr, end: arg.endStr });
  }, []);

  const updateTaskDate = useCallback(
    async (taskId: number, newDate: string, newDatetime?: string) => {
      const payload: Record<string, string> = { scheduled_date: newDate };
      if (newDatetime) payload.due_datetime = newDatetime;
      await taskApi.update(taskId, payload);
      queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
    },
    [queryClient],
  );

  const updateTaskDuration = useCallback(
    async (taskId: number, minutes: number) => {
      await taskApi.update(taskId, { estimated_minutes: minutes });
      queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
    },
    [queryClient],
  );

  return { events, isLoading, handleDatesSet, updateTaskDate, updateTaskDuration, refetch };
}
