import { useEffect, useRef } from "react";
import { usePlan } from "../../hooks/usePlan";

const AD_SLOT = "4134996822";

interface AdBannerProps {
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * AdBanner — renders a Google AdSense ad unit.
 * Only visible for Free-plan users. Pro/Team users see nothing.
 * If VITE_ADSENSE_CLIENT_ID is not set, shows a gray placeholder box
 * with [広告] text (useful during development).
 */
export default function AdBanner({ className = "" }: AdBannerProps) {
  const { isFree } = usePlan();
  const pushed = useRef(false);
  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;

  // Push to adsbygoogle once this unit mounts (only runs when real clientId present)
  useEffect(() => {
    if (!isFree || !clientId || pushed.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // Silently ignore if AdSense script hasn't loaded yet
    }
  }, [isFree, clientId]);

  // Never render for paid plans
  if (!isFree) return null;

  // No client ID — show gray placeholder
  if (!clientId) {
    return (
      <div
        className={`h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded text-xs text-center text-gray-400 dark:text-gray-500 select-none ${className}`}
        aria-hidden="true"
      >
        [広告]
      </div>
    );
  }

  // Real AdSense unit
  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
