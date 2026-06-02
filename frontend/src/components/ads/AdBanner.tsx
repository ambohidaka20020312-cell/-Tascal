import { useEffect, useRef } from "react";
import { usePlan } from "../../hooks/usePlan";

type AdFormat = "auto" | "rectangle" | "leaderboard";

interface AdBannerProps {
  slot: string;
  format?: AdFormat;
  className?: string;
}

const formatDimensions: Record<AdFormat, { width: number; height: number }> = {
  auto: { width: 728, height: 90 },
  rectangle: { width: 300, height: 250 },
  leaderboard: { width: 728, height: 90 },
};

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * AdBanner — renders a Google AdSense ad unit.
 * Only visible for Free-plan users. Pro/Team users see nothing.
 * In development (import.meta.env.DEV) a placeholder is shown instead of a
 * real ad so that AdSense's review process is not triggered during development.
 */
export default function AdBanner({
  slot,
  format = "auto",
  className = "",
}: AdBannerProps) {
  const { isFree } = usePlan();
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  // Never render for paid plans
  if (!isFree) return null;

  const isDev = import.meta.env.DEV;
  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;
  const dims = formatDimensions[format];

  // Development placeholder
  if (isDev) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded text-gray-400 text-xs font-mono select-none ${className}`}
        style={{ width: dims.width, height: dims.height, maxWidth: "100%" }}
        aria-hidden="true"
      >
        AdSense [{format}] slot={slot}
      </div>
    );
  }

  // Production — real AdSense unit
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (pushed.current) return;
    if (!clientId) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // Silently ignore if AdSense script hasn't loaded yet
    }
  }, [clientId]);

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
