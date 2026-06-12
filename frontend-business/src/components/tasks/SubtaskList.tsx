import { useState, useRef } from "react";
import { useSubtasks, useCreateSubtask, useCompleteTask } from "../../hooks/useTasks";
import { Task } from "../../store/taskStore";

interface SubtaskListProps {
  parentId: number;
  parentTitle: string;
}

export default function SubtaskList({ parentId, parentTitle: _parentTitle }: SubtaskListProps) {
  const { data: subtasks, isLoading } = useSubtasks(parentId);
  const createSubtask = useCreateSubtask(parentId);
  const completeTask = useCompleteTask();
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    createSubtask.mutate({ title, priority: "medium" });
    setNewTitle("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
  };

  const handleComplete = (subtask: Task) => {
    if (subtask.status === "completed") return;
    completeTask.mutate({ id: subtask.id, actual_minutes: subtask.estimated_minutes ?? 0 });
  };

  const completedCount = subtasks?.filter((t) => t.status === "completed").length ?? 0;
  const total = subtasks?.length ?? 0;

  return (
    <div
      className="ml-4 pl-3 border-l border-[var(--border)] py-2"
      style={{ fontSize: "13px" }}
    >
      {/* Count header */}
      {total > 0 && (
        <p
          className="text-[var(--text-subtle)] mb-2 tracking-wide"
          style={{ fontSize: "11px" }}
        >
          {completedCount}/{total}完了
        </p>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-1.5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-4 bg-[var(--bg-secondary)] rounded animate-pulse"
              style={{ width: i === 0 ? "70%" : "55%" }}
            />
          ))}
        </div>
      )}

      {/* Subtask rows */}
      {!isLoading && subtasks && subtasks.length > 0 && (
        <ul className="space-y-1 mb-2">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={subtask.status === "completed"}
                aria-label={`${subtask.title}を完了`}
                onClick={() => handleComplete(subtask)}
                disabled={completeTask.isPending && completeTask.variables?.id === subtask.id}
                className={[
                  "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                  subtask.status === "completed"
                    ? "bg-[var(--text-muted)] border-[var(--text-muted)]"
                    : "border-[var(--border)] hover:border-[var(--text-subtle)]",
                ].join(" ")}
              >
                {subtask.status === "completed" && (
                  <svg
                    className="w-2 h-2 text-[var(--bg-primary)]"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </button>
              <span
                className={[
                  "text-[var(--text-muted)] tracking-wide truncate",
                  subtask.status === "completed"
                    ? "line-through text-[var(--text-subtle)]"
                    : "",
                ].join(" ")}
                style={{ fontSize: "12px" }}
              >
                {subtask.title}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Inline add input */}
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="サブタスクを追加"
          className="flex-1 min-w-0 border-0 border-b border-[var(--border)] bg-transparent px-0 py-0.5 text-[var(--text-muted)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-muted)] tracking-wide"
          style={{ fontSize: "12px" }}
          aria-label="サブタスクのタイトル"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newTitle.trim() || createSubtask.isPending}
          aria-label="サブタスクを追加"
          className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] disabled:opacity-30 transition-opacity shrink-0 leading-none"
          style={{ fontSize: "16px" }}
        >
          +
        </button>
      </div>
    </div>
  );
}
