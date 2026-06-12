import { useCallback, useRef } from "react";
import { haptics } from "../utils/haptics";

interface LongPressOptions {
  delay?: number;
}

export function useLongPress(
  onLongPress: () => void,
  options: LongPressOptions = {}
) {
  const { delay = 500 } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const start = useCallback(() => {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      haptics.light();
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
  };
}
