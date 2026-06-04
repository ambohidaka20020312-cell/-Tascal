import { useState } from "react";
import { useTaskNotes, useAddNote, useDeleteNote } from "../../hooks/useTaskNotes";

interface TaskNotesPanelProps {
  taskId: number;
  onClose: () => void;
}

export default function TaskNotesPanel({ taskId, onClose }: TaskNotesPanelProps) {
  const { data: notes, isLoading } = useTaskNotes(taskId);
  const addNote = useAddNote(taskId);
  const deleteNote = useDeleteNote(taskId);
  const [content, setContent] = useState("");

  const handleAdd = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    addNote.mutate(trimmed, {
      onSuccess: () => setContent(""),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAdd();
    }
  };

  return (
    <div
      className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
      style={{ marginLeft: "-1rem", marginRight: "-1rem" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text-muted)] tracking-wide">メモ</span>
        <button
          onClick={onClose}
          aria-label="メモを閉じる"
          className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] text-xs transition-opacity"
        >
          ✕
        </button>
      </div>

      {/* Note list */}
      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
        {isLoading ? (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse h-10 bg-[var(--border)] rounded" />
            ))}
          </>
        ) : notes && notes.length > 0 ? (
          notes.map((note) => (
            <div
              key={note.id}
              className="flex items-start gap-2 group/note"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap break-words leading-relaxed">
                  {note.content}
                </p>
                <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                  {new Date(note.created_at).toLocaleString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => deleteNote.mutate(note.id)}
                disabled={deleteNote.isPending}
                aria-label="メモを削除"
                className="opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0 text-[var(--text-subtle)] hover:text-[var(--text-muted)] disabled:opacity-30 mt-0.5"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 4h10M6 4V2h4v2M5 4l1 10h4l1-10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs text-[var(--text-subtle)] italic">メモはありません</p>
        )}
      </div>

      {/* Add note area */}
      <div className="flex gap-2 items-end">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メモを入力… (Ctrl+Enter で追加)"
          rows={2}
          className="flex-1 text-xs text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 resize-none focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-subtle)] tracking-wide"
        />
        <button
          onClick={handleAdd}
          disabled={addNote.isPending || !content.trim()}
          className="text-xs text-[var(--text-primary)] border border-[var(--border)] rounded px-2 py-1.5 hover:bg-[var(--bg-primary)] disabled:opacity-30 transition-colors shrink-0 tracking-wide"
        >
          {addNote.isPending ? "…" : "追加"}
        </button>
      </div>
    </div>
  );
}
