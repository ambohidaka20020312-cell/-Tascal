import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MiniTimerStore {
  activeTaskId: number | null;
  activeTaskTitle: string;
  startedAt: number | null; // timestamp ms
  elapsedSeconds: number; // accumulated seconds before current session
  isRunning: boolean;

  startTimer: (taskId: number, title: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  getTotalSeconds: () => number;
}

export const useMiniTimerStore = create<MiniTimerStore>()(
  persist(
    (set, get) => ({
      activeTaskId: null,
      activeTaskTitle: "",
      startedAt: null,
      elapsedSeconds: 0,
      isRunning: false,

      startTimer: (taskId, title) => {
        set({
          activeTaskId: taskId,
          activeTaskTitle: title,
          startedAt: Date.now(),
          elapsedSeconds: 0,
          isRunning: true,
        });
      },

      pauseTimer: () => {
        const { startedAt, elapsedSeconds, isRunning } = get();
        if (!isRunning) return;
        const additional = startedAt
          ? Math.floor((Date.now() - startedAt) / 1000)
          : 0;
        set({
          isRunning: false,
          startedAt: null,
          elapsedSeconds: elapsedSeconds + additional,
        });
      },

      resumeTimer: () => {
        const { isRunning } = get();
        if (isRunning) return;
        set({ isRunning: true, startedAt: Date.now() });
      },

      stopTimer: () => {
        set({
          activeTaskId: null,
          activeTaskTitle: "",
          startedAt: null,
          elapsedSeconds: 0,
          isRunning: false,
        });
      },

      getTotalSeconds: () => {
        const { startedAt, elapsedSeconds, isRunning } = get();
        if (isRunning && startedAt) {
          return elapsedSeconds + Math.floor((Date.now() - startedAt) / 1000);
        }
        return elapsedSeconds;
      },
    }),
    {
      name: "mini-timer-store",
      partialize: (state) => ({
        activeTaskId: state.activeTaskId,
        activeTaskTitle: state.activeTaskTitle,
        startedAt: state.startedAt,
        elapsedSeconds: state.elapsedSeconds,
        isRunning: state.isRunning,
      }),
    }
  )
);
