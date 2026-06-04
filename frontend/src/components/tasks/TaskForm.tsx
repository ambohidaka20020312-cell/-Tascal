import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Button from "../common/Button";
import { useCreateTask } from "../../hooks/useTasks";
import { useTemplates, useCreateTemplate } from "../../hooks/useTemplates";
import { Task } from "../../store/taskStore";

type Priority = Task["priority"];

interface TaskFormProps {
  onClose: () => void;
  defaultDate?: string;
  initialTitle?: string;
  initialPriority?: Priority;
  initialEstimatedMinutes?: number;
  initialScheduledDate?: string;
  initialDescription?: string;
}

type Recurrence = "none" | "daily" | "weekly" | "monthly";
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
const WEEKDAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export default function TaskForm({
  onClose,
  defaultDate,
  initialTitle,
  initialPriority,
  initialEstimatedMinutes,
  initialScheduledDate,
  initialDescription,
}: TaskFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [priority, setPriority] = useState<Priority>(initialPriority ?? "medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>(
    initialEstimatedMinutes ? String(initialEstimatedMinutes) : ""
  );
  const [scheduledDate, setScheduledDate] = useState(
    initialScheduledDate ?? defaultDate ?? new Date().toISOString().split("T")[0]
  );
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [weekdays, setWeekdays] = useState<string[]>(["MON"]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [error, setError] = useState("");

  const createTask = useCreateTask();
  const createTemplate = useCreateTemplate();
  const { data: templates } = useTemplates();

  const buildRecurrenceRule = () => {
    if (recurrence === "none") return undefined;
    if (recurrence === "weekly") return `weekly:${weekdays.join(",")}`;
    return recurrence;
  };

  const applyTemplate = (tpl: { title: string; description: string; priority: string; estimated_minutes: number | null }) => {
    setTitle(tpl.title);
    setDescription(tpl.description ?? "");
    setPriority((tpl.priority as Priority) ?? "medium");
    setEstimatedMinutes(tpl.estimated_minutes ? String(tpl.estimated_minutes) : "");
    setShowTemplates(false);
  };

  const handleSaveAsTemplate = async () => {
    if (!title.trim()) return;
    try {
      await createTemplate.mutateAsync({
        name: title.trim(),
        title: title.trim(),
        description: description.trim(),
        priority,
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      });
    } catch { /* silent */ }
  };

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
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
        scheduled_date: scheduledDate || null,
        recurrence: buildRecurrenceRule() ?? null,
      } as Partial<Task>);
      onClose();
    } catch {
      setError(t('common.error'));
    }
  };

  const inputCls =
    "w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex sm:items-center sm:justify-center items-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="bg-[var(--bg-primary)] w-full sm:max-w-md sm:rounded-xl rounded-t-xl shadow-xl max-h-[90dvh] flex flex-col overflow-hidden border border-[var(--border)]"
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[var(--border)] rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
          <h2 id="task-form-title" className="text-sm font-semibold tracking-[0.1em] uppercase text-[var(--text-primary)]">{t('task.add')}</h2>
          <button onClick={onClose} className="text-[var(--text-subtle)] hover:text-[var(--text-primary)]" aria-label={t('common.close')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {error && <p role="alert" id="task-form-error" className="mb-3 text-xs text-[var(--text-muted)] border-l-2 border-[var(--border)] pl-2">{error}</p>}

          {/* Template selector */}
          {templates && templates.length > 0 && (
            <div className="mb-3 relative">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-muted)] tracking-wide"
              >
                テンプレートから追加 ▾
              </button>
              {showTemplates && (
                <div className="absolute top-full left-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg z-10 w-64 py-1 max-h-40 overflow-y-auto">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] truncate"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <label htmlFor="task-title" className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-1.5">{t('task.title')} *</label>
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
              <label htmlFor="task-description" className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-1.5">{t('task.description')}</label>
              <textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('task.description')}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="task-priority" className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-1.5">{t('task.priority')}</label>
                <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={`${inputCls} bg-[var(--bg-primary)]`}>
                  <option value="low">{t('task.priority_low')}</option>
                  <option value="medium">{t('task.priority_medium')}</option>
                  <option value="high">{t('task.priority_high')}</option>
                  <option value="urgent">{t('task.priority_urgent')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="task-estimated-minutes" className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-1.5">{t('task.estimated_time')}（分）</label>
                <input id="task-estimated-minutes" type="number" min={1} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} placeholder="60" className={inputCls} />
              </div>
            </div>

            <div>
              <label htmlFor="task-scheduled-date" className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-1.5">{t('task.due_date')}</label>
              <input id="task-scheduled-date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={inputCls} />
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-2">繰り返し</label>
              <div className="flex gap-2 flex-wrap">
                {(["none", "daily", "weekly", "monthly"] as Recurrence[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRecurrence(r)}
                    className={[
                      "px-3 py-1 rounded text-[10px] tracking-wide border transition-colors",
                      recurrence === r
                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-subtle)]",
                    ].join(" ")}
                  >
                    {{ none: "なし", daily: "毎日", weekly: "毎週", monthly: "毎月" }[r]}
                  </button>
                ))}
              </div>
              {recurrence === "weekly" && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {WEEKDAYS.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const code = WEEKDAY_CODES[i];
                        setWeekdays((prev) =>
                          prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
                        );
                      }}
                      className={[
                        "w-8 h-8 rounded text-[10px] border transition-colors",
                        weekdays.includes(WEEKDAY_CODES[i])
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent"
                          : "border-[var(--border)] text-[var(--text-muted)]",
                      ].join(" ")}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>{t('task.cancel')}</Button>
              <Button type="submit" variant="primary" className="flex-1" loading={createTask.isPending}>{t('task.save')}</Button>
            </div>
          </form>

          {title.trim() && (
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              disabled={createTemplate.isPending}
              className="mt-3 w-full text-center text-[10px] text-[var(--text-subtle)] hover:text-[var(--text-muted)] tracking-wide"
            >
              このタスクをテンプレートとして保存
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
