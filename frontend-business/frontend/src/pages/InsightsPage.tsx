import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { aiApi } from "../utils/api";
import AdBanner from "../components/ads/AdBanner";

interface WeekStats {
  completion_rate: number;
  total_tasks: number;
  completed_tasks: number;
  avg_actual_minutes: number;
  avg_estimated_minutes: number;
  overrun_count: number;
}

interface DailyCompletion {
  date: string;
  completed: number;
  total: number;
}

interface PriorityBreakdown {
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

interface AccuracyPoint {
  date: string;
  ratio: number | null;
}

interface InsightsData {
  message: string;
  week_stats: WeekStats;
  daily_completion: DailyCompletion[];
  priority_breakdown: PriorityBreakdown;
  accuracy_trend: AccuracyPoint[];
}

// ── SVG Bar Chart ────────────────────────────────────────────────────────────

function DailyBarChart({ data }: { data: DailyCompletion[] }) {
  const { i18n } = useTranslation();
  const W = 320;
  const H = 100;
  const count = data.length || 7;
  const barW = Math.floor(W / count) - 4;
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  const dayLabels = data.map((d) => {
    const date = new Date(d.date + "T00:00:00");
    return date.toLocaleDateString(i18n.language, { weekday: "short" });
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 20}`}
      width="100%"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {data.map((d, i) => {
        const x = 2 + i * (W / count);
        const totalH = (d.total / maxTotal) * H;
        const compH = d.total > 0 ? (d.completed / maxTotal) * H : 0;
        return (
          <g key={d.date}>
            {/* Background bar (total) */}
            <rect
              x={x}
              y={H - totalH}
              width={barW}
              height={totalH}
              fill="var(--bg-tertiary)"
              rx={2}
            />
            {/* Completed bar */}
            <rect
              x={x}
              y={H - compH}
              width={barW}
              height={compH}
              fill="var(--text-primary)"
              rx={2}
              opacity={0.85}
            />
            {/* Day label */}
            <text
              x={x + barW / 2}
              y={H + 14}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-subtle)"
              fontFamily="inherit"
            >
              {dayLabels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Priority Breakdown ───────────────────────────────────────────────────────

const PRIORITY_OPACITY = { urgent: 1, high: 0.75, medium: 0.5, low: 0.3 } as const;

function PriorityBar({ breakdown }: { breakdown: PriorityBreakdown }) {
  const { t } = useTranslation();
  const priorities = ["urgent", "high", "medium", "low"] as const;
  const total = priorities.reduce((sum, p) => sum + breakdown[p], 0);

  if (total === 0) {
    return (
      <p className="text-xs text-[var(--text-subtle)] text-center py-4">
        {t("insights.no_data")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Segmented bar */}
      <div className="flex h-3 w-full rounded overflow-hidden gap-[1px]">
        {priorities.map((p) => {
          const pct = (breakdown[p] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={p}
              style={{
                width: `${pct}%`,
                backgroundColor: "var(--text-primary)",
                opacity: PRIORITY_OPACITY[p],
              }}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {priorities.map((p) => (
          <div key={p} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span
                className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor: "var(--text-primary)",
                  opacity: PRIORITY_OPACITY[p],
                }}
              />
              {t(`insights.priority_${p}`)}
            </span>
            <span className="text-[var(--text-primary)] font-medium tabular-nums">
              {breakdown[p]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Accuracy Line Chart ──────────────────────────────────────────────────────

function AccuracyLineChart({ data }: { data: AccuracyPoint[] }) {
  const { t } = useTranslation();
  const W = 320;
  const H = 80;

  const validRatios = data.map((d) => d.ratio).filter((r): r is number => r !== null);
  const minR = validRatios.length ? Math.min(...validRatios, 0.6) : 0.6;
  const maxR = validRatios.length ? Math.max(...validRatios, 1.5) : 1.5;
  const range = maxR - minR || 1;

  const toY = (r: number) => H - ((r - minR) / range) * H;
  const toX = (i: number) =>
    data.length > 1 ? (i / (data.length - 1)) * W : W / 2;

  // Build SVG path segments, skipping null gaps
  const segments: string[] = [];
  let fresh = true;
  data.forEach((d, i) => {
    if (d.ratio !== null) {
      const cmd = fresh ? "M" : "L";
      segments.push(`${cmd} ${toX(i).toFixed(1)} ${toY(d.ratio).toFixed(1)}`);
      fresh = false;
    } else {
      fresh = true;
    }
  });

  const pathD = segments.join(" ");
  const refY = toY(1.0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 4}`}
      width="100%"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {/* Reference line at 1.0 */}
      <line
        x1={0}
        y1={refY}
        x2={W}
        y2={refY}
        stroke="var(--text-subtle)"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.5}
      />
      <text
        x={W - 2}
        y={refY - 3}
        textAnchor="end"
        fontSize={8}
        fill="var(--text-subtle)"
        fontFamily="inherit"
      >
        {t("insights.perfect_line")}
      </text>

      {/* Line */}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth={1.5}
          opacity={0.7}
        />
      )}

      {/* Data points */}
      {data.map((d, i) =>
        d.ratio !== null ? (
          <circle
            key={d.date}
            cx={toX(i)}
            cy={toY(d.ratio)}
            r={2.5}
            fill="var(--text-primary)"
            opacity={0.8}
          />
        ) : null
      )}

      {/* No-data fallback */}
      {!validRatios.length && (
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          fontSize={11}
          fill="var(--text-subtle)"
          fontFamily="inherit"
        >
          {t("insights.no_data")}
        </text>
      )}
    </svg>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery<InsightsData>({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const res = await aiApi.insights();
      return res.data.data as InsightsData;
    },
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="h-3 w-24 animate-pulse bg-[var(--bg-secondary)] rounded" />
        <div className="h-6 w-48 animate-pulse bg-[var(--bg-secondary)] rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-[var(--bg-secondary)] rounded-xl" />
          ))}
        </div>
        <div className="h-40 animate-pulse bg-[var(--bg-secondary)] rounded-xl" />
        <div className="h-32 animate-pulse bg-[var(--bg-secondary)] rounded-xl" />
        <div className="h-32 animate-pulse bg-[var(--bg-secondary)] rounded-xl" />
      </div>
    );
  }

  if (isError || !data || !data.week_stats) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)] text-sm">
        {t("insights.load_error")}
      </div>
    );
  }

  const ws = data.week_stats;
  const accuracyPct =
    ws.avg_estimated_minutes > 0
      ? Math.round((ws.avg_actual_minutes / ws.avg_estimated_minutes) * 100)
      : null;

  const statCards = [
    { value: `${ws.completion_rate}%`, label: t("insights.completion_rate") },
    { value: ws.total_tasks, label: t("insights.total_tasks") },
    { value: accuracyPct != null ? `${accuracyPct}%` : "—", label: t("insights.time_accuracy") },
    { value: ws.overrun_count, label: t("insights.overrun_count") },
  ];

  const messageLines = data.message
    ? data.message.split(/\n+/).filter((l) => l.trim() !== "")
    : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-[var(--text-subtle)] mb-1">
          INSIGHTS
        </p>
        <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)]">
          {t("insights.title")}
        </h1>
      </div>

      {/* Stats grid — 2×2 mobile, 4-col desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="border border-[var(--border)] rounded-xl p-4 text-center"
          >
            <p className="text-3xl font-light text-[var(--text-primary)] leading-none">
              {card.value}
            </p>
            <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mt-2">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Daily bar chart */}
      <div className="border border-[var(--border)] rounded-xl p-5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-4">
          {t("insights.daily_completion")}
        </p>
        <DailyBarChart data={data.daily_completion} />
      </div>

      {/* Ad slot for free plan users — between chart sections */}
      <AdBanner slot="INSIGHTS_SLOT" format="rectangle" className="my-4 min-h-[250px]" />

      {/* Priority breakdown */}
      <div className="border border-[var(--border)] rounded-xl p-5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-4">
          {t("insights.priority_breakdown")}
        </p>
        <PriorityBar breakdown={data.priority_breakdown} />
      </div>

      {/* Accuracy trend */}
      <div className="border border-[var(--border)] rounded-xl p-5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-4">
          {t("insights.accuracy_trend")}
        </p>
        <AccuracyLineChart data={data.accuracy_trend} />
      </div>

      {/* AI advice */}
      {messageLines.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-4">
            {t("insights.ai_advice")}
          </p>
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
    </div>
  );
}
