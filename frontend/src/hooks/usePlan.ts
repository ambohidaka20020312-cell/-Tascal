import { useAuthStore } from "../store/authStore";

// Free plan limits
const FREE_AI_LIMIT_PER_DAY = 3;
const FREE_TASK_LIMIT_PER_MONTH = 20;

export function usePlan() {
  const user = useAuthStore((state) => state.user);
  const plan = user?.plan ?? "free";

  return {
    plan,
    isFree: plan === "free",
    isPro: plan === "pro",
    isTeam: plan === "team",
    isPaid: plan === "pro" || plan === "team",
  };
}

/**
 * Returns whether the user can use AI optimization.
 * Free plan: limited to FREE_AI_LIMIT_PER_DAY uses per day.
 * Pro/Team: unlimited.
 *
 * Usage count tracking is stored in localStorage keyed by today's date.
 */
export function useCanUseAI(): {
  canUse: boolean;
  usedToday: number;
  limit: number | null;
  increment: () => void;
} {
  const { isFree } = usePlan();

  if (!isFree) {
    return {
      canUse: true,
      usedToday: 0,
      limit: null,
      increment: () => {},
    };
  }

  const todayKey = `ai_uses_${new Date().toISOString().slice(0, 10)}`;
  const stored = localStorage.getItem(todayKey);
  const usedToday = stored ? parseInt(stored, 10) : 0;

  const increment = () => {
    localStorage.setItem(todayKey, String(usedToday + 1));
  };

  return {
    canUse: usedToday < FREE_AI_LIMIT_PER_DAY,
    usedToday,
    limit: FREE_AI_LIMIT_PER_DAY,
    increment,
  };
}

/**
 * Returns whether the user can create more tasks.
 * Free plan: limited to FREE_TASK_LIMIT_PER_MONTH tasks per month.
 * Pro/Team: unlimited.
 *
 * taskCount should be provided from the task store / API response.
 */
export function useCanCreateTask(taskCountThisMonth: number): {
  canCreate: boolean;
  taskCount: number;
  limit: number | null;
} {
  const { isFree } = usePlan();

  if (!isFree) {
    return { canCreate: true, taskCount: taskCountThisMonth, limit: null };
  }

  return {
    canCreate: taskCountThisMonth < FREE_TASK_LIMIT_PER_MONTH,
    taskCount: taskCountThisMonth,
    limit: FREE_TASK_LIMIT_PER_MONTH,
  };
}
