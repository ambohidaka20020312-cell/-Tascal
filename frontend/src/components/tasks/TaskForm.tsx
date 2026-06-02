import { useState, FormEvent } from "react";
import Button from "../common/Button";
import { useCreateTask } from "../../hooks/useTasks";
import { Task } from "../../store/taskStore";

interface TaskFormProps {
  onClose: () => void;
  defaultDate?: string;
}

type Priority = Task["priority"];

export default function TaskForm({ onClose, defaultDate }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState(
    defaultDate ?? new Date().toISOString().split("T")[0]
  );
  const [error, setError] = useState("");

  const createTask = useCreateTask();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    setError("");

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        estimated_minutes: estimatedMinutes
          ? parseInt(estimatedMinutes, 10)
          : null,
        scheduled_date: scheduledDate || null,
      } as Partial<Task>);
      onClose();
    } catch {
      setError("タスクの作成に失敗しました。再度お試しください。");
    }
  };

  // Shared input classes — font-size 16px+ to prevent iOS zoom
  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    /*
     * Mobile:   bottom sheet (items-end, sheet slides up from bottom)
     * PC (sm+): center modal (items-center justify-center)
     */
    <div
      className="fixed inset-0 bg-black/50 z-50 flex sm:items-center sm:justify-center items-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Sheet / modal panel */}
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">新しいタスク</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors min-w-touch min-h-touch flex items-center justify-center"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form body — scrolls when keyboard appears */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タスクのタイトルを入力"
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="タスクの詳細（任意）"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  優先度
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={`${inputCls} bg-white`}
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="urgent">緊急</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目標時間（分）
                </label>
                <input
                  type="number"
                  min={1}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="例: 60"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                予定日
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex gap-2 pt-2 pb-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={onClose}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                loading={createTask.isPending}
              >
                作成する
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
