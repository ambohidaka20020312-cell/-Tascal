import { create } from "zustand";

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "overrun";
  estimated_minutes: number | null;
  actual_minutes: number | null;
  scheduled_date: string | null;
  due_datetime: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  recurrence?: string | null;
  category_id?: number | null;
  parent_task_id?: number | null;
  subtask_count?: number;
}

interface TaskState {
  tasks: Task[];
  selectedDate: string;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
  removeTask: (id: number) => void;
  reorderTasks: (tasks: Task[]) => void;
  setSelectedDate: (date: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  selectedDate: new Date().toISOString().split("T")[0],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  reorderTasks: (tasks) => set({ tasks }),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
