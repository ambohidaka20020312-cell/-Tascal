import { useEffect, useRef, useState } from "react";
import { useFocusStore } from "../../store/focusStore";
import { useTimerStore } from "../../store/timerStore";
import { useTaskStore } from "../../store/taskStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useCompleteTask } from "../../hooks/useTasks";
import FocusSessionSummary from "./FocusSessionSummary";

// localStorage keys for custom durations
const LS_WORK = "focus_work_mins";
const LS_BREAK = "focus_break_mins";

function loadWorkMins(): number {
  const v = parseInt(localStorage.getItem(LS_WORK) ?? "", 10);
  return isNaN(v) ? 25 : Math.min(60, Math.max(5, v));
}
function loadBreakMins(): number {
  const v = parseInt(localStorage.getItem(LS_BREAK) ?? "", 10);
  return isNaN(v) ? 5 : Math.min(30, Math.max(1, v));
}

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

function formatFocusTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

// Inline counter control: label + − value +
function DurationControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-400 tracking-wide">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-7 h-7 flex items-center justify-center border border-gray-700 text-gray-300 hover:border-gray-400 hover:text-white transition-colors text-sm rounded"
          aria-label={`${label}を減らす`}
        >
          −
        </button>
        <span className="w-10 text-center text-sm text-white font-mono">{value}分</span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-7 h-7 flex items-center justify-center border border-gray-700 text-gray-300 hover:border-gray-400 hover:text-white transition-colors text-sm rounded"
          aria-label={`${label}を増やす`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function FocusOverlay() {
  const {
    mode,
    pomodoroPhase,
    pomodoroCount,
    pomodorosToday,
    totalFocusMinutesToday,
    endFocus,
    nextPomodoro,
    incrementPomodoro,
    addFocusMinutes,
  } = useFocusStore();
  const { activeTaskId, startTime } = useTimerStore();
  const tasks = useTaskStore((s) => s.tasks);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const completeTask = useCompleteTask();

  const task = tasks.find((t) => t.id === activeTaskId);

  // Custom durations (from localStorage)
  const [workMins, setWorkMins] = useState<number>(loadWorkMins);
  const [breakMins, setBreakMins] = useState<number>(loadBreakMins);

  const workSeconds = workMins * 60;
  const breakSeconds = breakMins * 60;

  const totalSeconds = pomodoroPhase === "work" ? workSeconds : breakSeconds;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Track accumulated focus minutes for this session
  const sessionFocusMinutesRef = useRef(0);

  const phaseRef = useRef(pomodoroPhase);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;

  // Persist custom durations to localStorage
  useEffect(() => {
    localStorage.setItem(LS_WORK, String(workMins));
  }, [workMins]);
  useEffect(() => {
    localStorage.setItem(LS_BREAK, String(breakMins));
  }, [breakMins]);

  // Reset timer when phase or durations change
  useEffect(() => {
    if (mode === "pomodoro") {
      phaseRef.current = pomodoroPhase;
      const total = pomodoroPhase === "work" ? workSeconds : breakSeconds;
      setRemainingSeconds(total);
      setPaused(false);
    }
  }, [pomodoroPhase, mode, workSeconds, breakSeconds]);

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
        // Pause when settings panel is open or timer is paused
        if (pausedRef.current || settingsOpenRef.current) return;
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            // Work session completed
            if (phaseRef.current === "work") {
              const wm = parseInt(localStorage.getItem(LS_WORK) ?? "25", 10) || 25;
              addFocusMinutes(wm);
              incrementPomodoro();
              sessionFocusMinutesRef.current += wm;
              if (notificationsEnabled && Notification.permission === "granted") {
                new Notification("休憩時間です！", {
                  body: `${wm}分間集中しました。休憩しましょう。`,
                  icon: "/icon-192.png",
                });
              }
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
  }, [mode, startTime, nextPomodoro, notificationsEnabled, incrementPomodoro, addFocusMinutes]);

  // Keyboard shortcuts: Escape to end, Space to pause/resume
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        setShowSummary(true);
        return;
      }
      if (e.key === " ") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        if (!settingsOpen) setPaused((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settingsOpen]);

  const handleEndSession = () => {
    setShowSummary(true);
  };

  const handleSummaryClose = () => {
    setShowSummary(false);
    endFocus();
  };

  const handleLogTime = (minutes: number) => {
    if (task) {
      completeTask.mutate({ id: task.id, actual_minutes: minutes });
    }
    setShowSummary(false);
    endFocus();
  };

  const progress = mode === "pomodoro" ? remainingSeconds / totalSeconds : 1;
  const timeLabel = mode === "normal" ? formatTime(elapsed) : formatTime(remainingSeconds);

  // Session totals for summary
  const sessionPomodoros = pomodoroCount;
  const sessionMinutes =
    mode === "pomodoro"
      ? sessionFocusMinutesRef.current
      : Math.floor(elapsed / 60);

  if (showSummary) {
    return (
      <FocusSessionSummary
        pomodorosCompleted={sessionPomodoros}
        totalMinutes={sessionMinutes}
        taskTitle={task?.title ?? "フォーカスセッション"}
        onClose={handleSummaryClose}
        onLogTime={handleLogTime}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 text-white flex flex-col items-center justify-center">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        {/* Settings gear */}
        <button
          onClick={() => { setSettingsOpen((v) => !v); setPaused(true); }}
          aria-label="タイマー設定"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* End session button */}
        <button
          onClick={handleEndSession}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          終了
        </button>
      </div>

      {/* Settings panel (inline, below the top bar) */}
      {settingsOpen && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-72 bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4 z-10">
          <p className="text-[10px] tracking-[0.25em] uppercase text-gray-500">タイマー設定</p>
          <DurationControl
            label="作業時間"
            value={workMins}
            min={5}
            max={60}
            step={5}
            onChange={(v) => { setWorkMins(v); }}
          />
          <DurationControl
            label="休憩時間"
            value={breakMins}
            min={1}
            max={30}
            step={1}
            onChange={(v) => { setBreakMins(v); }}
          />
          <button
            onClick={() => { setSettingsOpen(false); setPaused(false); }}
            className="w-full mt-1 py-2 border border-gray-700 text-gray-300 text-xs tracking-wide hover:border-gray-400 hover:text-white transition-colors rounded-lg"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Task name */}
      {task && (
        <p className="text-[var(--text-muted)] text-sm tracking-wide truncate max-w-xs mb-4 text-center">
          {task.title}
        </p>
      )}

      {mode === "pomodoro" && (
        <div className="mb-4 flex items-center gap-4 text-gray-300">
          <span className="text-base">
            {pomodoroPhase === "work" ? "作業" : "☕ 休憩"}
          </span>
          <span className="text-gray-500 text-sm">({pomodoroCount} 完了)</span>
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

      {/* Stats bar */}
      <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
        <span>今日:</span>
        <span className="text-gray-300">🍅 {pomodorosToday}</span>
        <span className="text-gray-700">|</span>
        <span>集中時間:</span>
        <span className="text-gray-300">{formatFocusTime(totalFocusMinutesToday)}</span>
      </div>

      {/* Pause/Resume button */}
      <button
        onClick={() => { if (!settingsOpen) setPaused((prev) => !prev); }}
        className="mt-6 px-6 py-2 rounded-full border border-gray-600 text-gray-300 hover:border-gray-300 hover:text-white text-sm transition-colors"
        aria-label={paused ? "再開" : "一時停止"}
      >
        {paused ? "▶ 再開" : "⏸ 一時停止"}
      </button>

      {paused && !settingsOpen && (
        <p className="mt-3 text-xs text-gray-500">Space キーでも再開できます</p>
      )}
    </div>
  );
}
