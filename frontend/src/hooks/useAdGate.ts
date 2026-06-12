const getJSTDateString = () => {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
};

const FREE_DAILY_LIMIT = 5;
const EXTRA_PER_AD = 3;

/** Key for tracking tasks added in the free base window */
const STORAGE_KEY = "tascal_daily_tasks";

/**
 * Key for tracking how many extra slots have been unlocked today via ads.
 * Format: `tascal_extra_slots_{YYYY-MM-DD}`
 */
const extraSlotsKey = (date: string) => `tascal_extra_slots_${date}`;

export function useAdGate() {
  const today = getJSTDateString();

  /** Number of tasks added today (counts toward the free base quota). */
  const getTodayCount = (): number => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (data.date === today) return data.count ?? 0;
      return 0;
    } catch { return 0; }
  };

  /**
   * Number of extra slots unlocked today (each ad grants EXTRA_PER_AD slots).
   * Stored under a date-stamped key so it resets automatically each day.
   */
  const getExtraSlots = (): number => {
    try {
      const raw = localStorage.getItem(extraSlotsKey(today));
      return raw ? parseInt(raw, 10) : 0;
    } catch { return 0; }
  };

  /** Grant EXTRA_PER_AD more slots by recording an ad watch. */
  const grantExtraSlots = () => {
    const current = getExtraSlots();
    localStorage.setItem(extraSlotsKey(today), String(current + EXTRA_PER_AD));
  };

  /** Increment the task-added counter (called when a task is actually created). */
  const incrementCount = () => {
    const count = getTodayCount() + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count }));
  };

  /**
   * Returns true when the user must watch an ad before adding another task.
   *
   * Logic:
   *   - Tasks 1-5: free (base quota)
   *   - Tasks 6-8: unlocked by ad #1  (extraSlots ≥ 3)
   *   - Tasks 9-11: unlocked by ad #2 (extraSlots ≥ 6)
   *   - etc.
   *
   * So the user needs an ad when:
   *   todayCount >= FREE_DAILY_LIMIT + getExtraSlots()
   */
  const needsAd = (plan: string): boolean => {
    if (plan !== "free") return false;
    const todayCount = getTodayCount();
    return todayCount >= FREE_DAILY_LIMIT + getExtraSlots();
  };

  const remainingFree = (plan: string): number => {
    if (plan !== "free") return Infinity;
    const total = FREE_DAILY_LIMIT + getExtraSlots();
    return Math.max(0, total - getTodayCount());
  };

  return { needsAd, incrementCount, remainingFree, getTodayCount, grantExtraSlots };
}
