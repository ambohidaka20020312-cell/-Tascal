import { useEffect, useRef, useState, useCallback } from "react";
import { useMiniTimerStore } from "../../store/miniTimerStore";
import { useCompleteTask } from "../../hooks/useTasks";
import { taskApi } from "../../utils/api";

const LS_POS_KEY = "mini-timer-pos";

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(LS_POS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { x: number; y: number };
  } catch {
    return null;
  }
}

function savePosition(pos: { x: number; y: number }) {
  localStorage.setItem(LS_POS_KEY, JSON.stringify(pos));
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MiniTimer() {
  const {
    activeTaskId,
    activeTaskTitle,
    isRunning,
    getTotalSeconds,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useMiniTimerStore();
  const completeTask = useCompleteTask();

  const [displaySeconds, setDisplaySeconds] = useState(() => getTotalSeconds());
  const [hovered, setHovered] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeMinutes, setCompleteMinutes] = useState("");

  // Draggable position — default bottom-left
  const defaultPos = useCallback((): { x: number; y: number } => {
    return { x: 16, y: window.innerHeight - 160 };
  }, []);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    return loadPosition() ?? { x: 16, y: window.innerHeight - 160 };
  });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Tick every second
  useEffect(() => {
    if (!activeTaskId) return;
    const interval = setInterval(() => {
      setDisplaySeconds(getTotalSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTaskId, isRunning, getTotalSeconds]);

  // Sync display immediately on pause/resume
  useEffect(() => {
    setDisplaySeconds(getTotalSeconds());
  }, [isRunning, getTotalSeconds]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newPos = {
        x: Math.max(0, Math.min(window.innerWidth - 230, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 120, e.clientY - dragOffset.current.y)),
      };
      setPos(newPos);
      savePosition(newPos);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Reset to default if position goes off screen (e.g., window resized)
  useEffect(() => {
    const onResize = () => {
      setPos((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 230),
        y: Math.min(prev.y, window.innerHeight - 120),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [defaultPos]);

  const handleStop = async () => {
    const totalSec = getTotalSeconds();
    const mins = Math.max(1, Math.round(totalSec / 60));
    try {
      if (activeTaskId) {
        await taskApi.update(activeTaskId, { actual_minutes: mins });
      }
    } catch {
      // ignore
    }
    stopTimer();
  };

  const handleCompleteOpen = () => {
    const totalSec = getTotalSeconds();
    setCompleteMinutes(String(Math.max(1, Math.round(totalSec / 60))));
    setShowCompleteModal(true);
  };

  const handleCompleteConfirm = () => {
    const mins = parseInt(completeMinutes, 10);
    if (!isNaN(mins) && mins > 0 && activeTaskId) {
      completeTask.mutate({ id: activeTaskId, actual_minutes: mins });
    }
    setShowCompleteModal(false);
    stopTimer();
  };

  if (!activeTaskId) return null;

  return (
    <>
      <div
        ref={widgetRef}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 40,
          width: 220,
          opacity: hovered ? 1 : 0.75,
          transition: "opacity 0.2s ease",
          cursor: "grab",
          userSelect: "none",
        }}
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-lg px-3 py-2.5"
      >
        {/* Task title */}
        <p
          className="text-xs text-[var(--text-muted)] truncate mb-1 tracking-wide"
          title={activeTaskTitle}
        >
          {activeTaskTitle}
        </p>

        {/* Timer display */}
        <p className="text-lg font-mono text-[var(--text-primary)] leading-none mb-2.5">
          {formatTime(displaySeconds)}
        </p>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Pause / Resume */}
          <button
            onClick={isRunning ? pauseTimer : resumeTimer}
            aria-label={isRunning ? "一時停止" : "再開"}
            className="flex-1 flex items-center justify-center h-7 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors text-sm"
          >
            {isRunning ? "⏸" : "▶"}
          </button>

          {/* Stop (log time) */}
          <button
            onClick={handleStop}
            aria-label="停止して記録"
            className="flex-1 flex items-center justify-center h-7 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors text-sm"
          >
            ⏹
          </button>

          {/* Complete task */}
          <button
            onClick={handleCompleteOpen}
            aria-label="タスク完了"
            className="flex-1 flex items-center justify-center h-7 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors text-sm"
          >
            ✓
          </button>
        </div>
      </div>

      {/* Complete modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mini-timer-complete-title"
            className="bg-[var(--bg-primary)] rounded-xl p-6 w-full max-w-sm border border-[var(--border)]"
          >
            <h3
              id="mini-timer-complete-title"
              className="font-semibold text-[var(--text-primary)] mb-4 tracking-wide"
            >
              タスクを完了
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">実際の作業時間（分）</p>
            <input
              type="number"
              min={1}
              value={completeMinutes}
              onChange={(e) => setCompleteMinutes(e.target.value)}
              className="w-full border-0 border-b border-[var(--border)] bg-transparent px-0 py-2 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] mb-4"
              style={{ fontSize: "16px" }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCompleteConfirm}
                disabled={!completeMinutes || parseInt(completeMinutes) <= 0}
                className="flex-1 py-2 rounded-lg border border-[var(--text-muted)] text-[var(--text-primary)] text-sm hover:opacity-80 disabled:opacity-30 transition-opacity"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
