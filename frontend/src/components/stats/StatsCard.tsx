interface Props {
  weeklyRate: number;
  monthlyRate: number;
  streak: number;
  timeAccuracy: number;
  totalCompleted: number;
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
      <div
        className="bg-primary-500 h-2 rounded-full transition-all"
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function StatsCard({
  weeklyRate,
  monthlyRate,
  streak,
  timeAccuracy,
  totalCompleted,
}: Props) {
  const cards = [
    {
      label: streak > 0 ? `🔥 連続 ${streak} 日` : "🔥 連続",
      value: streak > 0 ? `${streak}日` : "今日から始めよう",
      sub: streak > 0 ? "継続中" : "",
      bar: null,
    },
    {
      label: "今週の完了率",
      value: `${Math.round(weeklyRate * 100)}%`,
      sub: null,
      bar: weeklyRate,
    },
    {
      label: "今月の完了率",
      value: `${Math.round(monthlyRate * 100)}%`,
      sub: null,
      bar: monthlyRate,
    },
    {
      label: "時間精度",
      value: `${Math.round(timeAccuracy * 100)}%`,
      sub: "予実精度",
      bar: timeAccuracy,
    },
    {
      label: "累計完了",
      value: `${totalCompleted}件`,
      sub: "全期間",
      bar: null,
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 scrollbar-none">
      {cards.map((card) => (
        <div
          key={card.label}
          className="shrink-0 w-36 md:w-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
        >
          <p className="text-xs text-gray-500 font-medium leading-snug">{card.label}</p>
          <p className="text-xl font-bold text-gray-800 mt-1 leading-tight">{card.value}</p>
          {card.sub && (
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          )}
          {card.bar !== null && <ProgressBar value={card.bar} />}
        </div>
      ))}
    </div>
  );
}
