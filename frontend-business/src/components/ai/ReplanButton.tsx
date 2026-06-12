import { useState } from "react";
import { aiApi } from "../../utils/api";
import { useToast } from "../common/Toast";

interface ReplanButtonProps {
  taskId: number;
  estimatedMinutes: number;
  actualMinutesSoFar?: number;
}

export default function ReplanButton({
  taskId,
  estimatedMinutes,
  actualMinutesSoFar,
}: ReplanButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await aiApi.replan(taskId, actualMinutesSoFar ?? estimatedMinutes);
      toast("タスクが再スケジュールされました", "success");
    } catch {
      toast("再計画に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors disabled:opacity-50"
      aria-label="タスクを再計画する"
    >
      {loading ? (
        <svg
          className="w-3 h-3 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ) : (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
      )}
      再計画
    </button>
  );
}
