import { useState, useEffect } from "react";

const STORAGE_KEY = "tascal_onboarding_done";

export function useOnboarding(isAuthenticated: boolean) {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !localStorage.getItem(STORAGE_KEY)) {
      setIsOnboardingOpen(true);
    }
  }, [isAuthenticated]);

  const complete = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setIsOnboardingOpen(false);
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setIsOnboardingOpen(false);
  };

  return { isOnboardingOpen, complete, skip };
}
