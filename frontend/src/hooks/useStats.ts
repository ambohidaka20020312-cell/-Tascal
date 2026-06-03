import { useQuery } from "@tanstack/react-query";
import { taskApi } from "../utils/api";

interface StatsData {
  weekly_completion_rate: number;
  monthly_completion_rate: number;
  current_streak: number;
  time_accuracy: number;
  total_completed: number;
}

export function useStats() {
  return useQuery<StatsData>({
    queryKey: ["task-stats"],
    queryFn: async () => {
      const res = await taskApi.stats();
      return res.data.data as StatsData;
    },
    staleTime: 5 * 60 * 1000,
  });
}
