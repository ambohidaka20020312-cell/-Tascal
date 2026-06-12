import { useTaskStore } from "../../store/taskStore";
import { useTimerStore } from "../../store/timerStore";
import { useTaskTimer } from "../../hooks/useTaskTimer";
import { useState } from "react";
import OverrunAlert from "../ai/OverrunAlert";
import Modal from "../common/Modal";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export default function TaskTimerBar() {
  const { activeTaskId, startTime } = useTimerStore();
  const { tasks } = useTaskStore();
  const { elapsedMinutes, isOverrun, overrunMinutes } = useTaskTimer(activeTaskId);
  const [showOverrunModal, setShowOverrunModal] = useState(false);

  if (activeTaskId == null || startTime == null) return null;

  const task = tasks.find((t) => t.id === activeTaskId);
  if (!task) return null;

  const totalSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const displayMm = pad(Math.floor(totalSeconds / 60));
  const displaySs = pad(totalSeconds % 60);

  const estimated = task.estimated_minutes ?? 0;
  const progressPct = estimated > 0
    ? Math.min(Math.round((elapsedMinutes / estimated) * 100), 100)
    : 0;

  // Colour scheme: blue → yellow (≥80%) → red (overrun)
  const barColour = isOverrun
    ? "bg-red-500"
    : progressPct >= 80
    ? "bg-yellow-400"
    : "bg-blue-500";

  const bgColour = isOverrun
    ? "bg-red-50 border-red-200"
    : progressPct >= 80
    ? "bg-yellow-50 border-yellow-200"
    : "bg-white border-gray-200";

  const textColour = isOverrun
    ? "text-red-700"
    : progressPct >= 80
    ? "text-yellow-700"
    : "text-gray-700";

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 border-t shadow-lg px-4 py-3 ${bgColour}`}
      >
        <div className="max-w-3xl mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none animate-pulse">▶</span>
              <span className={`font-semibold text-sm truncate ${textColour}`}>
                {task.title}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={`font-mono text-sm font-bold ${textColour}`}>
                {displayMm}:{displaySs}
              </span>
              {estimated > 0 && (
                <span className="text-xs text-gray-400">
                  / {estimated}分
                </span>
              )}
              {isOverrun && (
                <button
                  onClick={() => setShowOverrunModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-colors"
                >
                  ⚠️ +{overrunMinutes}分超過
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {estimated > 0 && (
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${barColour}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Overrun modal */}
      <Modal
        isOpen={showOverrunModal}
        title="タスク超過アラート"
        onClose={() => setShowOverrunModal(false)}
      >
        <OverrunAlert task={task} actualMinutes={elapsedMinutes} />
      </Modal>
    </>
  );
}
