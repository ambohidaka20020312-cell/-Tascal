import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "../store/authStore";

const IDLE_MINUTES = 30;        // warn after 30 min idle
const WARN_SECONDS = 60;        // logout 60 sec after warning
const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

export function useIdleTimeout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARN_SECONDS);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
  };

  const doLogout = useCallback(async () => {
    clearAll();
    setShowWarning(false);
    await logout();
    window.location.href = "/login?reason=timeout";
  }, [logout]);

  const startCountdown = useCallback(() => {
    setShowWarning(true);
    setSecondsLeft(WARN_SECONDS);
    countdownTimer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          doLogout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    warnTimer.current = setTimeout(doLogout, WARN_SECONDS * 1000);
  }, [doLogout]);

  const resetIdle = useCallback(() => {
    if (!isAuthenticated()) return;
    clearAll();
    setShowWarning(false);
    idleTimer.current = setTimeout(startCountdown, IDLE_MINUTES * 60 * 1000);
  }, [isAuthenticated, startCountdown]);

  const stayActive = useCallback(() => {
    resetIdle();
  }, [resetIdle]);

  useEffect(() => {
    if (!isAuthenticated()) return;

    resetIdle();
    EVENTS.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));

    return () => {
      clearAll();
      EVENTS.forEach((e) => window.removeEventListener(e, resetIdle));
    };
  }, [isAuthenticated, resetIdle]);

  return { showWarning, secondsLeft, stayActive, doLogout };
}
