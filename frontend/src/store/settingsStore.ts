import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Settings {
  theme: "light" | "dark" | "system";
  accentColor: "blue" | "purple" | "green" | "orange" | "red" | "pink";
  pomodoroDuration: number;
  pomodoroBreakDuration: number;
  pomodoroLongBreak: number;
  pomodoroLongBreakAfter: number;
  pomodoroSound: boolean;
  dailyBriefingEnabled: boolean;
  briefingTime: string;
  taskDensity: "compact" | "normal" | "comfortable";
  showEstimatedTime: boolean;
  defaultView: "today" | "week" | "calendar";
  setTheme: (t: Settings["theme"]) => void;
  setAccentColor: (c: Settings["accentColor"]) => void;
  setPomodoroSettings: (
    s: Partial<
      Pick<
        Settings,
        | "pomodoroDuration"
        | "pomodoroBreakDuration"
        | "pomodoroLongBreak"
        | "pomodoroLongBreakAfter"
        | "pomodoroSound"
      >
    >
  ) => void;
  setNotificationSettings: (
    s: Partial<Pick<Settings, "dailyBriefingEnabled" | "briefingTime">>
  ) => void;
  setDisplaySettings: (
    s: Partial<
      Pick<Settings, "taskDensity" | "showEstimatedTime" | "defaultView">
    >
  ) => void;
}

export const useSettingsStore = create<Settings>()(
  persist(
    (set) => ({
      theme: "system",
      accentColor: "blue",
      pomodoroDuration: 25,
      pomodoroBreakDuration: 5,
      pomodoroLongBreak: 15,
      pomodoroLongBreakAfter: 4,
      pomodoroSound: true,
      dailyBriefingEnabled: true,
      briefingTime: "08:00",
      taskDensity: "normal",
      showEstimatedTime: true,
      defaultView: "today",
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setPomodoroSettings: (s) => set(s),
      setNotificationSettings: (s) => set(s),
      setDisplaySettings: (s) => set(s),
    }),
    { name: "tascal-settings" }
  )
);
