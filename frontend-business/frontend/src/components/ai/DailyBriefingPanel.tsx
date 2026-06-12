import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { aiApi } from "../../utils/api";

interface BriefingData {
  briefing?: string;
  message?: string;
  task_count?: number;
}

function getInitialOpen(): boolean {
  try {
    return localStorage.getItem("briefing_open") === "true";
  } catch {
    return false;
  }
}

export default function DailyBriefingPanel() {
  const [isOpen, setIsOpen] = useState(getInitialOpen);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["daily-briefing"],
    queryFn: () => aiApi.dailyBriefing(),
    staleTime: 5 * 60 * 1000,
  });

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("briefing_open", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 animate-pulse space-y-2">
        <div className="h-3 bg-[var(--bg-tertiary)] rounded w-40" />
        <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4" />
        <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
      </div>
    );
  }

  if (isError || !data) return null;

  const briefingData: BriefingData = data.data?.data ?? data.data ?? {};
  const text = briefingData.briefing ?? briefingData.message;
  if (!text) return null;

  const taskCount = briefingData.task_count;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] shrink-0">
            今日のブリーフィング
          </span>
          {taskCount != null && (
            <span className="text-[10px] text-[var(--text-muted)] shrink-0">
              タスク {taskCount} 件
            </span>
          )}
        </div>
        <button
          onClick={handleToggle}
          aria-label={isOpen ? "折りたたむ" : "展開する"}
          className="shrink-0 text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {isOpen && (
        <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
          {text}
        </p>
      )}
    </div>
  );
}
