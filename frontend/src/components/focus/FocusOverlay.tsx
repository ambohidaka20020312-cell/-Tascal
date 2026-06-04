import { useEffect, useRef, useState } from "react";
import { useFocusStore } from "../../store/focusStore";
import { useTimerStore } from "../../store/timerStore";
import { useTaskStore } from "../../store/taskStore";
import { useSettingsStore } from "../../store/settingsStore";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  } catch {
    // AudioContext not available
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// SVG progress ring
function ProgressRing({
  progress,
  timeLabel,
}: {
  progress: number;
  timeLabel: string;
}) {
  const SIZE = 260;
  const STROKE = 6;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - progress);

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
        />
        {/* Progress ring */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      {/* Time label centered */}
      <span
        className="absolute font-mono font-bold tracking-widest text-white"
        style={{ fontSize: "3.5rem" }}
      >
        {timeLabel}
      </span>
    </div>
  );
}

export default function FocusOverlay() {
  const { mode, pomodoroPhase, pomodoroCount, pomodorosToday, endFocus, nextPomodoro } =
    useFocusStore();
  const { activeTaskId, startTime } = useTimerStore();
  const tasks = useTaskStore((s) => s.tasks);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);

  const task = tasks.find((t) => t.id === activeTaskId);

  const totalSeconds = pomodoroPhase === "work" ? WORK_SECONDS : BREAK_SECONDS;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const phaseRef = useRef(pomodoroPhase);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (mode === "pomodoro") {
      phaseRef.current = pomodoroPhase;
      const total = pomodoroPhase === "work" ? WORK_SECONDS : BREAK_SECONDS;
      setRemainingSeconds(total);
      setPaused(false);
    }
  }, [pomodoroPhase, mode]);

  useEffect(() => {
    if (mode === "normal") {
      const interval = setInterval(() => {
        if (!pausedRef.current && startTime) {
          const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
          setElapsed(diff);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        if (pausedRef.current) return;
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            // Timer ended
            if (notificationsEnabled && Notification.permission === "granted") {
              new Notification("休憩時間です！", {
                body: "25分間集中しました。5分間休憩しましょう。",
                icon: "/icon-192.png",
              });
            }
            if (notificationsEnabled) {
              playChime();
            }
            nextPomodoro();
            return prev;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mode, startTime, nextPomodoro, notificationsEnabled]);

  // Keyboard shortcuts: Escape to end, Space to pause/resume
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        endFocus();
        return;
      }
      if (e.key === " ") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        setPaused((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [endFocus]);

  const progress = mode === "pomodoro" ? remainingSeconds / totalSeconds : 1;
  const timeLabel = mode === "normal" ? formatTime(elapsed) : formatTime(remainingSeconds);

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 text-white flex flex-col items-center justify-center">
      <button
        onClick={endFocus}
        className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm"
      >
        フォーカス終了
      </button>

      {task && (
        <h1 className="text-2xl font-bold mb-6 text-center px-8 max-w-2xl">
          {task.title}
        </h1>
      )}

      {mode === "pomodoro" && (
        <div className="mb-6 flex items-center gap-4 text-gray-300">
          <span className="text-base">
            {pomodoroPhase === "work" ? "作業" : "☕ 休憩"}
          </span>
          <span className="text-gray-500 text-sm">({pomodoroCount} 完了)</span>
          <span className="text-sm font-medium text-gray-300">🍅 {pomodorosToday}</span>
        </div>
      )}

      {/* Progress ring (pomodoro) or plain timer (normal) */}
      {mode === "pomodoro" ? (
        <ProgressRing progress={progress} timeLabel={timeLabel} />
      ) : (
        <div className="font-mono text-8xl font-bold tracking-widest mb-8">
          {timeLabel}
        </div>
      )}

      {/* Pause/Resume button */}
      <button
        onClick={() => setPaused((prev) => !prev)}
        className="mt-8 px-6 py-2 rounded-full border border-gray-600 text-gray-300 hover:border-gray-300 hover:text-white text-sm transition-colors"
        aria-label={paused ? "再開" : "一時停止"}
      >
        {paused ? "▶ 再開" : "⏸ 一時停止"}
      </button>

      {paused && (
        <p className="mt-3 text-xs text-gray-500">Space キーでも再開できます</p>
      )}
    </div>
  );
}
