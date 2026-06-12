import { useQuery } from "@tanstack/react-query";
import { taskApi } from "../../utils/api";

interface TaskStats {
  total: number;
  completed_today: number;
  overdue: number;
  pending: number;
}

export default function StatsBar() {
  const { data, isLoading } = useQuery<TaskStats>({
    queryKey: ["task-stats-bar"],
    queryFn: async () => {
      const res = await taskApi.stats();
      return res.data.data as TaskStats;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (isLoading || !data) return null;

  const { total, completed_today, overdue, pending } = data;

  return (
    <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)] tracking-wide">
      <span>
        <span className="mr-0.5">📋</span>
        {total}件
      </span>
      <span className="text-[var(--border)]">|</span>
      <span>
        <span className="mr-0.5">✓</span>
        {completed_today}件完了
      </span>
      <span className="text-[var(--border)]">|</span>
      <span className={overdue > 0 ? "text-[var(--text-muted)]" : ""}>
        <span className="mr-0.5">⚠</span>
        {overdue}件超過
      </span>
      <span className="text-[var(--border)]">|</span>
      <span>
        <span className="mr-0.5">○</span>
        {pending}件未着手
      </span>
    </div>
  );
}
