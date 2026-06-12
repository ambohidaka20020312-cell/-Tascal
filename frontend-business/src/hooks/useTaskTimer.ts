import { useEffect, useState } from "react";
import { useTaskStore } from "../store/taskStore";
import { useTimerStore } from "../store/timerStore";

interface TaskTimerResult {
  elapsedMinutes: number;
  isOverrun: boolean;
  overrunMinutes: number;
}

export function useTaskTimer(taskId: number | null): TaskTimerResult {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { tasks } = useTaskStore();
  const { activeTaskId, startTime } = useTimerStore();

  const task = taskId != null ? tasks.find((t) => t.id === taskId) : null;
  const isActive = activeTaskId === taskId && taskId != null && startTime != null;

  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedSeconds(0);
      return;
    }

    // Initialise from current offset so it doesn't reset on re-render
    const tick = () => {
      const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setElapsedSeconds(diff);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isActive, startTime]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const estimatedMinutes = task?.estimated_minutes ?? null;
  const isOverrun = estimatedMinutes != null && elapsedMinutes > estimatedMinutes;
  const overrunMinutes = isOverrun && estimatedMinutes != null
    ? elapsedMinutes - estimatedMinutes
    : 0;

  return { elapsedMinutes, isOverrun, overrunMinutes };
}
