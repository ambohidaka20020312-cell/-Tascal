import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Button from "../common/Button";
import { useCreateTask } from "../../hooks/useTasks";
import { Task } from "../../store/taskStore";

interface TaskFormProps {
  onClose: () => void;
  defaultDate?: string;
}

type Priority = Task["priority"];

export default function TaskForm({ onClose, defaultDate }: TaskFormProps) {
  const { t } = useTranslation();
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
      setError(t('task.title') + "は必須です");
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
      setError(t('common.error'));
    }
  };

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex sm:items-center sm:justify-center items-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] flex flex-col overflow-hidden"
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="task-form-title" className="text-lg font-bold text-gray-800">{t('task.add')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors min-w-touch min-h-touch flex items-center justify-center"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {error && (
            <div
              id="task-form-error"
              role="alert"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
                {t('task.title')} <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('task.title')}
                className={inputCls}
                required
                aria-required="true"
                aria-invalid={error && !title.trim() ? "true" : "false"}
                aria-describedby={error ? "task-form-error" : undefined}
              />
            </div>

            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
                {t('task.description')}
              </label>
              <textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('task.description')}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('task.priority')}
                </label>
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={`${inputCls} bg-white`}
                >
                  <option value="low">{t('task.priority_low')}</option>
                  <option value="medium">{t('task.priority_medium')}</option>
                  <option value="high">{t('task.priority_high')}</option>
                  <option value="urgent">{t('task.priority_urgent')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-estimated-minutes" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('task.estimated_time')}（{t('common.minutes')}）
                </label>
                <input
                  id="task-estimated-minutes"
                  type="number"
                  min={1}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="60"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="task-scheduled-date" className="block text-sm font-medium text-gray-700 mb-1">
                {t('task.due_date')}
              </label>
              <input
                id="task-scheduled-date"
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
                {t('task.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                loading={createTask.isPending}
              >
                {t('task.save')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
