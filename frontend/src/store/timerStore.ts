import { create } from "zustand";

interface TimerState {
  activeTaskId: number | null;
  startTime: Date | null;
  startTask: (taskId: number) => void;
  stopTask: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  activeTaskId: null,
  startTime: null,
  startTask: (taskId) =>
    set({ activeTaskId: taskId, startTime: new Date() }),
  stopTask: () => set({ activeTaskId: null, startTime: null }),
}));
