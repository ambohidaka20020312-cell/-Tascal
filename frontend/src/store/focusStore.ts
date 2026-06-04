import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useTimerStore } from "./timerStore";
import { useSettingsStore } from "./settingsStore";

interface FocusStore {
  isActive: boolean;
  mode: "normal" | "pomodoro";
  pomodoroPhase: "work" | "break";
  pomodoroCount: number;
  pomodorosToday: number;
  lastPomodoroDate: string;
  pomodoroDuration: () => number;
  pomodoroBreakDuration: () => number;
  startFocus: (taskId: number, mode: "normal" | "pomodoro") => void;
  endFocus: () => void;
  nextPomodoro: () => void;
  incrementPomodoro: () => void;
}

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => ({
      isActive: false,
      mode: "normal",
      pomodoroPhase: "work",
      pomodoroCount: 0,
      pomodorosToday: 0,
      lastPomodoroDate: "",
      pomodoroDuration: () => useSettingsStore.getState().pomodoroDuration,
      pomodoroBreakDuration: () => useSettingsStore.getState().pomodoroBreakDuration,
      startFocus: (taskId, mode) => {
        useTimerStore.getState().startTask(taskId);
        set({ isActive: true, mode, pomodoroPhase: "work", pomodoroCount: 0 });
      },
      endFocus: () => {
        useTimerStore.getState().stopTask();
        set({ isActive: false, pomodoroPhase: "work", pomodoroCount: 0 });
      },
      nextPomodoro: () => {
        const { pomodoroPhase, pomodoroCount } = get();
        if (pomodoroPhase === "work") {
          // Work phase ended → increment today's count, then go to break
          get().incrementPomodoro();
          set({ pomodoroPhase: "break" });
        } else {
          set({ pomodoroPhase: "work", pomodoroCount: pomodoroCount + 1 });
        }
      },
      incrementPomodoro: () => {
        const today = new Date().toISOString().split("T")[0];
        const { lastPomodoroDate, pomodorosToday } = get();
        if (lastPomodoroDate !== today) {
          set({ pomodorosToday: 1, lastPomodoroDate: today });
        } else {
          set({ pomodorosToday: pomodorosToday + 1 });
        }
      },
    }),
    {
      name: "focus-store",
      partialize: (state) => ({
        pomodorosToday: state.pomodorosToday,
        lastPomodoroDate: state.lastPomodoroDate,
      }),
    }
  )
);
