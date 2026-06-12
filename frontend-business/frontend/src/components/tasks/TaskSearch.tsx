import React from "react";
import { useTranslation } from "react-i18next";

interface TaskSearchProps {
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function TaskSearch({ value, onChange, inputRef }: TaskSearchProps) {
  const { t } = useTranslation();

  return (
    <div className="relative flex items-center">
      {/* Magnifying glass icon */}
      <svg
        className="absolute left-3 w-3.5 h-3.5 text-[var(--text-subtle)] pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
        />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("search.placeholder")}
        className="w-full rounded-lg px-3 py-2 pl-9 text-sm border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)]"
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label={t("search.clear")}
          className="absolute right-2.5 text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors leading-none"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
