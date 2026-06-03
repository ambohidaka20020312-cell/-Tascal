import { useQuery } from "@tanstack/react-query";
import { aiApi } from "../utils/api";
import StatsCard from "../components/stats/StatsCard";
import { useStats } from "../hooks/useStats";

interface InsightsData {
  message: string;
  stats: {
    completed_tasks: number;
    total_tasks: number;
    average_achievement_rate: number | null;
    most_productive_hour: number | null;
    tasks_by_hour: Record<string, number>;
  };
  week_start: string;
  week_end: string;
}

function ProductiveHourLabel(hour: number | null): string {
  if (hour === null) return "データなし";
  const suffix = hour < 12 ? "午前" : "午後";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${suffix}${h}時台`;
}

export default function InsightsPage() {
  const { data: statsData } = useStats();

  const { data, isLoading, isError } = useQuery<InsightsData>({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const res = await aiApi.insights();
      return res.data.data as InsightsData;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="h-3 w-24 animate-pulse bg-[var(--bg-secondary)] rounded" />
        <div className="h-6 w-40 animate-pulse bg-[var(--bg-secondary)] rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse bg-[var(--bg-secondary)] rounded-xl" />
          ))}
        </div>
        <div className="h-40 animate-pulse bg-[var(--bg-secondary)] rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)] text-sm">
        インサイトの取得に失敗しました。しばらくしてから再試行してください。
      </div>
    );
  }

  const achievementPercent =
    data.stats.average_achievement_rate != null
      ? Math.round(data.stats.average_achievement_rate * 100)
      : null;

  const messageLines = data.message
    ? data.message.split(/\n+/).filter((l) => l.trim() !== "")
    : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {statsData && (
        <StatsCard
          weeklyRate={statsData.weekly_completion_rate}
          monthlyRate={statsData.monthly_completion_rate}
          streak={statsData.current_streak}
          timeAccuracy={statsData.time_accuracy}
          totalCompleted={statsData.total_completed}
        />
      )}

      <div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-[var(--text-subtle)] mb-1">INSIGHTS</p>
        <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)]">週次インサイト</h1>
        {data.week_start && data.week_end && (
          <p className="text-xs text-[var(--text-subtle)] mt-1 tracking-wide">
            {data.week_start} 〜 {data.week_end}
          </p>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-3xl font-light text-[var(--text-primary)]">
            {data.stats.completed_tasks}
          </p>
          <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mt-1">完了タスク</p>
        </div>
        <div className="border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-3xl font-light text-[var(--text-primary)]">
            {achievementPercent != null ? `${achievementPercent}%` : "—"}
          </p>
          <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mt-1">平均達成率</p>
        </div>
        <div className="border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-xl font-light text-[var(--text-primary)]">
            {ProductiveHourLabel(data.stats.most_productive_hour)}
          </p>
          <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mt-1">最も生産的</p>
        </div>
      </div>

      {/* AI message */}
      {messageLines.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-4">AI ADVICE</p>
          <ul className="space-y-3">
            {messageLines.map((line, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
                <span className="mt-2 w-1 h-1 rounded-full bg-[var(--text-subtle)] flex-shrink-0" />
                <span className="leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Total tasks context */}
      <p className="text-xs text-[var(--text-subtle)] text-center tracking-wide">
        今週の総タスク数: {data.stats.total_tasks} 件
      </p>
    </div>
  );
}
