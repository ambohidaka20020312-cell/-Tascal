import { useEffect } from "react";
import { usePlan } from "../../hooks/usePlan";

/**
 * AdScript — injects the Google AdSense <script> tag into <head> once.
 * Only injected for Free-plan users. Pro/Team plan users never load AdSense.
 * No-ops when VITE_ADSENSE_CLIENT_ID is not set (e.g. in development without
 * a real client ID).
 */
export default function AdScript() {
  const { isFree } = usePlan();
  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;

  useEffect(() => {
    // Only inject for free-plan users with a valid client ID configured
    if (!isFree || !clientId || clientId.startsWith("ca-pub-...")) return;

    const SCRIPT_ID = "adsense-script";
    if (document.getElementById(SCRIPT_ID)) return; // already injected

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [isFree, clientId]);

  // This component renders nothing — it only manages a side-effect
  return null;
}
