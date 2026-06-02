import { useMutation } from "@tanstack/react-query";
import { aiApi } from "../utils/api";

export interface OptimizeResult {
  message: string;
  tasks: Array<{
    id: number;
    title: string;
    priority: string;
    estimated_minutes: number | null;
    scheduled_start?: string;
  }>;
  total_estimated_minutes: number;
}

export interface ReplanResult {
  message: string;
  rescheduled_tasks: Array<{
    id: number;
    title: string;
    new_scheduled_start?: string;
    estimated_minutes: number | null;
  }>;
}

export function useOptimize(date?: string) {
  return useMutation<OptimizeResult, Error, void>({
    mutationFn: async () => {
      const res = await aiApi.optimize(date);
      return res.data.data as OptimizeResult;
    },
  });
}

export function useReplan() {
  return useMutation<
    ReplanResult,
    Error,
    { overrun_task_id: number; actual_minutes_so_far: number }
  >({
    mutationFn: async ({ overrun_task_id, actual_minutes_so_far }) => {
      const res = await aiApi.replan(overrun_task_id, actual_minutes_so_far);
      return res.data.data as ReplanResult;
    },
  });
}
