import { useState } from "react";
import { Task } from "../../store/taskStore";
import { useTimerStore } from "../../store/timerStore";
import { taskApi } from "../../utils/api";
import { useTaskStore } from "../../store/taskStore";
import Modal from "../common/Modal";
import Button from "../common/Button";

interface TaskStatusButtonProps {
  task: Task;
}

export default function TaskStatusButton({ task }: TaskStatusButtonProps) {
  const { startTask, stopTask } = useTimerStore();
  const { updateTask } = useTaskStore();
  const [loading, setLoading] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [actualMinutes, setActualMinutes] = useState<string>("");

  

  const handleStart = async () => {
    setLoading(true);
    try {
      await taskApi.update(task.id, { status: "in_progress" });
      updateTask(task.id, { status: "in_progress" });
      // Stop any previously running task first
      stopTask();
      startTask(task.id);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      await taskApi.update(task.id, { status: "pending" });
      updateTask(task.id, { status: "pending" });
      stopTask();
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    const mins = parseInt(actualMinutes, 10);
    if (isNaN(mins) || mins <= 0) return;
    setLoading(true);
    try {
      await taskApi.complete(task.id, mins);
      updateTask(task.id, { status: "completed", actual_minutes: mins });
      stopTask();
      setShowCompleteModal(false);
      setActualMinutes("");
    } finally {
      setLoading(false);
    }
  };

  if (task.status === "completed") return null;

  if (task.status === "pending") {
    return (
      <button
        onClick={handleStart}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? (
          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <span>▶</span>
        )}
        開始
      </button>
    );
  }

  // in_progress or overrun
  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePause}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-yellow-900 text-sm font-medium rounded-lg transition-colors"
        >
          <span>⏸</span>
          一時停止
        </button>
        <button
          onClick={() => setShowCompleteModal(true)}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>✓</span>
          完了
        </button>
      </div>

      <Modal
        isOpen={showCompleteModal}
        title="タスク完了"
        onClose={() => setShowCompleteModal(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            「{task.title}」の実際にかかった時間を入力してください（分）
          </p>
          <input
            type="number"
            min={1}
            value={actualMinutes}
            onChange={(e) => setActualMinutes(e.target.value)}
            placeholder="例: 45"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCompleteModal(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleComplete}
              loading={loading}
              disabled={!actualMinutes || parseInt(actualMinutes) <= 0}
            >
              完了にする
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
