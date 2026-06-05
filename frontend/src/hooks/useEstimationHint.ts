import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";

interface PatternEntry {
  ratio: number;
  sample_count: number;
  tendency: "underestimate" | "overestimate" | "accurate";
}

interface EstimationPatterns {
  has_data: boolean;
  overall: PatternEntry | null;
  by_category: Record<string, PatternEntry>;
  by_priority: Record<string, PatternEntry>;
}

export function useEstimationPatterns() {
  return useQuery<EstimationPatterns>({
    queryKey: ["estimation-patterns"],
    queryFn: () => api.get("/ai/estimation-patterns").then((r: { data: { data: EstimationPatterns } }) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEstimationHint(
  estimatedMinutes: number | null,
  categoryId: number | null,
  priority: string
) {
  const { data: patterns } = useEstimationPatterns();

  if (!patterns?.has_data || !estimatedMinutes || estimatedMinutes <= 0) {
    return null;
  }

  // Find best available ratio
  let ratio: number | null = null;
  let tendency: string | null = null;

  const catKey = categoryId ? String(categoryId) : null;
  if (catKey && patterns.by_category[catKey]) {
    ratio = patterns.by_category[catKey].ratio;
    tendency = patterns.by_category[catKey].tendency;
  } else if (patterns.by_priority[priority]) {
    ratio = patterns.by_priority[priority].ratio;
    tendency = patterns.by_priority[priority].tendency;
  } else if (patterns.overall) {
    ratio = patterns.overall.ratio;
    tendency = patterns.overall.tendency;
  }

  if (ratio === null || tendency === "accurate") return null;

  const suggested = Math.round(estimatedMinutes * ratio);
  if (Math.abs(suggested - estimatedMinutes) < 5) return null; // not worth showing

  return {
    suggested,
    ratio,
    tendency,
    message:
      tendency === "underestimate"
        ? `あなたの実績では平均 ${suggested} 分かかっています`
        : `あなたの実績では平均 ${suggested} 分で完了しています`,
  };
}
