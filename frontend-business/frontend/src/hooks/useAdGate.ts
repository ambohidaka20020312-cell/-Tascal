const getJSTDateString = () => {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
};

const FREE_DAILY_LIMIT = 5;
const STORAGE_KEY = "tascal_daily_tasks";

export function useAdGate() {
  const getTodayCount = (): number => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (data.date === getJSTDateString()) return data.count ?? 0;
      return 0;
    } catch { return 0; }
  };

  const incrementCount = () => {
    const count = getTodayCount() + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: getJSTDateString(),
      count,
    }));
  };

  const needsAd = (plan: string): boolean => {
    if (plan !== "free") return false;
    return getTodayCount() >= FREE_DAILY_LIMIT;
  };

  const remainingFree = (plan: string): number => {
    if (plan !== "free") return Infinity;
    return Math.max(0, FREE_DAILY_LIMIT - getTodayCount());
  };

  return { needsAd, incrementCount, remainingFree, getTodayCount };
}
