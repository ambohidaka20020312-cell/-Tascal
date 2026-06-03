import { create } from "zustand";
import { useTimerStore } from "./timerStore";
import { useSettingsStore } from "./settingsStore";

interface FocusStore {
  isActive: boolean;
  mode: "normal" | "pomodoro";
  pomodoroPhase: "work" | "break";
  pomodoroCount: number;
  pomodoroDuration: () => number;
  pomodoroBreakDuration: () => number;
  startFocus: (taskId: number, mode: "normal" | "pomodoro") => void;
  endFocus: () => void;
  nextPomodoro: () => void;
}

export const useFocusStore = create<FocusStore>((set, get) => ({
  isActive: false,
  mode: "normal",
  pomodoroPhase: "work",
  pomodoroCount: 0,
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
      set({ pomodoroPhase: "break" });
    } else {
      set({ pomodoroPhase: "work", pomodoroCount: pomodoroCount + 1 });
    }
  },
}));
