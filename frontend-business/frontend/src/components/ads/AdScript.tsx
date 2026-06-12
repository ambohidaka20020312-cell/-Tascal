import { useEffect } from "react";
import { usePlan } from "../../hooks/usePlan";
import { useCookieConsent } from "../../hooks/useCookieConsent";

/**
 * AdScript — injects the Google AdSense <script> tag into <head> once.
 * Only injected for Free-plan users. Pro/Team plan users never load AdSense.
 * No-ops when VITE_ADSENSE_CLIENT_ID is not set (e.g. in development without
 * a real client ID).
 * Blocked when the user has not consented to advertising cookies (GDPR).
 */
export default function AdScript() {
  const { isFree } = usePlan();
  const { consent } = useCookieConsent();
  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;

  useEffect(() => {
    // Only inject for free-plan users with advertising consent and a valid client ID
    if (!isFree || !consent.advertising || !clientId || clientId.startsWith("ca-pub-...")) return;

    const SCRIPT_ID = "adsense-script";
    if (document.getElementById(SCRIPT_ID)) return; // already injected

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [isFree, consent.advertising, clientId]);

  // This component renders nothing — it only manages a side-effect
  return null;
}
