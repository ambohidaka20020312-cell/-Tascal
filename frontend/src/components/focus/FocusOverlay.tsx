import { useEffect, useRef, useState } from "react";
import { useFocusStore } from "../../store/focusStore";
import { useTimerStore } from "../../store/timerStore";
import { useTaskStore } from "../../store/taskStore";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function playBeep() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  osc.connect(ctx.destination);
  osc.frequency.value = 440;
  osc.start();
  setTimeout(() => osc.stop(), 300);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusOverlay() {
  const { mode, pomodoroPhase, pomodoroCount, endFocus, nextPomodoro } = useFocusStore();
  const { activeTaskId, startTime } = useTimerStore();
  const tasks = useTaskStore((s) => s.tasks);

  const task = tasks.find((t) => t.id === activeTaskId);

  const totalSeconds = pomodoroPhase === "work" ? WORK_SECONDS : BREAK_SECONDS;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [elapsed, setElapsed] = useState(0);
  const phaseRef = useRef(pomodoroPhase);

  useEffect(() => {
    if (mode === "pomodoro") {
      phaseRef.current = pomodoroPhase;
      const total = pomodoroPhase === "work" ? WORK_SECONDS : BREAK_SECONDS;
      setRemainingSeconds(total);
    }
  }, [pomodoroPhase, mode]);

  useEffect(() => {
    if (mode === "normal") {
      const interval = setInterval(() => {
        if (startTime) {
          const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
          setElapsed(diff);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            playBeep();
            nextPomodoro();
            return prev;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mode, startTime, nextPomodoro]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") endFocus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [endFocus]);

  const progress = mode === "pomodoro" ? remainingSeconds / totalSeconds : 1;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 text-white flex flex-col items-center justify-center">
      <button
        onClick={endFocus}
        className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm"
      >
        フォーカス終了
      </button>

      {task && (
        <h1 className="text-3xl font-bold mb-8 text-center px-8 max-w-2xl">
          {task.title}
        </h1>
      )}

      {mode === "pomodoro" && (
        <div className="mb-4 text-lg text-gray-300">
          {pomodoroPhase === "work" ? "🍅 作業" : "☕ 休憩"}{" "}
          <span className="text-gray-500 text-sm">({pomodoroCount} 完了)</span>
        </div>
      )}

      <div className="font-mono text-8xl font-bold tracking-widest mb-8">
        {mode === "normal" ? formatTime(elapsed) : formatTime(remainingSeconds)}
      </div>

      {mode === "pomodoro" && (
        <div className="w-80 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${pomodoroPhase === "work" ? "bg-red-500" : "bg-green-500"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
