import { useState, useEffect, useRef } from "react";
import api from "../utils/api";

interface EstimateResult {
  minutes: number;
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface UseAutoEstimateReturn {
  estimate: EstimateResult | null;
  loading: boolean;
  accept: () => void;
  dismiss: () => void;
}

const DEBOUNCE_MS = 900;
const MIN_TITLE_LEN = 4;

export function useAutoEstimate(
  title: string,
  description: string,
  categoryName: string,
  currentMinutes: string,
  onAccept: (minutes: string) => void
): UseAutoEstimateReturn {
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedTitleRef = useRef<string>("");

  useEffect(() => {
    // Don't fire if user already typed a number, or title too short, or already dismissed this title
    if (
      currentMinutes.trim() !== "" ||
      title.trim().length < MIN_TITLE_LEN ||
      title.trim() === dismissedTitleRef.current
    ) {
      setEstimate(null);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.post("/ai/estimate-duration", {
          title: title.trim(),
          description: description.trim() || undefined,
          category_name: categoryName || undefined,
        });
        const data = res.data?.data as EstimateResult;
        if (data?.minutes) setEstimate(data);
      } catch {
        // silent — non-critical feature
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [title, description, categoryName, currentMinutes]);

  const accept = () => {
    if (estimate) {
      onAccept(String(estimate.minutes));
      setEstimate(null);
    }
  };

  const dismiss = () => {
    dismissedTitleRef.current = title.trim();
    setEstimate(null);
  };

  return { estimate, loading, accept, dismiss };
}
