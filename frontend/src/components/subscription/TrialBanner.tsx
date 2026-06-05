import React from "react";
import { Link } from "react-router-dom";
import { useTrialBanner } from "../../hooks/useTrialBanner";

export default function TrialBanner() {
  const { isTrialActive, trialDaysLeft, startTrial, isLoading } = useTrialBanner();

  if (isTrialActive) {
    return (
      <div
        className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4"
        style={{ height: 36 }}
      >
        <span className="text-xs text-[var(--text-primary)] font-medium">
          Pro体験中 残り{trialDaysLeft}日
        </span>
        <Link
          to="/plans"
          className="text-xs text-[var(--accent)] font-semibold hover:opacity-70 transition-opacity"
        >
          アップグレードして継続 →
        </Link>
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-center border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4"
      style={{ height: 36 }}
    >
      <button
        onClick={() => startTrial()}
        disabled={isLoading}
        className="text-xs text-[var(--text-primary)] font-semibold hover:opacity-70 transition-opacity disabled:opacity-40"
      >
        14日間 Pro を無料体験 →
      </button>
    </div>
  );
}
