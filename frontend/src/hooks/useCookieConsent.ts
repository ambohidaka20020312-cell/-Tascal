import { useState, useCallback } from "react";

export interface CookieConsentData {
  essential: boolean;
  analytics: boolean;
  advertising: boolean;
  timestamp: string;
}

const STORAGE_KEY = "cookie_consent";

function loadConsent(): CookieConsentData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsentData;
  } catch {
    return null;
  }
}

function saveConsent(data: CookieConsentData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useCookieConsent() {
  const [consent, setConsentState] = useState<CookieConsentData | null>(
    () => loadConsent()
  );

  const hasConsented = consent !== null;

  const applyConsent = useCallback((data: CookieConsentData) => {
    saveConsent(data);
    setConsentState(data);
  }, []);

  const acceptAll = useCallback(() => {
    applyConsent({
      essential: true,
      analytics: true,
      advertising: true,
      timestamp: new Date().toISOString(),
    });
  }, [applyConsent]);

  const acceptEssential = useCallback(() => {
    applyConsent({
      essential: true,
      analytics: false,
      advertising: false,
      timestamp: new Date().toISOString(),
    });
  }, [applyConsent]);

  const updateConsent = useCallback(
    (partial: Partial<Omit<CookieConsentData, "essential" | "timestamp">>) => {
      const base = consent ?? {
        essential: true,
        analytics: false,
        advertising: false,
        timestamp: new Date().toISOString(),
      };
      applyConsent({
        ...base,
        ...partial,
        essential: true,
        timestamp: new Date().toISOString(),
      });
    },
    [consent, applyConsent]
  );

  return {
    hasConsented,
    consent: consent ?? {
      essential: true,
      analytics: false,
      advertising: false,
      timestamp: "",
    },
    acceptAll,
    acceptEssential,
    updateConsent,
  };
}
