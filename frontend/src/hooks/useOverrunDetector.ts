import { useEffect, useState } from "react";
import { Task, useTaskStore } from "../store/taskStore";
import { useTimerStore } from "../store/timerStore";
import { useTaskTimer } from "./useTaskTimer";

interface OverrunDetectorResult {
  isOverrun: boolean;
  overrunTask: Task | null;
  elapsedMinutes: number;
  showAlert: boolean;
  dismissAlert: () => void;
}

export function useOverrunDetector(): OverrunDetectorResult {
  const { tasks } = useTaskStore();
  const { activeTaskId } = useTimerStore();
  const [showAlert, setShowAlert] = useState(false);
  const [alreadyAlerted, setAlreadyAlerted] = useState<number | null>(null);

  const { elapsedMinutes, isOverrun } = useTaskTimer(activeTaskId);

  const overrunTask =
    activeTaskId != null ? (tasks.find((t) => t.id === activeTaskId) ?? null) : null;

  useEffect(() => {
    if (isOverrun && overrunTask && alreadyAlerted !== overrunTask.id) {
      setShowAlert(true);
      setAlreadyAlerted(overrunTask.id);
    }
  }, [isOverrun, overrunTask, alreadyAlerted]);

  // Reset alerted task when active task changes
  useEffect(() => {
    if (activeTaskId == null) {
      setAlreadyAlerted(null);
      setShowAlert(false);
    }
  }, [activeTaskId]);

  const dismissAlert = () => setShowAlert(false);

  return {
    isOverrun,
    overrunTask,
    elapsedMinutes,
    showAlert,
    dismissAlert,
  };
}
