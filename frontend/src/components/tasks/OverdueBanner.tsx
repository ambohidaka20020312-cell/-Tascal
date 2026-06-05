import { useState } from "react";
import { useOverdueTasks } from "../../hooks/useTasks";

export default function OverdueBanner() {
  const { data: overdueTasks = [] } = useOverdueTasks();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("overdue_banner_dismissed") === "true"
  );

  const count = overdueTasks.length;

  if (count === 0 || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("overdue_banner_dismissed", "true");
    setDismissed(true);
  };

  const handleConfirm = () => {
    window.dispatchEvent(new CustomEvent("set-filter:overdue"));
  };

  return (
    <div className="flex items-center gap-3 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-2.5">
      <p className="flex-1 text-sm text-[var(--text-muted)] tracking-wide">
        期限超過のタスクが {count} 件あります
      </p>
      <button
        onClick={handleConfirm}
        className="shrink-0 text-xs tracking-[0.1em] text-[var(--text-primary)] underline underline-offset-2 hover:opacity-70 transition-opacity"
      >
        確認する
      </button>
      <button
        onClick={handleDismiss}
        aria-label="閉じる"
        className="shrink-0 text-[var(--text-subtle)] hover:text-[var(--text-primary)] text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
