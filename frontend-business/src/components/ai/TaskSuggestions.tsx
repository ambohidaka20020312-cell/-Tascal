import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../../utils/api";

interface Suggestion {
  title: string;
  priority: string;
  estimated_minutes: number;
  reason: string;
}

interface SuggestionsData {
  suggestions: Suggestion[];
  message?: string;
}

function getInitialOpen(): boolean {
  try {
    return localStorage.getItem("suggestions_open") !== "false";
  } catch {
    return true;
  }
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "最優先",
  high: "高",
  medium: "中",
  low: "低",
};

export default function TaskSuggestions() {
  const [isOpen, setIsOpen] = useState(getInitialOpen);
  const queryClient = useQueryClient();

  const { data, isError } = useQuery({
    queryKey: ["ai-suggestions"],
    queryFn: () => aiApi.suggestions(),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("suggestions_open", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ai-suggestions"] });
  };

  const handleAdd = (suggestion: Suggestion) => {
    window.dispatchEvent(
      new CustomEvent("prefill-task-form", {
        detail: {
          title: suggestion.title,
          priority: suggestion.priority as "urgent" | "high" | "medium" | "low",
          estimated_minutes: suggestion.estimated_minutes,
        },
      })
    );
    window.dispatchEvent(new CustomEvent("open-task-form"));
  };

  if (isError || !data) return null;

  const suggestionsData: SuggestionsData = data.data?.data ?? data.data ?? { suggestions: [] };
  const suggestions = suggestionsData.suggestions ?? [];

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          aria-expanded={isOpen}
        >
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] shrink-0">
            AIからの提案 ({suggestions.length}件)
          </span>
          <svg
            className={`w-4 h-4 text-[var(--text-subtle)] transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <button
            onClick={handleRefresh}
            aria-label="リフレッシュ"
            title="リフレッシュ"
            className="shrink-0 text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-3 py-2 border-t border-[var(--border)] first:border-t-0 first:pt-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] leading-snug">{suggestion.title}</p>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                  {PRIORITY_LABELS[suggestion.priority] ?? suggestion.priority}
                  {suggestion.estimated_minutes > 0 && ` · ${suggestion.estimated_minutes}分`}
                </p>
                {suggestion.reason && (
                  <p className="text-xs text-[var(--text-muted)] italic mt-0.5 leading-snug">{suggestion.reason}</p>
                )}
              </div>
              <button
                onClick={() => handleAdd(suggestion)}
                className="shrink-0 text-[10px] tracking-[0.15em] uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)] hover:border-[var(--text-muted)] px-2 py-1 rounded"
              >
                追加
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
