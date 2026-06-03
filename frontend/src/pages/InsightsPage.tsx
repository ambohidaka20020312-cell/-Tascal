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
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-center text-gray-500">
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
        <h1 className="text-2xl font-bold text-gray-800">週次インサイト</h1>
        {data.week_start && data.week_end && (
          <p className="text-sm text-gray-500 mt-1">
            {data.week_start} 〜 {data.week_end}
          </p>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-primary-600">
            {data.stats.completed_tasks}
          </p>
          <p className="text-xs text-gray-500 mt-1">完了タスク数</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">
            {achievementPercent != null ? `${achievementPercent}%` : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">平均達成率</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">
            {ProductiveHourLabel(data.stats.most_productive_hour)}
          </p>
          <p className="text-xs text-gray-500 mt-1">最も生産的な時間帯</p>
        </div>
      </div>

      {/* AI message */}
      {messageLines.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h2 className="text-sm font-semibold text-indigo-700">
              AIからのアドバイス
            </h2>
          </div>
          <ul className="space-y-2">
            {messageLines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                <span>{line.replace(/^[-•]\s*/, "")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Total tasks context */}
      <p className="text-sm text-gray-400 text-center">
        今週の総タスク数: {data.stats.total_tasks} 件
      </p>
    </div>
  );
}
